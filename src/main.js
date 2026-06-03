import Postmonger from 'postmonger'
import { createApp } from 'vue'
import App from './App.vue'

window.Postmonger = Postmonger

createApp(App).mount('#app')