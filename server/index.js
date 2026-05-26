const express = require('express')
const path = require('path')
const jwtVerify = require('./middleware/jwtVerify')
const executeRoute = require('./routes/execute')
const validateRoute = require('./routes/validate')
const publishRoute = require('./routes/publish')
const saveRoute = require('./routes/save')
const stopRoute = require('./routes/stop')
const logsRoute = require('./routes/logs')

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
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
app.get('/logs', logsRoute)

app.listen(PORT, () => {
  console.log(`jb-http-activity running on port ${PORT}`)
})
