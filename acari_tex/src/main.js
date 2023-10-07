import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import VueGoogleCharts from 'vue-google-charts'

const app = createApp(App);

// Registre o Vue Router
app.use(router);

// Registre o VueGoogleCharts
app.use(VueGoogleCharts);

// Monte o aplicativo no elemento com o ID "app"
app.mount('#app');
