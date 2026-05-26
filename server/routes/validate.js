module.exports = function validateRoute(req, res) {
  try {
    return res.status(200).json({ status: 'ok' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
