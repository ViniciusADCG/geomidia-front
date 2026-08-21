import { createRouter, createWebHistory } from 'vue-router';

import LoginView from '../views/LoginView.vue';


function validStoredSession(): boolean {
  const token = sessionStorage.getItem('geomidia_token') ?? localStorage.getItem('geomidia_token');
  const expiresAt = sessionStorage.getItem('geomidia_expires_at') ?? localStorage.getItem('geomidia_expires_at');
  return Boolean(token && expiresAt && new Date(expiresAt).getTime() > Date.now());
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
    { path: '/', name: 'dashboard', component: () => import('../views/DashboardView.vue') },
    { path: '/mapa', name: 'map', component: () => import('../views/MapView.vue') },
    { path: '/inventario', name: 'inventory', component: () => import('../views/InventoryView.vue') },
    { path: '/vencimentos', name: 'expirations', component: () => import('../views/ExpirationsView.vue') },
    { path: '/formularios', name: 'forms', component: () => import('../views/FormsView.vue'), meta: { write: true } },
    { path: '/usuarios', name: 'users', component: () => import('../views/UsersView.vue'), meta: { admin: true } },
    { path: '/regras', name: 'rules', component: () => import('../views/RulesView.vue'), meta: { admin: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

router.beforeEach((to) => {
  const authenticated = validStoredSession();
  if (!to.meta.public && !authenticated) return { name: 'login', query: { redirect: to.fullPath } };
  if (to.name === 'login' && authenticated) return { name: 'dashboard' };
  const role = sessionStorage.getItem('geomidia_role') ?? localStorage.getItem('geomidia_role');
  if (to.meta.admin && role !== 'admin') return { name: 'dashboard' };
  if (to.meta.write && role !== 'admin' && role !== 'analyst') return { name: 'dashboard' };
  return true;
});
