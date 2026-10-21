<template>
  <section>
    <PageHeader title="Vencimentos" description="Autorizações que vencem nos próximos 90 dias e as que já venceram.">
      <template #actions>
        <Button variant="outline" :disabled="loading" @click="loadExpirations">
          <RefreshCw :class="loading && 'animate-spin'" />
          Atualizar
        </Button>
      </template>
    </PageHeader>

    <Alert v-if="error" variant="destructive" class="mb-4">
      <CircleAlert />
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <p v-if="overview.reference_date" class="mb-4 text-sm text-muted-foreground">
      Janela considerada: de <span class="tabular font-medium text-foreground">{{ formatDate(overview.reference_date) }}</span>
      até <span class="tabular font-medium text-foreground">{{ formatDate(overview.window_end_date) }}</span>.
    </p>

    <div class="grid items-start gap-4 2xl:grid-cols-2">
      <ExpirationListCard
        id="vencidos"
        :class="['scroll-mt-40', highlight === 'vencidos' && 'section-flash']"
        title="Vencidos"
        subtitle="A data de vencimento já passou"
        :items="overview.expired"
        :reference-date="overview.reference_date"
        mode="expired"
        @view-map="viewOnMap"
      />
      <ExpirationListCard
        id="proximos"
        :class="['scroll-mt-40', highlight === 'proximos' && 'section-flash']"
        title="Próximos ao vencimento"
        subtitle="Vencem nos próximos 90 dias"
        :items="overview.expiring_soon"
        :reference-date="overview.reference_date"
        mode="upcoming"
        @view-map="viewOnMap"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { CircleAlert, RefreshCw } from '@lucide/vue';
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import ExpirationListCard from '@/components/expirations/ExpirationListCard.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import { api } from '../services/api';
import { useMediaStore } from '../stores/media';
import type { ExpirationOverview, MediaAsset } from '../types';
import { formatDate } from '../utils/format';

const EMPTY_OVERVIEW: ExpirationOverview = {
  reference_date: '',
  window_end_date: '',
  expiring_soon: [],
  expired: [],
};

const router = useRouter();
const route = useRoute();
// Vindo do Dashboard com #vencidos ou #proximos: a lista certa é trazida à vista e pisca de leve.
const highlight = ref('');
const media = useMediaStore();
const overview = ref<ExpirationOverview>({ ...EMPTY_OVERVIEW });
const loading = ref(false);
const error = ref('');

onMounted(() => {
  window.addEventListener('geomidia:expirations-refresh', loadExpirations);
  void loadExpirations().then(focusFromHash);
});

async function focusFromHash() {
  const id = route.hash.replace('#', '');
  if (id !== 'vencidos' && id !== 'proximos') return;
  await nextTick();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  highlight.value = id;
  window.setTimeout(() => { highlight.value = ''; }, 1600);
}
onUnmounted(() => window.removeEventListener('geomidia:expirations-refresh', loadExpirations));

async function loadExpirations() {
  loading.value = true;
  error.value = '';
  try {
    overview.value = await api.getMediaExpirations();
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Falha ao carregar os vencimentos.';
  } finally {
    loading.value = false;
  }
}

function viewOnMap(asset: MediaAsset) {
  media.selectAsset(asset.id);
  void router.push({ name: 'map', query: { asset: asset.id } });
}
</script>
