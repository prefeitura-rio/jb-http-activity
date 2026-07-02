import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'
import { JwtPayload, isJwtPayload } from '../types'

export default function jwtVerify(req: Request, res: Response, next: NextFunction): void {
  if (process.env.JWT_DISABLED === 'true') {
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ error: 'JWT_DISABLED nao permitido em producao' })
      return
    }
    console.warn('[WARN] JWT_DISABLED ativo')
    next()
    return
  }

  if (req.headers['content-type'] !== 'application/jwt') {
    res.status(400).json({ error: 'Content-Type deve ser application/jwt' })
    return
  }

  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    res.status(400).json({ error: 'Body vazio' })
    return
  }

  try {
    const token: string = (req.body as Buffer).toString('utf8')
    const decoded: unknown = jwt.verify(token, process.env.JWT_SECRET as string)
    if (isJwtPayload(decoded)) {
      const reqAny = req as unknown as Record<string, unknown>
      reqAny.jwtPayload = decoded as JwtPayload
      req.body = typeof decoded.body === 'object' && decoded.body !== null ? decoded.body : decoded
    }
    next()
  } catch (err: unknown) {
    res.status(401).json({ error: 'JWT invalido' })
  }
}
