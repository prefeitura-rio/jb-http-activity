(function (window) {
  function Session() {
    this.handlers = {}
  }

  Session.prototype.trigger = function (event, data) {
    window.parent.postMessage({
      method: event,
      data: data
    }, '*')
  }

  Session.prototype.on = function (event, callback) {
    this.handlers[event] = callback
  }

  window.addEventListener('message', function (event) {
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