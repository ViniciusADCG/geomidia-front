<template>
  <section class="map-layout">
    <v-card border class="map-panel">
      <div class="map-topbar">
        <div>
          <strong>Mapa GIS · Campo Grande, MS</strong>
          <span>{{ filteredAssets.length }} ativo(s) exibido(s)</span>
        </div>
        <v-select
          v-model="typeFilter"
          :items="typeFilterOptions"
          label="Filtrar tipo"
          hide-details
          class="map-filter"
        />
      </div>
      <div ref="mapElement" class="leaflet-map" />
    </v-card>

    <aside class="side-stack">
      <v-btn-toggle v-model="mode" mandatory divided density="comfortable" class="w-100">
        <v-btn value="analysis" class="flex-1">Análise</v-btn>
        <v-btn value="form" class="flex-1">Cadastro</v-btn>
      </v-btn-toggle>

      <v-card v-if="mode === 'form'" border class="pa-5">
        <div class="card-title-row">
          <h3>Novo Ponto</h3>
          <v-chip size="small" color="primary" variant="tonal">
            {{ draft.latitude.toFixed(5) }}, {{ draft.longitude.toFixed(5) }}
          </v-chip>
        </div>

        <v-form class="stack-form" @submit.prevent="saveDraft">
          <v-select v-model="draft.media_type" :items="MEDIA_TYPE_OPTIONS" label="Tipo" />
          <v-text-field v-model="draft.address" label="Endereço" />
          <v-select v-model="draft.district" :items="DISTRICT_OPTIONS" label="Bairro" />
          <div class="two-cols">
            <v-text-field v-model.number="draft.area_m2" label="Área (m²)" type="number" />
            <v-text-field v-model.number="draft.bottom_height_m" label="Altura (m)" type="number" />
          </div>
          <v-alert color="primary" variant="tonal" density="compact">
            Raio calculado: {{ getRequiredRadius(draft.media_type, draft.area_m2) }}m
          </v-alert>
          <v-btn color="primary" type="submit" block :loading="media.loading">
            Adicionar e Mapear
          </v-btn>
        </v-form>
      </v-card>

      <v-card v-else border class="pa-5 analysis-card">
        <template v-if="selectedAsset">
          <div class="selected-header">
            <div>
              <v-chip size="small" color="primary" variant="tonal">{{ selectedAsset.process_code }}</v-chip>
              <h3>{{ selectedAsset.address }}</h3>
              <span>{{ selectedAsset.district }} · {{ mediaTypeLabel(selectedAsset.media_type) }}</span>
            </div>
            <v-chip :color="statusColor(selectedAsset.status)" variant="tonal">
              {{ selectedAsset.status }}
            </v-chip>
          </div>

          <v-alert
            :type="analysis?.has_conflict ? 'error' : 'success'"
            variant="tonal"
            class="my-4"
          >
            {{ analysis?.message ?? 'Analisando viabilidade territorial...' }}
          </v-alert>

          <div class="spec-grid">
            <div>
              <span>Área</span>
              <strong>{{ selectedAsset.area_m2 }} m²</strong>
            </div>
            <div>
              <span>Altura</span>
              <strong>{{ selectedAsset.bottom_height_m }} m</strong>
            </div>
            <div>
              <span>Raio</span>
              <strong>{{ selectedAsset.radius_meters }} m</strong>
            </div>
            <div>
              <span>Coordenadas</span>
              <strong>{{ selectedAsset.latitude.toFixed(4) }}, {{ selectedAsset.longitude.toFixed(4) }}</strong>
            </div>
          </div>

          <v-divider class="my-4" />

          <v-select v-model="reviewStatus" :items="STATUS_OPTIONS" label="Decisão" />
          <v-textarea
            v-model="reviewJustification"
            label="Justificativa"
            rows="3"
          />
          <v-btn color="primary" block :loading="media.loading" @click="saveDecision">
            Salvar Decisão
          </v-btn>
          <v-btn
            color="error"
            variant="text"
            prepend-icon="mdi-trash-can-outline"
            class="mt-2"
            @click="media.deleteAsset(selectedAsset.id)"
          >
            Excluir Ponto
          </v-btn>
        </template>

        <div v-else class="empty-state compact">
          <v-icon icon="mdi-map-marker-question-outline" size="44" />
          <span>Selecione um marcador no mapa para analisar.</span>
        </div>
      </v-card>
    </aside>
  </section>
</template>

<script setup lang="ts">
import L from 'leaflet';
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';

import {
  DISTRICT_OPTIONS,
  MEDIA_TYPE_OPTIONS,
  STATUS_OPTIONS,
  getRequiredRadius,
  mediaTypeColor,
  mediaTypeLabel,
  statusColor,
} from '../domain/rules';
import { useMediaStore } from '../stores/media';
import type { MediaAsset, MediaAssetInput, MediaStatus, MediaType } from '../types';

