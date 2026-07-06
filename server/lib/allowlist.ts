import { ValidationResult } from '../types'

function loadPatterns(): string[] {
  const raw: string = process.env.HTTP_ALLOWLIST || ''
  return raw.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean)
}

export async function validateUrl(urlString: string): Promise<ValidationResult> {
  const patterns: string[] = loadPatterns()

  if (patterns.length === 0) {
    return { valid: false, error: 'ALLOWLIST: Nenhum destino permitido configurado (HTTP_ALLOWLIST vazia)' }
  }

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

  for (const pattern of patterns) {
    if (pattern === '*') {
      return { valid: true }
    }
    const cleanPattern: string = pattern.startsWith('.') ? pattern.slice(1) : pattern
    if (hostname === pattern || hostname === cleanPattern || hostname.endsWith(pattern)) {
      return { valid: true }
    }
  }

  return { valid: false, error: `ALLOWLIST: ${hostname}` }
}
