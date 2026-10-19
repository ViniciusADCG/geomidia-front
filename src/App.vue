<template>
  <v-app :class="route.meta.public ? 'public-shell' : 'admin-shell'">
    <router-view v-if="route.meta.public" />

    <div v-else class="min-h-dvh bg-background">
      <aside v-if="isDesktop" class="fixed inset-y-0 left-0 z-40 w-64">
        <app-sidebar
          :active-name="route.name"
          :can-write="auth.canWrite"
          :is-admin="auth.role === 'admin'"
          @logout="confirmLogout = true"
        />
      </aside>

      <Sheet v-else v-model:open="drawer">
        <SheetContent side="left" class="w-72 gap-0 border-0 bg-sidebar p-0 sm:max-w-72">
          <SheetTitle class="sr-only">Menu</SheetTitle>
          <app-sidebar
            :active-name="route.name"
            :can-write="auth.canWrite"
            :is-admin="auth.role === 'admin'"
            @navigate="drawer = false"
            @logout="drawer = false; confirmLogout = true"
          />
        </SheetContent>
      </Sheet>

      <div :class="isDesktop ? 'pl-64' : ''">
        <app-topbar
          :show-menu="!isDesktop"
          :loading="media.loading || (route.name === 'inventory' && media.inventoryLoading) || (route.name === 'map' && mapState.loading)"
          :role-label="roleLabel"
          :user-name="auth.userName"
          @toggle-menu="drawer = !drawer"
          @refresh="refreshCurrentView"
        />

        <main class="mx-auto w-full max-w-[1760px] px-4 py-6 lg:px-8 lg:py-8">
          <Alert v-if="auth.error || media.error" variant="destructive" class="mb-6 pr-12">
            <CircleAlert />
            <AlertDescription>{{ auth.error || media.error }}</AlertDescription>
            <button
              type="button"
              class="absolute top-2.5 right-2.5 rounded-sm p-1 opacity-70 hover:opacity-100"
              aria-label="Fechar aviso"
              @click="auth.error = null; media.error = null"
            >
              <X class="size-4" />
            </button>
          </Alert>

          <router-view v-slot="{ Component }">
            <component :is="Component" @navigate="navigate" @view-map="handleViewOnMap" />
          </router-view>
        </main>
      </div>

      <AlertDialog :open="confirmLogout" @update:open="confirmLogout = $event">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair do GeoMídia?</AlertDialogTitle>
            <AlertDialogDescription>Sua sessão será encerrada neste navegador.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" @click="confirmLogout = false">Cancelar</Button>
            <Button variant="destructive" @click="logout">Sair</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog :open="approvalConflictDialog" @update:open="(open) => { if (!open) resolveApprovalConflict(false); }">
        <AlertDialogContent class="sm:max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Conflito territorial identificado</AlertDialogTitle>
            <AlertDialogDescription class="text-foreground">{{ approvalConflict?.message }}</AlertDialogDescription>
          </AlertDialogHeader>
          <ul v-if="approvalConflict?.conflicts.length" class="divide-y rounded-md border">
            <li
              v-for="conflict in approvalConflict.conflicts"
              :key="conflict.conflicting_asset_id"
              class="flex items-start gap-3 px-4 py-3"
            >
              <TriangleAlert class="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              <div>
                <p class="tabular font-semibold">{{ conflict.process_code }}</p>
                <p class="tabular text-sm text-muted-foreground">
                  {{ Math.round(conflict.distance_meters) }} m de distância; mínimo {{ conflict.minimum_distance_meters }} m
                </p>
              </div>
            </li>
          </ul>
          <p class="text-sm text-muted-foreground">
            Você pode aprovar mesmo assim. A decisão e os conflitos encontrados ficam registrados no histórico do processo.
          </p>
          <AlertDialogFooter>
            <Button variant="outline" @click="resolveApprovalConflict(false)">Cancelar</Button>
            <Button class="bg-warning text-white hover:bg-warning/90" @click="resolveApprovalConflict(true)">Aprovar mesmo assim</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { CircleAlert, TriangleAlert, X } from '@lucide/vue';
import { useMediaQuery } from '@vueuse/core';

import AppSidebar from '@/components/layout/AppSidebar.vue';
import AppTopbar from '@/components/layout/AppTopbar.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

