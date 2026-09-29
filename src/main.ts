import '@mdi/font/css/materialdesignicons.css';
import 'leaflet/dist/leaflet.css';
import 'vuetify/styles';
import './styles/main.css';

import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { createVuetify } from 'vuetify';

import App from './App.vue';
import { router } from './router';

const vuetify = createVuetify({
  theme: {
    defaultTheme: 'geomidiaLight',
    themes: {
      geomidiaLight: {
        dark: false,
        colors: {
          primary: '#0867c9',
          secondary: '#2f6f73',
          surface: '#ffffff',
          background: '#f3f6f9',
          error: '#b42318',
          warning: '#b7791f',
          success: '#237a57',
        },
      },
    },
  },
  defaults: {
    VCard: { rounded: 'lg', elevation: 0 },
    VBtn: { rounded: 'lg' },
    VTextField: { variant: 'outlined', density: 'compact' },
    VSelect: { variant: 'outlined', density: 'compact' },
    VTextarea: { variant: 'outlined', density: 'compact' },
  },
});

createApp(App).use(createPinia()).use(router).use(vuetify).mount('#app');
