<template>
  <section class="map-layout">
    <v-card border class="map-panel">
      <div class="map-topbar">
        <div>
          <strong>Mapa GIS · Campo Grande, MS</strong>
          <span>{{ filteredAssets.length }} ativo(s) exibido(s)</span>
        </div>
        <div class="map-filters">
          <v-select
            v-model="typeFilter"
            :items="typeFilterOptions"
            label="Filtrar tipo"
            hide-details
            class="map-filter"
          />
          <v-select
            v-model="statusFilter"
            :items="statusFilterOptions"
            label="Filtrar status"
            hide-details
            class="map-filter"
          />
        </div>
      </div>
      <div ref="mapElement" class="leaflet-map" />
    </v-card>

    <aside class="side-stack">
      <v-btn-toggle v-model="mode" mandatory divided density="comfortable" class="w-100">
        <v-btn value="analysis" class="flex-1">Análise</v-btn>
        <v-btn v-if="auth.canWrite" value="form" class="flex-1">Cadastro</v-btn>
      </v-btn-toggle>

      <v-card v-if="mode === 'form'" border class="pa-5">
        <div class="card-title-row">
          <h3>Novo Ponto</h3>
          <v-chip size="small" color="primary" variant="tonal">
            {{ draft.latitude.toFixed(5) }}, {{ draft.longitude.toFixed(5) }}
          </v-chip>
        </div>

        <v-form v-model="draftValid" class="stack-form" @submit.prevent="saveDraft">
          <v-select v-model="draft.media_type" :items="registrationMediaTypeOptions" label="Tipo" />
          <v-text-field v-model="draft.address" label="Endereço" :rules="[required]" />
          <v-select v-model="draft.district" :items="DISTRICT_OPTIONS" label="Bairro" />
          <div class="two-cols">
            <v-text-field v-model.number="draft.area_m2" label="Área (m²)" type="number" min="0.01" :rules="[positive]" />
            <v-text-field v-model.number="draft.bottom_height_m" label="Altura (m)" type="number" min="0" :rules="[nonNegative]" />
          </div>
          <v-text-field
            v-model="draft.expiration_date"
            label="Vencimento da autorização"
            type="date"
            hint="Opcional"
            persistent-hint
          />
          <v-alert color="primary" variant="tonal" density="compact">
            Raio calculado: {{ getRequiredRadius(draft.media_type, draft.area_m2, media.rules) }}m
          </v-alert>
          <v-btn color="primary" type="submit" block :loading="media.saving" :disabled="!draftValid">
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
              {{ statusLabel(selectedAsset.status) }}
            </v-chip>
          </div>

          <v-alert
            v-if="selectedAsset.status === 'novos processos'"
            type="info"
            variant="tonal"
            class="my-4"
          >
            Este processo é novo. Inicie a análise para calcular conflitos e liberar as demais situações.
          </v-alert>
          <v-alert
            v-else
            :type="analysis?.has_conflict ? 'error' : 'success'"
            variant="tonal"
            class="my-4"
          >
            {{ media.analyzing ? 'Analisando viabilidade territorial...' : (analysis?.message ?? 'Análise indisponível.') }}
          </v-alert>

          <v-list v-if="selectedAsset.status !== 'novos processos' && analysis?.conflicts.length" density="compact" class="mb-3">
            <v-list-item
              v-for="conflict in analysis.conflicts"
              :key="conflict.conflicting_asset_id"
              :title="conflict.process_code"
              :subtitle="`${Math.round(conflict.distance_meters)}m de distância · mínimo ${conflict.minimum_distance_meters}m`"
              prepend-icon="mdi-alert-circle-outline"
            />
          </v-list>

          <div class="spec-grid">
            <div>
              <span>Área</span>
              <strong>{{ selectedAsset.area_m2 }} m²</strong>
            </div>
            <div>
              <span>Altura</span>
              <strong>{{ selectedAsset.bottom_height_m }} m</strong>
            </div>
            <div v-if="selectedAsset.width_m">
              <span>Largura</span>
              <strong>{{ selectedAsset.width_m }} m</strong>
            </div>
            <div v-if="selectedAsset.top_height_m">
              <span>Borda superior</span>
              <strong>{{ selectedAsset.top_height_m }} m</strong>
            </div>
            <div>
              <span>Raio</span>
              <strong>{{ selectedAsset.radius_meters }} m</strong>
            </div>
            <div>
              <span>Coordenadas</span>
              <strong>{{ selectedAsset.latitude.toFixed(4) }}, {{ selectedAsset.longitude.toFixed(4) }}</strong>
            </div>
            <div v-if="selectedAsset.expiration_date">
              <span>Vencimento</span>
              <strong>{{ formatDate(selectedAsset.expiration_date) }}</strong>
            </div>
            <div v-if="selectedAsset.contact_name">
              <span>Contato</span>
              <strong>{{ selectedAsset.contact_name }}</strong>
            </div>
            <div v-if="selectedAsset.contact_email">
              <span>E-mail</span>
              <strong>{{ selectedAsset.contact_email }}</strong>
            </div>
          </div>

          <v-divider class="my-4" />

          <v-btn
            v-if="auth.canWrite && selectedAsset.status === 'novos processos'"
            color="info"
            prepend-icon="mdi-play-circle-outline"
            block
            :loading="media.saving"
            @click="startSelectedAnalysis"
          >
            Iniciar Análise
          </v-btn>
          <template v-else-if="auth.canWrite">
            <v-select v-model="reviewStatus" :items="DECISION_STATUS_OPTIONS" label="Decisão" />
            <v-textarea
              v-model="reviewJustification"
              label="Justificativa"
              rows="3"
            />
            <div class="attachment-crud mt-2">
              <div class="attachment-crud-header">
                <strong>Links de anexos</strong>
                <span>Fotos, PDFs e arquivos relacionados</span>
              </div>
              <div class="attachment-crud-row">
                <v-text-field
                  v-model="reviewAttachmentLinkDraft"
                  label="Adicionar link"
                  placeholder="https://..."
                  hide-details
                  @keydown.enter.prevent="addReviewAttachmentLink"
                />
                <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="addReviewAttachmentLink">
                  Adicionar
                </v-btn>
              </div>
              <div v-if="reviewAttachmentLinks.length" class="attachment-link-list">
                <div
                  v-for="(link, index) in reviewAttachmentLinks"
                  :key="`${link}-${index}`"
                  class="attachment-link-item"
                >
                  <v-btn
                    :href="link"
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="text"
                    density="comfortable"
                    prepend-icon="mdi-open-in-new"
                    class="attachment-link-button"
                  >
                    {{ link }}
                  </v-btn>
                  <v-btn
                    icon="mdi-close"
                    size="small"
                    variant="text"
                    color="error"
                    title="Remover link"
                    @click="removeReviewAttachmentLink(index)"
                  />
                </div>
              </div>
              <div v-else class="attachment-link-empty">Nenhum link adicionado ainda.</div>
            </div>
            <v-btn color="primary" block :loading="media.saving" :disabled="media.analyzing" @click="saveDecision">
              Salvar Decisão
            </v-btn>
          </template>
          <v-btn
            v-if="auth.canDelete"
            color="error"
            variant="text"
            prepend-icon="mdi-trash-can-outline"
            class="mt-2"
            @click="confirmDelete = true"
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

    <v-dialog v-model="confirmDelete" max-width="440">
      <v-card title="Confirmar exclusão">
        <v-card-text>Deseja excluir permanentemente o ponto selecionado?</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmDelete = false">Cancelar</v-btn>
          <v-btn color="error" :loading="media.saving" @click="deleteSelected">Excluir</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script setup lang="ts">
