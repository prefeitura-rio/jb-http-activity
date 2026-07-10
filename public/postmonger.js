(function (window) {
  const ALLOWED_ORIGIN_PATTERN = /^https:\/\/([a-z0-9-]+\.)*(exacttarget\.com|marketingcloudapps\.com)$/i

  function isAllowedOrigin(origin) {
    return typeof origin === 'string' && ALLOWED_ORIGIN_PATTERN.test(origin)
  }

  function referrerOrigin() {
    try {
      return document.referrer ? new URL(document.referrer).origin : null
    } catch {
      return null
    }
  }

  function Session() {
    this.handlers = {}
  }

  Session.prototype.trigger = function (event, data) {
    const origin = referrerOrigin()
    const targetOrigin = isAllowedOrigin(origin) ? origin : window.location.origin
    window.parent.postMessage({
      method: event,
      data: data
    }, targetOrigin)
  }

  Session.prototype.on = function (event, callback) {
    this.handlers[event] = callback
  }

  window.addEventListener('message', function (event) {
    if (!isAllowedOrigin(event.origin)) return

    var message = event.data || {}
    var method = message.method
    var data = message.data

    if (window.Postmonger && window.Postmonger._session && method) {
      var handler = window.Postmonger._session.handlers[method]
      if (handler) {
        handler(data)
      }
    }
  })

  window.Postmonger = {
    Session: function () {
      var session = new Session()
      window.Postmonger._session = session
      return session
    }
  }
})(window)