import '@fontsource-variable/onest';
import 'leaflet/dist/leaflet.css';
import './styles/tailwind.css';
import './styles/map.css';

import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import { router } from './router';

createApp(App).use(createPinia()).use(router).mount('#app');