import L from 'leaflet';
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';

import {
  DECISION_STATUS_OPTIONS,
  DISTRICT_OPTIONS,
  MEDIA_TYPE_OPTIONS,
  STATUS_OPTIONS,
  getRequiredRadius,
  mediaTypeColor,
  mediaTypeOptionsFromRules,
  mediaTypeLabel,
  statusLabel,
  statusColor,
} from '../domain/rules';
import { useMediaStore } from '../stores/media';
import { useAuthStore } from '../stores/auth';
import type { MediaAsset, MediaAssetInput, MediaStatus, MediaType } from '../types';
import { joinAttachmentLinks, normalizeAttachmentLink, parseAttachmentLinks } from '../utils/attachment-links';
import { formatDate } from '../utils/format';

const CAMPO_GRANDE_CENTER: [number, number] = [-20.464, -54.612];
const PUBLIC_PROPERTIES_URL = `${import.meta.env.BASE_URL}mapas/imoveis-publicos.geojson`;
const PUBLIC_PROPERTIES_COLOR = '#f57c00';

const media = useMediaStore();
const auth = useAuthStore();
const mapElement = ref<HTMLElement | null>(null);
const typeFilter = ref<MediaType | 'all'>('all');
const statusFilter = ref<MediaStatus | 'all'>('all');
const mode = ref<'analysis' | 'form'>('analysis');
const reviewStatus = ref<MediaStatus>('aprovado');
const reviewJustification = ref('');
const reviewAttachmentLinkDraft = ref('');
const reviewAttachmentLinks = ref<string[]>([]);
const draft = reactive<MediaAssetInput>(blankDraft());
const draftValid = ref(false);
const confirmDelete = ref(false);
const required = (value: string) => Boolean(value?.trim()) || 'Campo obrigatório.';
const positive = (value: number) => Number(value) > 0 || 'Informe um valor maior que zero.';
const nonNegative = (value: number) => Number(value) >= 0 || 'Informe um valor igual ou maior que zero.';

