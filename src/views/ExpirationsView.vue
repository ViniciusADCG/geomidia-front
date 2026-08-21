<template>
  <section class="view-stack">
    <div class="view-header">
      <div>
        <h2>Vencimentos</h2>
        <p>Acompanhe autorizações próximas do vencimento e processos já vencidos.</p>
      </div>
      <v-btn
        variant="outlined"
        prepend-icon="mdi-refresh"
        :loading="loading"
        @click="loadExpirations"
      >
        Atualizar
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

    <v-alert v-if="overview.reference_date" type="info" variant="tonal" density="compact">
      A janela de próximos vencimentos vai de {{ formatDate(overview.reference_date) }} até
      {{ formatDate(overview.window_end_date) }}.
    </v-alert>

    <v-row align="start">
      <v-col cols="12" xl="6">
        <expiration-list-card
          title="Próximos ao Vencimento"
          subtitle="Autorizações que vencem nos próximos 90 dias"
          :items="overview.expiring_soon"
          :reference-date="overview.reference_date"
          mode="upcoming"
          @view-map="viewOnMap"
        />
      </v-col>

      <v-col cols="12" xl="6">
        <expiration-list-card
          title="Vencidos"
          subtitle="Autorizações com data de vencimento ultrapassada"
          :items="overview.expired"
          :reference-date="overview.reference_date"
          mode="expired"
          @view-map="viewOnMap"
        />
      </v-col>
    </v-row>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import ExpirationListCard from '../components/ExpirationListCard.vue';
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
const media = useMediaStore();
const overview = ref<ExpirationOverview>({ ...EMPTY_OVERVIEW });
const loading = ref(false);
const error = ref('');

onMounted(loadExpirations);

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
