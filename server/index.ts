import dotenv from 'dotenv'
dotenv.config()

import express, { Request, Response, NextFunction } from 'express'
import path from 'path'
import jwtVerify from './middleware/jwtVerify'
import executeRoute from './routes/execute'
import validateRoute from './routes/validate'
import publishRoute from './routes/publish'
import saveRoute from './routes/save'
import stopRoute from './routes/stop'
import previewRoute from './routes/preview'
import logger from './lib/structuredLogger'
import { isSyntaxErrorWithStatus } from './types'

process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled Rejection:', reason)
  process.exitCode = 1
})

process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception:', err)
})

const app = express()
const PORT: number = parseInt(process.env.PORT || '3000', 10)

const uiBasePath: string = (process.env.UI_BASE_PATH || '/').replace(/\/+$/, '') || '/'
const isSubPath: boolean = uiBasePath !== '/'

app.use(express.raw({
  type: 'application/jwt',
  limit: '10kb'
}))

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (isSyntaxErrorWithStatus(err)) {
    res.status(400).json({ error: 'JSON invalido' })
    return
  }
  next(err)
})

app.use((req: Request, res: Response, next: NextFunction) => {
  res.removeHeader('X-Frame-Options')
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://*.exacttarget.com https://*.marketingcloudapps.com;")
  next()
})

app.use(express.static(path.join(__dirname, '..', 'dist')))
app.use(express.static(path.join(__dirname, '..', 'public')))

if (isSubPath) {
  app.use(uiBasePath, express.static(path.join(__dirname, '..', 'dist')))
  app.use(uiBasePath, express.static(path.join(__dirname, '..', 'public')))
}

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})
if (isSubPath) {
  app.get(`${uiBasePath}/health`, (req: Request, res: Response) => {
    res.json({ status: 'ok', uptime: process.uptime() })
  })
}

app.post('/execute', jwtVerify, executeRoute)
app.post('/validate', jwtVerify, validateRoute)
app.post('/publish', jwtVerify, publishRoute)
app.post('/save', jwtVerify, saveRoute)
app.post('/stop', jwtVerify, stopRoute)
app.post('/preview', previewRoute)
if (isSubPath) {
  app.post(`${uiBasePath}/execute`, jwtVerify, executeRoute)
  app.post(`${uiBasePath}/validate`, jwtVerify, validateRoute)
  app.post(`${uiBasePath}/publish`, jwtVerify, publishRoute)
  app.post(`${uiBasePath}/save`, jwtVerify, saveRoute)
  app.post(`${uiBasePath}/stop`, jwtVerify, stopRoute)
  app.post(`${uiBasePath}/preview`, previewRoute)
}

const configJsPath: string = isSubPath ? `${uiBasePath}/config.js` : '/config.js'
const configJsonConfigJsPath: string = isSubPath ? `${uiBasePath}/config.json/config.js` : '/config.json/config.js'
const configJsonPath: string = isSubPath ? `${uiBasePath}/config.json` : '/config.json'

app.get(configJsPath, (req: Request, res: Response) => {
  res.redirect(configJsonPath)
})

app.get(configJsonConfigJsPath, (req: Request, res: Response) => {
  res.redirect(configJsonPath)
})

const server = app.listen(PORT, () => {
  console.log(`jb-http-activity running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  server.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  server.close(() => process.exit(0))
})
