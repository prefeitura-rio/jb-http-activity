const jwt = require('jsonwebtoken')

module.exports = function jwtVerify(req, res, next) {
  if (process.env.JWT_DISABLED === 'true') {
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({ error: 'JWT_DISABLED nao permitido em producao' })
    }
    console.warn('[WARN] JWT_DISABLED ativo')
    return next()
  }

  if (req.headers['content-type'] !== 'application/jwt') {
    return res.status(400).json({ error: 'Content-Type deve ser application/jwt' })
  }

  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({ error: 'Body vazio' })
  }

  try {
    const token = req.body.toString('utf8')
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.jwtPayload = decoded
    req.body = typeof decoded.body === 'object' ? decoded.body : decoded
    next()
  } catch (err) {
    return res.status(401).json({ error: 'JWT invalido' })
  }
}
