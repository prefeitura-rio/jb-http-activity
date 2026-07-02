import { Request, Response } from 'express'
import { validateInArgs } from '../lib/validateInArgs'

export default function validateRoute(req: Request, res: Response): void {
  try {
    const result = validateInArgs(req.body)
    if (!result.valid) {
      res.status(400).json({ error: result.error })
      return
    }
    res.status(200).json({ status: 'ok' })
  } catch (err: unknown) {
    const message: string = err instanceof Error ? err.message : 'Erro interno'
    res.status(500).json({ error: message })
  }
}
