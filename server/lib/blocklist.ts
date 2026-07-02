import dns from 'dns'
import net from 'net'
import { ValidationResult } from '../types'

interface IpRange {
  name: string
  test: (ip: string) => boolean
}

const BLOCKED_RANGES: IpRange[] = [
  { name: 'loopback', test: (ip) => ip === '127.0.0.1' || ip === '0.0.0.0' || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip) || /^0\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip) },
  { name: 'private-10', test: (ip) => /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip) },
  { name: 'private-172', test: (ip) => /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(ip) },
  { name: 'private-192', test: (ip) => /^192\.168\.\d{1,3}\.\d{1,3}$/.test(ip) },
  { name: 'link-local', test: (ip) => /^169\.254\.\d{1,3}\.\d{1,3}$/.test(ip) },
  { name: 'ipv6-loopback', test: (ip) => ip === '::1' || ip === '0:0:0:0:0:0:0:1' },
  { name: 'ipv6-unique-local', test: (ip) => /^fc00:/i.test(ip) || /^fd00:/i.test(ip) || /^fc/i.test(ip) },
  { name: 'ipv6-link-local', test: (ip) => /^fe80:/i.test(ip) }
]

const BLOCKED_NAMES: string[] = [
  'localhost',
  'metadata',
  'metadata.google.internal',
  'metadata.google.internal.',
  'kubernetes.default',
  'kubernetes.default.svc'
]

export async function validateUrl(urlString: string): Promise<ValidationResult> {
  let url: URL
  try {
    url = new URL(urlString)
  } catch {
    return { valid: false, error: 'URL invalida' }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { valid: false, error: 'Protocolo nao suportado' }
  }

  const hostname: string = url.hostname.toLowerCase()

  if (BLOCKED_NAMES.includes(hostname)) {
    return { valid: false, error: `Hostname bloqueado: ${hostname}` }
  }

  let ip: string

  if (net.isIP(hostname) !== 0) {
    ip = hostname
  } else {
    const dnsPromises = dns.promises
    try {
      const resolved: string[] = await dnsPromises.resolve4(hostname)
      ip = resolved[0]
    } catch {
      try {
        const resolved6: string[] = await dnsPromises.resolve6(hostname)
        ip = resolved6[0]
      } catch {
        return { valid: false, error: `Nao foi possivel resolver DNS: ${hostname}` }
      }
    }
  }

  for (const range of BLOCKED_RANGES) {
    if (range.test(ip)) {
      return { valid: false, error: `IP bloqueado (${range.name}): ${ip}` }
    }
  }

  return { valid: true }
}
