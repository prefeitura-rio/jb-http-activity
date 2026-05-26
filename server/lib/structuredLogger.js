const logger = {
  info: (data) => {
    console.log(JSON.stringify({
      severity: 'INFO',
      timestamp: new Date().toISOString(),
      ...data
    }))
  },
  error: (data) => {
    console.error(JSON.stringify({
      severity: 'ERROR',
      timestamp: new Date().toISOString(),
      ...data
    }))
  }
}

module.exports = logger
