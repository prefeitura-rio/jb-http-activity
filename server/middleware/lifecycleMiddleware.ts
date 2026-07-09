import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'

export default function lifecycleMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Fail-closed: se JWT_SECRET nao estiver configurado, nega sempre
  if (!process.env.JWT_SECRET) {
    res.status(500).json({ error: 'JWT_SECRET nao configurado' })
    return
  }

  // application/jwt: decodifica JWT e popula req.body
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

  // application/json aceito apenas para rotas de lifecycle (save/validate/publish/stop)
  // INVARIANTE: essas rotas sao stateless e nao fazem chamadas HTTP externas nem acessam secrets.
  // Se isso mudar, revisar este middleware.
  const ct: string | undefined = req.headers['content-type']
  if (ct && ct.startsWith('application/json') && req.body && typeof req.body === 'object') {
    next()
    return
  }

  // Qualquer outro Content-Type: nega
  res.status(400).json({ error: 'Content-Type nao suportado' })
}