let map: L.Map | null = null;
let assetLayer: L.LayerGroup | null = null;
let publicPropertiesLayer: L.GeoJSON | null = null;
let publicPropertiesRenderer: L.Canvas | null = null;
let publicPropertiesRequest: AbortController | null = null;

const typeFilterOptions = computed(() => [
  { title: 'Todos os tipos', value: 'all' },
  ...MEDIA_TYPE_OPTIONS,
]);

const registrationMediaTypeOptions = computed(() => mediaTypeOptionsFromRules(media.rules));

const statusFilterOptions = computed(() => [
  { title: 'Todos os status', value: 'all' },
  ...STATUS_OPTIONS,
]);

const filteredAssets = computed(() => media.assets.filter((asset) => (
  (typeFilter.value === 'all' || asset.media_type === typeFilter.value)
  && (statusFilter.value === 'all' || asset.status === statusFilter.value)
)));

const selectedAsset = computed(() => media.selectedAsset);

const analysis = computed(() => (
  selectedAsset.value ? media.analysisByAssetId[selectedAsset.value.id] : null
));

watch(filteredAssets, renderAssets, { deep: true });

watch(() => media.selectedAssetId, renderAssets);

watch(selectedAsset, (asset) => {
  if (!asset) return;
  mode.value = 'analysis';
  reviewStatus.value = asset.status === 'novos processos' ? 'análise' : asset.status;
  reviewJustification.value = asset.justification ?? '';
  resetReviewAttachmentLinks(asset.attachment_links);
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

  map.createPane('public-properties');
  const publicPropertiesPane = map.getPane('public-properties');
  if (publicPropertiesPane) {
    publicPropertiesPane.style.zIndex = '350';
    publicPropertiesPane.style.pointerEvents = 'none';
  }
  publicPropertiesRenderer = L.canvas({ pane: 'public-properties', padding: 0.5 });
  addPublicPropertiesLegend();
  void loadPublicProperties();

  assetLayer = L.layerGroup().addTo(map);
  map.on('click', handleMapClick);
  renderAssets();
  if (selectedAsset.value) {
    focusAsset(selectedAsset.value);
  }

  setTimeout(() => map?.invalidateSize(), 120);
});

onUnmounted(() => {
  publicPropertiesRequest?.abort();
  map?.remove();
  map = null;
  assetLayer = null;
  publicPropertiesLayer = null;
  publicPropertiesRenderer = null;
  publicPropertiesRequest = null;
});

async function loadPublicProperties() {
  publicPropertiesRequest?.abort();
  publicPropertiesRequest = new AbortController();

  try {
    const response = await fetch(PUBLIC_PROPERTIES_URL, {
      signal: publicPropertiesRequest.signal,
    });
    if (!response.ok) {
      throw new Error(`Falha ao carregar a camada de imóveis (${response.status}).`);
    }

    const geoJson = await response.json() as GeoJSON.GeoJsonObject;
    if (!map) return;

    publicPropertiesLayer = L.geoJSON(geoJson, {
      interactive: false,
      style: {
        pane: 'public-properties',
        renderer: publicPropertiesRenderer ?? undefined,
        color: PUBLIC_PROPERTIES_COLOR,
        fillColor: PUBLIC_PROPERTIES_COLOR,
        weight: 0.8,
        opacity: 0.78,
        fillOpacity: 0.16,
      },
    }).addTo(map);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    console.warn('Não foi possível exibir a camada visual de imóveis públicos.', error);
  }
}

