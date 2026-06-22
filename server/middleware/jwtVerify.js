const jwt = require('jsonwebtoken')

module.exports = function jwtVerify(req, res, next) {
  if (process.env.JWT_DISABLED === 'true') {
    return next()
  }

  const inArgs = req.body && req.body.inArguments
  const isPreview = Array.isArray(inArgs) && inArgs.some(a => a._preview === true)
  if (isPreview) {
    return next()
  }

  const authHeader = req.headers.authorization
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7)
  const token = (req.body && req.body.jwtToken) || req.query.jwtToken || bearerToken
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
