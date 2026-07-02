import { Request, Response } from 'express'

export default function stopRoute(req: Request, res: Response): void {
  try {
    res.status(200).json({ status: 'ok' })
  } catch (err: unknown) {
    const message: string = err instanceof Error ? err.message : 'Erro interno'
    res.status(500).json({ error: message })
  }
}
