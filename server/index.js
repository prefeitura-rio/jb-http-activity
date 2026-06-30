require('dotenv').config()

const express = require('express')
const path = require('path')
const jwtVerify = require('./middleware/jwtVerify')
const executeRoute = require('./routes/execute')
const validateRoute = require('./routes/validate')
const publishRoute = require('./routes/publish')
const saveRoute = require('./routes/save')
const stopRoute = require('./routes/stop')
const previewRoute = require('./routes/preview')

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
  process.exitCode = 1
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
})

const app = express()
const PORT = process.env.PORT || 3000

const uiBasePath = (process.env.UI_BASE_PATH || '/').replace(/\/+$/, '') || '/'
const isSubPath = uiBasePath !== '/'

app.use(express.raw({
  type: 'application/jwt',
  limit: '10kb'
}))

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'JSON invalido' })
  }
  next(err)
})

app.use((req, res, next) => {
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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})
if (isSubPath) {
  app.get(`${uiBasePath}/health`, (req, res) => {
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

const configJsPath = isSubPath ? `${uiBasePath}/config.js` : '/config.js'
const configJsonConfigJsPath = isSubPath ? `${uiBasePath}/config.json/config.js` : '/config.json/config.js'
const configJsonPath = isSubPath ? `${uiBasePath}/config.json` : '/config.json'

app.get(configJsPath, (req, res) => {
  res.redirect(configJsonPath)
})

app.get(configJsonConfigJsPath, (req, res) => {
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
