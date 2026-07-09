interface PostmongerSession {
  on(event: string, cb: (data: unknown) => void): void
  trigger(event: string, data?: unknown): void
  end(): void
}

interface Window {
  Postmonger: {
    Session: new () => PostmongerSession
  }
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