import type { ApprovalConflictPrompt } from './types';
import { APPROVAL_CONFLICT_EVENT } from './utils/approval-conflict-confirmation';
import { exitVisualPreview, isVisualPreview } from './router';
import { useAuthStore } from './stores/auth';
import { useMapStore } from './stores/map';
import { useMediaStore } from './stores/media';

const auth = useAuthStore();
const media = useMediaStore();
const mapState = useMapStore();
const route = useRoute();
const router = useRouter();
const isDesktop = useMediaQuery('(min-width: 1024px)');
const drawer = ref(false);
const confirmLogout = ref(false);
const approvalConflictDialog = ref(false);
const approvalConflict = ref<ApprovalConflictPrompt | null>(null);
let resolveApprovalConflictPrompt: ((confirmed: boolean) => void) | null = null;
let sessionValidated = false;

if (isVisualPreview()) {
  auth.role = 'admin';
  auth.userName = 'Administrador GeoMídia';
}

const roleLabel = computed(() => ({ admin: 'Administrador', analyst: 'Analista GeoMídia', viewer: 'Consulta' }[auth.role ?? 'viewer']));

onMounted(() => {
  window.addEventListener('geomidia:unauthorized', handleUnauthorized);
  window.addEventListener(APPROVAL_CONFLICT_EVENT, handleApprovalConflict as EventListener);
});

watch(
  () => route.meta.public,
  async (isPublic) => {
    if (isPublic || isVisualPreview() || !auth.isAuthenticated) return;
    if (await auth.validateSession()) {
      sessionValidated = true;
      loadRouteData(route.name);
    }
  },
  { immediate: true },
);

watch(() => route.name, (name) => {
  if (sessionValidated && auth.isAuthenticated) loadRouteData(name);
});

watch(() => auth.isAuthenticated, (authenticated) => {
  if (!authenticated) {
    sessionValidated = false;
    mapState.clearSessionData();
  }
});

onUnmounted(() => {
  window.removeEventListener('geomidia:unauthorized', handleUnauthorized);
  window.removeEventListener(APPROVAL_CONFLICT_EVENT, handleApprovalConflict as EventListener);
  resolveApprovalConflict(false);
});

function handleApprovalConflict(event: Event) {
  const prompt = (event as CustomEvent<ApprovalConflictPrompt>).detail;
  approvalConflict.value = prompt;
  resolveApprovalConflictPrompt = prompt.resolve;
  approvalConflictDialog.value = true;
}

function resolveApprovalConflict(confirmed: boolean) {
  const resolve = resolveApprovalConflictPrompt;
  resolveApprovalConflictPrompt = null;
  approvalConflictDialog.value = false;
  approvalConflict.value = null;
  resolve?.(confirmed);
}

function navigate(view: 'dashboard' | 'map' | 'inventory' | 'expirations' | 'forms' | 'requirements' | 'users' | 'rules') {
  void router.push({ name: view });
}

function refreshCurrentView() {
  if (route.name === 'map') {
    window.dispatchEvent(new Event('geomidia:map-refresh'));
    return;
  }
  if (route.name === 'dashboard') void media.loadDashboard();
  if (route.name === 'inventory') {
    void media.refreshInventory();
    void media.loadRules();
  }
  if (route.name === 'forms') {
    window.dispatchEvent(new Event('geomidia:forms-refresh'));
    void media.loadRules();
  }
  if (route.name === 'rules') window.dispatchEvent(new Event('geomidia:rules-refresh'));
  if (route.name === 'expirations') window.dispatchEvent(new Event('geomidia:expirations-refresh'));
  if (route.name === 'requirements') window.dispatchEvent(new Event('geomidia:requirements-refresh'));
  if (route.name === 'users') window.dispatchEvent(new Event('geomidia:users-refresh'));
}

function loadRouteData(name: string | symbol | null | undefined) {
  if (name === 'dashboard') void media.loadDashboard();
  if (name === 'map' || name === 'inventory' || name === 'forms') void media.loadRules();
}

function handleViewOnMap(id: string) {
  media.selectAsset(id);
  void router.push({ name: 'map', query: { asset: id } });
}

function handleUnauthorized(event: Event) {
  if (isVisualPreview()) return;
  if ((event as CustomEvent<{ token: string | null }>).detail?.token !== auth.token) return;
  auth.logout();
  void router.push({ name: 'login' });
}

function logout() {
  confirmLogout.value = false;
  exitVisualPreview();
  auth.logout();
  void router.push({ name: 'login' });
}
</script>