const CAMPO_GRANDE_CENTER: [number, number] = [-20.464, -54.612];

const media = useMediaStore();
const mapElement = ref<HTMLElement | null>(null);
const typeFilter = ref<MediaType | 'all'>('all');
const mode = ref<'analysis' | 'form'>('analysis');
const reviewStatus = ref<MediaStatus>('Aprovado');
const reviewJustification = ref('');
const draft = reactive<MediaAssetInput>(blankDraft());

let map: L.Map | null = null;
let assetLayer: L.LayerGroup | null = null;

const typeFilterOptions = computed(() => [
  { title: 'Todos os tipos', value: 'all' },
  ...MEDIA_TYPE_OPTIONS,
]);

const filteredAssets = computed(() => (
  typeFilter.value === 'all'
    ? media.assets
    : media.assets.filter((asset) => asset.media_type === typeFilter.value)
));

const selectedAsset = computed(() => media.selectedAsset);

const analysis = computed(() => (
  selectedAsset.value ? media.analysisByAssetId[selectedAsset.value.id] : null
));

watch(filteredAssets, renderAssets, { deep: true });

watch(() => media.selectedAssetId, renderAssets);

watch(selectedAsset, (asset) => {
  if (!asset) return;
  mode.value = 'analysis';
  reviewStatus.value = asset.status === 'Reprovado' ? 'Reprovado' : 'Aprovado';
  reviewJustification.value = asset.justification ?? '';
  focusAsset(asset);
}, { immediate: true });

onMounted(async () => {
  await nextTick();
  if (!mapElement.value) return;

  map = L.map(mapElement.value, {
    zoomControl: true,
  }).setView(CAMPO_GRANDE_CENTER, 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }).addTo(map);

  assetLayer = L.layerGroup().addTo(map);
  map.on('click', handleMapClick);
  renderAssets();
  if (selectedAsset.value) {
    focusAsset(selectedAsset.value);
  }

  setTimeout(() => map?.invalidateSize(), 120);
});

onUnmounted(() => {
  map?.remove();
  map = null;
  assetLayer = null;
});

function blankDraft(): MediaAssetInput {
  return {
    media_type: 'outdoor',
    address: '',
    district: 'Centro',
    latitude: CAMPO_GRANDE_CENTER[0],
    longitude: CAMPO_GRANDE_CENTER[1],
    area_m2: 27,
    width_m: 9,
    bottom_height_m: 5,
    top_height_m: null,
    status: 'Pendente',
    justification: '',
    contact_name: '',
    contact_email: '',
  };
}

function renderAssets() {
  if (!assetLayer) return;
  assetLayer.clearLayers();

  filteredAssets.value.forEach((asset) => {
    const color = mediaTypeColor(asset.media_type);
    const latLng: L.LatLngExpression = [asset.latitude, asset.longitude];

    L.circle(latLng, {
      radius: asset.radius_meters,
      color: asset.id === media.selectedAssetId ? '#b42318' : color,
      fillColor: color,
      fillOpacity: asset.id === media.selectedAssetId ? 0.16 : 0.08,
      weight: asset.id === media.selectedAssetId ? 2 : 1,
    }).addTo(assetLayer!);

    L.circleMarker(latLng, {
      radius: asset.id === media.selectedAssetId ? 9 : 7,
      color: '#ffffff',
      weight: 2,
      fillColor: color,
      fillOpacity: 1,
    })
      .bindTooltip(`${asset.process_code} · ${mediaTypeLabel(asset.media_type)}`)
      .on('click', (event) => {
        event.originalEvent.stopPropagation();
        media.selectAsset(asset.id);
      })
      .addTo(assetLayer!);
  });
}

function handleMapClick(event: L.LeafletMouseEvent) {
  Object.assign(draft, blankDraft(), {
    latitude: Number(event.latlng.lat.toFixed(6)),
    longitude: Number(event.latlng.lng.toFixed(6)),
    address: `Ponto capturado (${event.latlng.lat.toFixed(4)}, ${event.latlng.lng.toFixed(4)})`,
  });
  media.selectAsset(null);
  renderAssets();
  mode.value = 'form';
}

function focusAsset(asset: MediaAsset) {
  renderAssets();
  if (!map) return;
  map.setView([asset.latitude, asset.longitude], Math.max(map.getZoom(), 15), { animate: true });
}

async function saveDraft() {
  if (!draft.address.trim()) return;
  await media.createAsset({
    ...draft,
    width_m: draft.width_m || null,
    top_height_m: draft.top_height_m || null,
    justification: draft.justification || null,
    contact_name: draft.contact_name || null,
    contact_email: draft.contact_email || null,
  });
  Object.assign(draft, blankDraft());
  mode.value = 'analysis';
}

async function saveDecision() {
  if (!selectedAsset.value) return;
  await media.updateAsset(selectedAsset.value.id, {
    status: reviewStatus.value,
    justification: reviewJustification.value || null,
  });
}
</script>
