const dns = require('dns').promises
const net = require('net')

const BLOCKED_RANGES = [
  { name: 'loopback', test: (ip) => ip === '127.0.0.1' || ip === '0.0.0.0' || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip) || /^0\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip) },
  { name: 'private-10', test: (ip) => /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip) },
  { name: 'private-172', test: (ip) => /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(ip) },
  { name: 'private-192', test: (ip) => /^192\.168\.\d{1,3}\.\d{1,3}$/.test(ip) },
  { name: 'link-local', test: (ip) => /^169\.254\.\d{1,3}\.\d{1,3}$/.test(ip) },
  { name: 'ipv6-loopback', test: (ip) => ip === '::1' || ip === '0:0:0:0:0:0:0:1' },
  { name: 'ipv6-unique-local', test: (ip) => /^fc00:/i.test(ip) || /^fd00:/i.test(ip) || /^fc/i.test(ip) },
  { name: 'ipv6-link-local', test: (ip) => /^fe80:/i.test(ip) }
]

const BLOCKED_NAMES = [
  'localhost',
  'metadata',
  'metadata.google.internal',
  'metadata.google.internal.',
  'kubernetes.default',
  'kubernetes.default.svc'
]

async function validateUrl(urlString) {
  let url
  try {
    url = new URL(urlString)
  } catch {
    return { valid: false, error: 'URL invalida' }
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return { valid: false, error: 'Protocolo nao suportado' }
  }

  const hostname = url.hostname.toLowerCase()

  if (BLOCKED_NAMES.includes(hostname)) {
    return { valid: false, error: `Hostname bloqueado: ${hostname}` }
  }

  let ip

  if (net.isIP(hostname)) {
    ip = hostname
  } else {
    try {
      const resolved = await dns.resolve4(hostname)
      ip = resolved[0]
    } catch {
      try {
        const resolved6 = await dns.resolve6(hostname)
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

module.exports = { validateUrl }
