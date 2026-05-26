import { createApp } from 'vue'
import App from './App.vue'

if (import.meta.env.DEV) {
  await import('./dev/postmonger-mock.js')
}

createApp(App).mount('#app')
