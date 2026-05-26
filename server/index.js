const express = require('express')
const path = require('path')
const jwtVerify = require('./middleware/jwtVerify')
const executeRoute = require('./routes/execute')
const validateRoute = require('./routes/validate')
const publishRoute = require('./routes/publish')
const saveRoute = require('./routes/save')
const stopRoute = require('./routes/stop')

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json({ limit: '1mb' }))

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

app.listen(PORT, () => {
  console.log(`jb-http-activity running on port ${PORT}`)
})
