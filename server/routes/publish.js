const { validateInArgs } = require('../lib/validateInArgs')

module.exports = function publishRoute(req, res) {
  try {
    const result = validateInArgs(req.body)
    if (!result.valid) {
      return res.status(400).json({ error: result.error })
    }
    return res.status(200).json({ status: 'ok' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
