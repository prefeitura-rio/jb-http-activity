function validateInArgs(body) {
  const inArgs = body && body.inArguments
  if (!inArgs || !Array.isArray(inArgs)) {
    return { valid: false, error: 'inArguments ausentes' }
  }

  const config = inArgs.reduce((acc, arg) => ({ ...acc, ...arg }), {})

  if (!config.url) {
    return { valid: false, error: 'URL nao configurada' }
  }

  if (!config.method) {
    return { valid: false, error: 'Metodo HTTP nao configurado' }
  }

  return { valid: true, config }
}

module.exports = { validateInArgs }
