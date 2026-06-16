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

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

app.use(express.static(path.join(__dirname, '..', 'dist')))
app.use(express.static(path.join(__dirname, '..', 'public')))

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

app.post('/execute', jwtVerify, executeRoute)
app.post('/validate', jwtVerify, validateRoute)
app.post('/publish', jwtVerify, publishRoute)
app.post('/save', jwtVerify, saveRoute)
app.post('/stop', jwtVerify, stopRoute)

app.get('/config.js', (req, res) => {
  res.redirect('/config.json')
})

app.get('/config.json/config.js', (req, res) => {
  res.redirect('/config.json')
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