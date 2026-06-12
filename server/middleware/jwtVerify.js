const jwt = require('jsonwebtoken')

module.exports = function jwtVerify(req, res, next) {
  if (process.env.JWT_DISABLED === 'true') {
    return next()
  }

  const token = (req.body && req.body.jwtToken) || req.query.jwtToken
  if (!token) {
    return res.status(401).json({ error: 'JWT ausente' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.jwtPayload = decoded
    next()
  } catch (err) {
    return res.status(401).json({ error: 'JWT invalido' })
  }
}
