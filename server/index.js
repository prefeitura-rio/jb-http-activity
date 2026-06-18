require('dotenv').config()

const express = require('express')
const path = require('path')
const jwtVerify = require('./middleware/jwtVerify')
const executeRoute = require('./routes/execute')
const validateRoute = require('./routes/validate')
const publishRoute = require('./routes/publish')
const saveRoute = require('./routes/save')
const stopRoute = require('./routes/stop')

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

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

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

const p = isSubPath ? uiBasePath : ''
app.post(`${p}/execute`, jwtVerify, executeRoute)
app.post(`${p}/validate`, jwtVerify, validateRoute)
app.post(`${p}/publish`, jwtVerify, publishRoute)
app.post(`${p}/save`, jwtVerify, saveRoute)
app.post(`${p}/stop`, jwtVerify, stopRoute)

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