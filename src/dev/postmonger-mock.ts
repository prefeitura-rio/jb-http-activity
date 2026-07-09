if (import.meta.env.DEV) {
  interface HandlerMap {
    [key: string]: ((data: unknown) => void) | undefined
  }

  window.Postmonger = {
    Session: function() {
      const handlers: HandlerMap = {}
      return {
        trigger: function(event: string, data?: unknown): void {
          console.log('[Mock] trigger:', event, data)
          if (event === 'ready') {
            setTimeout(() => {
              if (handlers.initActivity) {
                handlers.initActivity({
                  name: 'Minha Activity',
                  metaData: { isConfigured: false },
                  arguments: {
                    execute: {
                      inArguments: [
                        { activityName: '' },
                        { method: 'GET' },
                        { url: '' },
                        { headers: '[]' },
                        { queryParams: '[]' },
                        { body: '' },
                        { auth: '{}' },
                        { responseMapping: '[]' },
                        { treatErrorsAsOutput: false },
                        { timeout: 30000 },
                        { retryCount: 0 },
                        { retryDelay: 1000 }
                      ]
                    }
                  }
                })
              }
            }, 500)
            setTimeout(() => {
              if (handlers.requestedSchema) {
                handlers.requestedSchema({
                  schema: [
                    { key: 'Contact.Key' },
                    { key: 'Contact.Attribute.DE.CPF' },
                    { key: 'Contact.Attribute.DE.NOME' },
                    { key: 'Contact.Attribute.DE.TELEFONE' },
                    { key: 'Contact.Attribute.DE.TOKEN' }
                  ]
                })
              }
            }, 800)
            setTimeout(() => {
              if (handlers.requestedEndpoints) {
                handlers.requestedEndpoints({
                  restHost: 'https://your-subdomain.rest.marketingcloudapis.com/'
                })
              }
            }, 1000)
            setTimeout(() => {
              if (handlers.requestedInteractionDefaults) {
                handlers.requestedInteractionDefaults({
                  interactionName: 'Jornada de Teste',
                  key: 'test-journey-key'
                })
              }
            }, 1200)
          }
        },
        on: function(event: string, cb: (data: unknown) => void): void { handlers[event] = cb }
      }
    }
  }
}
