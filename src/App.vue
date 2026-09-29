<template>
  <v-app :class="route.meta.public ? 'public-shell' : 'admin-shell'">
    <router-view v-if="route.meta.public" />

    <template v-else>
      <v-navigation-drawer
        v-model="drawer"
        :permanent="display.mdAndUp.value"
        :temporary="display.smAndDown.value"
        width="272"
        class="admin-sidebar"
      >
        <div class="brand-block">
          <div class="brand-icon">
            <v-icon icon="mdi-compass-outline" size="24" />
          </div>
          <div>
            <h1>GeoMídia</h1>
            <span>Campo Grande, MS</span>
          </div>
        </div>

        <v-list nav density="comfortable" class="px-3">
          <v-list-item
            v-for="item in navItems"
            :key="item.value"
            :active="route.name === item.value"
            :to="item.to"
            :prepend-icon="item.icon"
            :title="item.title"
            rounded="lg"
          />
        </v-list>

        <template #append>
          <div class="pa-3">
            <v-btn
              block
              variant="text"
              color="red-lighten-2"
              prepend-icon="mdi-logout"
              class="justify-start"
              @click="confirmLogout = true"
            >
              Sair
            </v-btn>
          </div>
        </template>
      </v-navigation-drawer>

      <admin-topbar
        :show-menu="display.smAndDown.value"
        :loading="media.loading"
        :role-label="roleLabel"
        :user-name="auth.userName"
        @toggle-menu="drawer = !drawer"
        @refresh="media.loadAll"
      />

      <v-main class="app-main">
        <v-container fluid class="app-content">
          <v-alert
            v-if="media.error"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-4"
            closable
            @click:close="media.error = null"
          >
            {{ media.error }}
          </v-alert>

          <router-view v-slot="{ Component }">
            <component :is="Component" @navigate="navigate" @view-map="handleViewOnMap" />
          </router-view>
        </v-container>
      </v-main>

      <v-dialog v-model="confirmLogout" max-width="420">
        <v-card title="Sair do sistema">
          <v-card-text>
            Deseja encerrar sua sessão no GeoMídia?
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="confirmLogout = false">Cancelar</v-btn>
            <v-btn color="error" @click="logout">Sair</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';

import AdminTopbar from './components/AdminTopbar.vue';
import { exitVisualPreview, isVisualPreview } from './router';
import { useAuthStore } from './stores/auth';
import { useMediaStore } from './stores/media';

const auth = useAuthStore();
const media = useMediaStore();
const route = useRoute();
const router = useRouter();
const display = useDisplay();
const drawer = ref(true);
const confirmLogout = ref(false);

if (isVisualPreview()) {
  auth.role = 'admin';
  auth.userName = 'Administrador GeoMídia';
}

const navItems = computed(() => [
  { title: 'Dashboard', value: 'dashboard', to: '/', icon: 'mdi-view-dashboard-outline' },
  { title: 'Mapa GIS', value: 'map', to: '/mapa', icon: 'mdi-map-outline' },
  { title: 'Inventário', value: 'inventory', to: '/inventario', icon: 'mdi-folder-table-outline' },
  { title: 'Vencimentos', value: 'expirations', to: '/vencimentos', icon: 'mdi-calendar-alert-outline' },
  ...(auth.canWrite
    ? [
      { title: 'Solicitações Recebidas', value: 'forms', to: '/formularios', icon: 'mdi-inbox-arrow-down-outline' },
      { title: 'Comunicado de Exigência', value: 'requirements', to: '/comunicados-de-exigencia', icon: 'mdi-file-document-alert-outline' },
    ]
    : []),
  ...(auth.role === 'admin'
    ? [
      { title: 'Usuários', value: 'users', to: '/usuarios', icon: 'mdi-account-cog-outline' },
      { title: 'Regras de Negócio', value: 'rules', to: '/regras', icon: 'mdi-tune-variant' },
    ]
    : []),
]);

const roleLabel = computed(() => ({ admin: 'Administrador', analyst: 'Analista GeoMídia', viewer: 'Consulta' }[auth.role ?? 'viewer']));

onMounted(async () => {
  window.addEventListener('geomidia:unauthorized', handleUnauthorized);
  if (!route.meta.public && !isVisualPreview() && await auth.validateSession()) {
    await media.loadAll().catch(() => undefined);
  }
});

onUnmounted(() => window.removeEventListener('geomidia:unauthorized', handleUnauthorized));

function navigate(view: 'dashboard' | 'map' | 'inventory' | 'expirations' | 'forms' | 'requirements' | 'users' | 'rules') {
  void router.push({ name: view });
}

function handleViewOnMap(id: string) {
  media.selectAsset(id);
  void router.push({ name: 'map', query: { asset: id } });
}

function handleUnauthorized() {
  if (isVisualPreview()) return;
  auth.logout();
  void router.push({ name: 'login' });
}

function logout() {
  confirmLogout.value = false;
  exitVisualPreview();
  auth.logout();
  media.$reset();
  void router.push({ name: 'login' });
}
</script>
