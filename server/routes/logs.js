const logStore = require('../lib/logStore')

module.exports = function logsRoute(req, res) {
  const { type, limit } = req.query
  const max = Math.min(parseInt(limit, 10) || 20, 100)

  if (type === 'errors') {
    return res.json(logStore.errors(max))
  }

  return res.json(logStore.list(max))
}