function addPublicPropertiesLegend() {
  if (!map) return;

  const legend = new L.Control({ position: 'bottomleft' });
  legend.onAdd = () => {
    const container = L.DomUtil.create('div', 'public-properties-legend');
    const swatch = L.DomUtil.create('span', 'public-properties-legend__swatch', container);
    swatch.setAttribute('aria-hidden', 'true');
    const label = L.DomUtil.create('span', '', container);
    label.textContent = 'Imóveis públicos · PMCG + EMHA';
    return container;
  };
  legend.addTo(map);
}

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
    expiration_date: null,
    status: 'novos processos',
    justification: '',
    attachment_links: '',
    contact_name: '',
    contact_email: '',
  };
}

function resetReviewAttachmentLinks(value: string | null | undefined = '') {
  reviewAttachmentLinks.value = parseAttachmentLinks(value);
  reviewAttachmentLinkDraft.value = '';
}

function addReviewAttachmentLink() {
  const link = normalizeAttachmentLink(reviewAttachmentLinkDraft.value);
  if (!link) return;
  if (!reviewAttachmentLinks.value.includes(link)) {
    reviewAttachmentLinks.value = [...reviewAttachmentLinks.value, link];
  }
  reviewAttachmentLinkDraft.value = '';
}

function removeReviewAttachmentLink(index: number) {
  reviewAttachmentLinks.value = reviewAttachmentLinks.value.filter((_, currentIndex) => currentIndex !== index);
}

function renderAssets() {
  if (!assetLayer) return;
  assetLayer.clearLayers();

  filteredAssets.value.forEach((asset) => {
    const color = mediaTypeColor(asset.media_type);
    const latLng: L.LatLngExpression = [asset.latitude, asset.longitude];

    const radiusCircle = L.circle(latLng, {
      radius: asset.radius_meters,
      color: asset.id === media.selectedAssetId ? '#b42318' : color,
      fillColor: color,
      fillOpacity: asset.id === media.selectedAssetId ? 0.16 : 0.08,
      weight: asset.id === media.selectedAssetId ? 2 : 1,
    })
      .on('click', (event) => selectMapAsset(asset.id, event))
      .addTo(assetLayer!);

    const pointMarker = L.circleMarker(latLng, {
      radius: asset.id === media.selectedAssetId ? 9 : 7,
      color: '#ffffff',
      weight: 2,
      fillColor: color,
      fillOpacity: 1,
    })
      .bindTooltip(`${asset.process_code} · ${mediaTypeLabel(asset.media_type)}`)
      .on('click', (event) => selectMapAsset(asset.id, event))
      .addTo(assetLayer!);

    radiusCircle.bindTooltip(`${asset.process_code} · clique para analisar`);
    pointMarker.bringToFront();
  });
}

function selectMapAsset(assetId: string, event: L.LeafletMouseEvent) {
  event.originalEvent.stopPropagation();
  mode.value = 'analysis';
  media.selectAsset(assetId);
}

function handleMapClick(event: L.LeafletMouseEvent) {
  if (!auth.canWrite) {
    media.selectAsset(null);
    return;
  }
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
  if (!draftValid.value || !draft.address.trim()) return;
  try {
    await media.createAsset({
      ...draft,
      width_m: draft.width_m || null,
      top_height_m: draft.top_height_m || null,
      expiration_date: draft.expiration_date || null,
      justification: draft.justification || null,
      attachment_links: null,
      contact_name: draft.contact_name || null,
      contact_email: draft.contact_email || null,
    });
    Object.assign(draft, blankDraft());
    mode.value = 'analysis';
  } catch {
    // O store publica o erro no alerta global.
  }
}

async function saveDecision() {
  if (!selectedAsset.value || selectedAsset.value.status === 'novos processos') return;
  try {
    await media.updateAsset(selectedAsset.value.id, {
      status: reviewStatus.value,
      justification: reviewJustification.value || null,
      attachment_links: joinAttachmentLinks(reviewAttachmentLinks.value) || null,
    });
  } catch {
    // O store publica conflitos e erros no alerta global.
  }
}

async function startSelectedAnalysis() {
  if (!selectedAsset.value || selectedAsset.value.status !== 'novos processos') return;
  try {
    await media.startAnalysis(selectedAsset.value.id);
  } catch {
    // O store publica o erro no alerta global.
  }
}

async function deleteSelected() {
  if (!selectedAsset.value) return;
  try {
    await media.deleteAsset(selectedAsset.value.id);
    confirmDelete.value = false;
  } catch {
    // O store publica o erro no alerta global.
  }
}
</script>
