import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'

export default function lifecycleMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (process.env.JWT_DISABLED === 'true') {
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ error: 'JWT_DISABLED nao permitido em producao' })
      return
    }
    console.warn('[WARN] JWT_DISABLED ativo')
    next()
    return
  }

  // If application/jwt, decode JWT and populate req.body
  if (req.headers['content-type'] === 'application/jwt' && Buffer.isBuffer(req.body) && req.body.length > 0) {
    try {
      const token: string = (req.body as Buffer).toString('utf8')
      const decoded: unknown = jwt.verify(token, process.env.JWT_SECRET as string)
      const reqAny = req as unknown as Record<string, unknown>
      reqAny.jwtPayload = decoded
      req.body = typeof (decoded as Record<string, unknown>).body === 'object'
        ? (decoded as Record<string, unknown>).body
        : decoded
      next()
      return
    } catch (err: unknown) {
      res.status(401).json({ error: 'JWT invalido' })
      return
    }
  }

  // If application/json (or any other format), pass through
  // express.json() already parsed the body
  next()
}
