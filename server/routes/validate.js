module.exports = function validateRoute(req, res) {
  try {
    const inArgs = req.body && req.body.inArguments
    if (!inArgs || !Array.isArray(inArgs)) {
      return res.status(400).json({ error: 'inArguments ausentes' })
    }

    const config = inArgs.reduce((acc, arg) => ({ ...acc, ...arg }), {})

    if (!config.url) {
      return res.status(400).json({ error: 'URL nao configurada' })
    }

    if (!config.method) {
      return res.status(400).json({ error: 'Metodo HTTP nao configurado' })
    }

    return res.status(200).json({ status: 'ok' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
