<template>
  <v-app>
    <LoginView v-if="!auth.isAuthenticated" @logged-in="handleLoggedIn" />

    <template v-else>
      <v-navigation-drawer
        v-model="drawer"
        :permanent="display.mdAndUp.value"
        :temporary="display.smAndDown.value"
        color="#202a34"
        width="272"
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
            :active="activeView === item.value"
            :prepend-icon="item.icon"
            :title="item.title"
            rounded="lg"
            @click="activeView = item.value"
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

      <v-app-bar flat border height="64" color="white">
        <v-app-bar-nav-icon v-if="display.smAndDown.value" @click="drawer = !drawer" />
        <v-toolbar-title class="toolbar-title">
          <span class="scope-chip">Prefeitura Municipal</span>
          <span class="d-none d-md-inline">Secretaria de Planejamento e Meio Ambiente</span>
        </v-toolbar-title>
        <v-spacer />
        <v-btn icon="mdi-refresh" variant="text" :loading="media.loading" @click="media.loadAll" />
        <v-avatar color="primary" size="34">
          <v-icon icon="mdi-account-outline" />
        </v-avatar>
        <div class="user-meta d-none d-sm-block">
          <strong>Analista GeoMídia</strong>
          <span>{{ auth.userEmail }}</span>
        </div>
      </v-app-bar>

      <v-main class="app-main">
        <v-container fluid class="pa-4 pa-md-6">
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

          <DashboardView v-if="activeView === 'dashboard'" @navigate="activeView = $event" />
          <MapView v-else-if="activeView === 'map'" />
          <InventoryView
            v-else
            @view-map="handleViewOnMap"
          />
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
import { onMounted, ref, watch } from 'vue';
import { useDisplay } from 'vuetify';

import DashboardView from './views/DashboardView.vue';
import InventoryView from './views/InventoryView.vue';
import LoginView from './views/LoginView.vue';
import MapView from './views/MapView.vue';
import { useAuthStore } from './stores/auth';
import { useMediaStore } from './stores/media';

type ActiveView = 'dashboard' | 'map' | 'inventory';

const auth = useAuthStore();
const media = useMediaStore();
const display = useDisplay();
const drawer = ref(true);
const confirmLogout = ref(false);
const activeView = ref<ActiveView>((localStorage.getItem('geomidia_active_view') as ActiveView) ?? 'dashboard');

const navItems = [
  { title: 'Dashboard', value: 'dashboard' as const, icon: 'mdi-view-dashboard-outline' },
  { title: 'Mapa GIS', value: 'map' as const, icon: 'mdi-map-outline' },
  { title: 'Inventário', value: 'inventory' as const, icon: 'mdi-folder-table-outline' },
];

watch(activeView, (value) => {
  localStorage.setItem('geomidia_active_view', value);
});

onMounted(() => {
  if (auth.isAuthenticated) {
    void media.loadAll();
  }
});

async function handleLoggedIn() {
  await media.loadAll();
  activeView.value = 'dashboard';
}

function handleViewOnMap(id: string) {
  media.selectAsset(id);
  activeView.value = 'map';
}

function logout() {
  confirmLogout.value = false;
  auth.logout();
}
</script>
