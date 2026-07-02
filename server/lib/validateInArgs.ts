interface ValidationResult {
  valid: boolean
  error?: string
  config?: Record<string, unknown>
}

export function validateInArgs(body: unknown): ValidationResult {
  if (typeof body !== 'object' || body === null) {
    return { valid: true, config: {} }
  }

  const inArgs = (body as Record<string, unknown>).inArguments

  if (!Array.isArray(inArgs)) {
    return { valid: true, config: {} }
  }

  const config: Record<string, unknown> = inArgs.reduce(
    (acc: Record<string, unknown>, arg: unknown) => {
      if (typeof arg === 'object' && arg !== null && !Array.isArray(arg)) {
        return { ...acc, ...(arg as Record<string, unknown>) }
      }
      return acc
    },
    {}
  )

  if (!config.url || typeof config.url !== 'string') {
    return { valid: false, error: 'URL nao configurada' }
  }

  if (!config.method || typeof config.method !== 'string') {
    return { valid: false, error: 'Metodo HTTP nao configurado' }
  }

  return { valid: true, config }
}
