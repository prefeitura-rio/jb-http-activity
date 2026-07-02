import { LogEntry } from '../types'

const logger = {
  info: (data: LogEntry): void => {
    console.log(JSON.stringify({
      severity: 'INFO',
      timestamp: new Date().toISOString(),
      ...data
    }))
  },
  error: (data: LogEntry): void => {
    console.error(JSON.stringify({
      severity: 'ERROR',
      timestamp: new Date().toISOString(),
      ...data
    }))
  }
}

export = logger
