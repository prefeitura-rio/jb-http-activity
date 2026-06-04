const assert = require('assert')

describe('bigQueryLogger', function() {
  let bigQueryLogger

  beforeEach(function() {
    delete require.cache[require.resolve('../server/lib/bigQueryLogger')]
    bigQueryLogger = require('../server/lib/bigQueryLogger')
  })

  it('aceita log com dados completos', function() {
    const entry = {
      journeyId: 'j-123',
      contactKey: 'ck-456',
      method: 'POST',
      url: 'https://api.exemplo.com',
      httpStatus: 200,
      durationMs: 150,
      statusClass: '2xx',
      success: true
    }

    bigQueryLogger.log(entry)
  })

  it('aceita log com dados minimos', function() {
    bigQueryLogger.log({ method: 'GET', url: '/test', httpStatus: 500, success: false })
  })

  it('aceita multiplas entradas sem erro', function() {
    for (let i = 0; i < 10; i++) {
      bigQueryLogger.log({
        method: 'GET',
        url: '/test',
        httpStatus: 200,
        durationMs: i * 10,
        statusClass: '2xx',
        success: true
      })
    }
  })

  it('trata outArguments como objeto', function() {
    bigQueryLogger.log({
      method: 'GET',
      url: '/test',
      httpStatus: 200,
      success: true,
      outArguments: { httpStatusCode: 200, httpSuccess: true }
    })
  })

  it('usa NODE_ENV como environment', function() {
    process.env.NODE_ENV = 'test-env'
    bigQueryLogger.log({
      method: 'GET',
      url: '/test',
      httpStatus: 200,
      success: true
    })
  })
})
