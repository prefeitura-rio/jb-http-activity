const MAX_SIZE = 100

const store = []
let counter = 0

const logStore = {
  push(entry) {
    const id = ++counter
    const log = { id, timestamp: new Date().toISOString(), ...entry }
    store.unshift(log)
    if (store.length > MAX_SIZE) store.pop()
    return log
  },

  list(limit = 20) {
    return store.slice(0, limit)
  },

  errors(limit = 10) {
    return store.filter((e) => !e.success).slice(0, limit)
  }
}

module.exports = logStore
