<template>
  <section class="view-stack">
    <div class="view-header">
      <div>
        <h2>Mapa GIS</h2>
        <p>Campo Grande, MS</p>
      </div>
    </div>
    <div class="map-layout">
    <v-card border class="map-panel">
      <div class="map-topbar">
        <div>
          <strong>Mapa GIS · Campo Grande, MS</strong>
          <span v-if="mapState.loading">Atualizando mapa...</span>
          <span v-else-if="mapState.error">Não foi possível carregar o mapa</span>
          <span v-else>{{ mapState.total }} ativo(s) na área visível{{ mapState.tooMany ? ' · agrupados' : '' }}</span>
        </div>
        <div class="map-filters">
          <v-select
            v-model="companyFilter"
            :items="companyFilterOptions"
            label="Filtrar empresa"
            hide-details
            class="map-filter map-filter--company"
          />
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
      <v-alert v-if="mapState.error" type="error" variant="tonal" density="compact" class="ma-2">
        {{ mapState.error }}
        <v-btn variant="text" size="small" @click="refreshMap">Tentar novamente</v-btn>
      </v-alert>
    </v-card>

    <aside ref="sideStack" class="side-stack">
      <v-btn-toggle v-model="mode" mandatory divided density="comfortable" class="w-100">
        <v-btn value="analysis" class="flex-1">Análise</v-btn>
        <v-btn v-if="auth.canWrite" value="form" class="flex-1" :disabled="Boolean(selectedAsset)">Cadastro</v-btn>
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
          <v-select
            v-if="draftAreaThreshold != null"
            v-model="draft.area_rule_classification"
            :label="`O painel possui área superior ao limite de ${draftAreaThreshold} m²?`"
            :items="[{ title: 'Não', value: 'within_limit' }, { title: 'Sim', value: 'above_limit' }]"
            :rules="[required]"
          />
          <v-text-field
            v-model="draft.expiration_date"
            label="Vencimento da autorização"
            type="date"
            hint="Opcional"
            persistent-hint
          />
          <v-alert v-if="draftAreaThreshold == null || draft.area_rule_classification" color="primary" variant="tonal" density="compact">
            Raio calculado: {{ getRequiredRadius(draft.media_type, draft.area_m2, media.rules, draft.area_rule_classification) }}m
          </v-alert>
          <v-btn color="primary" type="submit" block :loading="media.saving" :disabled="!draftValid">
            Adicionar e Mapear
          </v-btn>
        </v-form>
      </v-card>

      <v-card v-else border class="analysis-card" :class="{ 'analysis-card--selected': selectedAsset }">
        <template v-if="selectedAsset">
          <div class="analysis-card-header selected-header">
            <div>
              <v-chip size="small" color="primary" variant="tonal" class="process-code">{{ selectedAsset.official_process_code || selectedAsset.process_code }}</v-chip>
              <h3>{{ selectedAsset.address }}</h3>
              <span>{{ selectedAsset.district }} · {{ mediaTypeLabel(selectedAsset.media_type) }}</span>
            </div>
            <div class="selected-header-actions">
              <v-chip :color="statusColor(selectedAsset.status)" variant="tonal" class="status-chip">
                {{ statusLabel(selectedAsset.status) }}
              </v-chip>
              <v-btn icon="mdi-close" size="small" variant="text" title="Fechar detalhes" aria-label="Fechar detalhes" @click="mapState.selectAsset(null, auth.canWrite)" />
            </div>
          </div>

          <div ref="detailScrollElement" class="analysis-card-body">
          <h4 class="detail-section-title">Dados do processo</h4>
          <div class="spec-grid">
            <div><span>{{ selectedAsset.official_process_code ? 'Processo oficial' : 'Protocolo' }}</span><strong class="process-code">{{ selectedAsset.official_process_code || selectedAsset.process_code }}</strong></div>
            <div v-if="selectedAsset.official_process_code"><span>Protocolo de origem</span><strong class="process-code">{{ selectedAsset.process_code }}</strong></div>
            <div><span>Status</span><strong>{{ statusLabel(selectedAsset.status) }}</strong></div>
            <div><span>Criado em</span><strong>{{ formatDateTime(selectedAsset.created_at) }}</strong></div>
            <div><span>Atualizado em</span><strong>{{ formatDateTime(selectedAsset.updated_at) }}</strong></div>
            <div v-if="selectedAsset.justification" class="detail-wide">
              <span>Justificativa / análise</span><strong>{{ selectedAsset.justification }}</strong>
            </div>
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

          <v-alert v-if="mapState.formLoading && auth.canWrite" type="info" variant="tonal" density="compact" class="mt-4">
            Carregando dados da solicitação e anexos...
          </v-alert>
          <v-alert v-if="mapState.formError && auth.canWrite" type="warning" variant="tonal" density="compact" class="mt-4">
            {{ mapState.formError }}
            <v-btn variant="text" size="small" @click="mapState.refreshSelected(auth.canWrite)">Tentar novamente</v-btn>
          </v-alert>

          <h4 v-if="selectedForm || selectedAsset.company_responsible || selectedAsset.contact_name || selectedAsset.contact_email" class="detail-section-title">Requerente / empresa</h4>
          <div v-if="selectedForm || selectedAsset.company_responsible || selectedAsset.contact_name || selectedAsset.contact_email" class="spec-grid">
            <div v-if="selectedForm?.company_responsible || selectedAsset.company_responsible || selectedAsset.contact_name">
              <span>Empresa / responsável</span>
              <strong>{{ selectedForm?.company_responsible || selectedAsset.company_responsible || selectedAsset.contact_name }}</strong>
            </div>
            <div v-if="selectedAsset.contact_name && selectedAsset.contact_name !== (selectedForm?.company_responsible || selectedAsset.company_responsible)">
              <span>Contato</span><strong>{{ selectedAsset.contact_name }}</strong>
            </div>
            <div v-if="selectedForm?.company_cnpj || selectedAsset.company_cnpj">
              <span>CNPJ</span><strong>{{ formatCompanyCnpj(selectedForm?.company_cnpj || selectedAsset.company_cnpj) }}</strong>
            </div>
            <div v-if="selectedForm?.municipal_registration">
              <span>Inscrição municipal</span><strong>{{ selectedForm.municipal_registration }}</strong>
            </div>
            <div v-if="selectedForm?.requester_email || selectedAsset.contact_email">
              <span>E-mail</span><strong>{{ selectedForm?.requester_email || selectedAsset.contact_email }}</strong>
            </div>
          </div>

          <h4 class="detail-section-title">Local de instalação</h4>
          <div class="spec-grid">
            <div v-if="selectedForm?.property_registration">
              <span>Inscrição imobiliária</span><strong>{{ selectedForm.property_registration }}</strong>
            </div>
            <div class="detail-wide">
              <span>Endereço</span><strong>{{ selectedForm ? `${selectedForm.street}, ${selectedForm.number}` : selectedAsset.address }}</strong>
            </div>
            <div><span>Bairro</span><strong>{{ selectedForm?.district || selectedAsset.district }}</strong></div>
            <div v-if="selectedForm?.postal_code"><span>CEP</span><strong>{{ selectedForm.postal_code }}</strong></div>
            <div><span>Latitude</span><strong>{{ selectedAsset.latitude.toFixed(6) }}</strong></div>
            <div><span>Longitude</span><strong>{{ selectedAsset.longitude.toFixed(6) }}</strong></div>
          </div>

          <h4 class="detail-section-title">Veículo de comunicação</h4>
          <div class="spec-grid">
            <div><span>Tipo</span><strong>{{ mediaTypeLabel(selectedAsset.media_type) }}</strong></div>
            <div v-if="selectedForm?.number_of_faces"><span>Quantidade de faces</span><strong>{{ selectedForm.number_of_faces }}</strong></div>
            <div v-if="selectedAsset.width_m != null">
              <span>Largura</span>
              <strong>{{ selectedAsset.width_m }} m</strong>
            </div>
            <div v-if="selectedAsset.top_height_m != null">
              <span>Borda superior</span>
              <strong>{{ selectedAsset.top_height_m }} m</strong>
            </div>
            <div>
              <span>Raio</span>
              <strong>{{ selectedAsset.radius_meters }} m</strong>
            </div>
            <div v-if="selectedAsset.expiration_date">
              <span>Vencimento</span>
              <strong>{{ formatDate(selectedAsset.expiration_date) }}</strong>
            </div>
          </div>

          <template v-if="formDocuments.length || formImages.length || selectedAttachmentLinks.length">
            <h4 class="detail-section-title">Anexos / documentos</h4>
            <div v-if="formDocuments.length" class="detail-attachment-list">
              <div v-for="attachment in formDocuments" :key="attachment.id" class="detail-attachment-item">
                <div>
                  <strong>{{ attachmentCategoryLabel(attachment.category) }}</strong>
                  <span>{{ attachment.original_filename }}</span>
                </div>
                <v-btn size="small" variant="tonal" prepend-icon="mdi-open-in-new" @click="openUploadedAttachment(attachment)">Visualizar / baixar</v-btn>
              </div>
            </div>
            <h4 v-if="formImages.length" class="detail-section-title">Fotos / imagens</h4>
            <div v-if="formImages.length" class="detail-attachment-list">
              <div v-for="attachment in formImages" :key="attachment.id" class="detail-attachment-item">
                <div>
                  <strong>{{ attachmentCategoryLabel(attachment.category) }}</strong>
                  <span>{{ attachment.original_filename }}</span>
                </div>
                <v-btn size="small" variant="tonal" prepend-icon="mdi-image-outline" @click="openUploadedAttachment(attachment)">Visualizar / baixar</v-btn>
              </div>
            </div>
            <div v-if="selectedAttachmentLinks.length" class="detail-attachment-list mt-3">
              <div v-for="(link, index) in selectedAttachmentLinks" :key="`${link}-${index}`" class="detail-attachment-item">
                <span>Link de anexo {{ index + 1 }}</span>
                <v-btn :href="link" target="_blank" rel="noopener noreferrer" size="small" variant="tonal" prepend-icon="mdi-open-in-new">Abrir</v-btn>
              </div>
            </div>
          </template>

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
          </div>
        </template>

        <div v-else class="empty-state compact analysis-card-empty">
          <v-icon icon="mdi-map-marker-question-outline" size="44" />
          <span>{{ mapState.selectedLoading ? 'Carregando veículo...' : 'Selecione um marcador no mapa para analisar.' }}</span>
        </div>
      </v-card>
    </aside>
    </div>

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
import { useRoute } from 'vue-router';

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
import { useMapStore } from '../stores/map';
import { useAuthStore } from '../stores/auth';
import type { ApplicationFormAttachment, MediaAsset, MediaAssetInput, MediaStatus, MediaType } from '../types';
import { attachmentCategoryLabel, openApplicationFormAttachment } from '../utils/application-form-attachments';
import { joinAttachmentLinks, normalizeAttachmentLink, parseAttachmentLinks } from '../utils/attachment-links';
import { formatDate, formatDateTime } from '../utils/format';
import { createMapAssetLayerRenderer } from '../utils/map-asset-layers';
import { clusterZoom, createViewportScheduler, readMapViewport } from '../utils/map-viewport';

const CAMPO_GRANDE_CENTER: [number, number] = [-20.464, -54.612];
const PUBLIC_PROPERTIES_URL = `${import.meta.env.BASE_URL}mapas/imoveis-publicos.geojson`;
const PUBLIC_PROPERTIES_COLOR = '#f57c00';

const media = useMediaStore();
const mapState = useMapStore();
const auth = useAuthStore();
const route = useRoute();
const mapElement = ref<HTMLElement | null>(null);
const sideStack = ref<HTMLElement | null>(null);
const detailScrollElement = ref<HTMLElement | null>(null);
const companyFilter = ref('all');
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

let map: L.Map | null = null;
let assetLayer: L.LayerGroup | null = null;
let assetLayerRenderer: ReturnType<typeof createMapAssetLayerRenderer> | null = null;
let publicPropertiesLayer: L.GeoJSON | null = null;
let publicPropertiesRenderer: L.Canvas | null = null;
let publicPropertiesRequest: AbortController | null = null;
const viewportScheduler = createViewportScheduler(loadViewport);

const companyFilterOptions = computed(() => [
  { title: 'Todas as empresas', value: 'all' },
  ...mapState.companyOptions.map((name) => ({ title: name, value: name })),
]);

const typeFilterOptions = computed(() => [
  { title: 'Todos os tipos', value: 'all' },
  ...MEDIA_TYPE_OPTIONS,
]);

const registrationMediaTypeOptions = computed(() => mediaTypeOptionsFromRules(media.rules));
const draftAreaThreshold = computed(() => media.rules.find(
  (rule) => rule.media_type === draft.media_type && rule.is_active,
)?.area_threshold_m2 ?? null);
watch(() => draft.media_type, () => { draft.area_rule_classification = null; });

const statusFilterOptions = computed(() => [
  { title: 'Todos os status', value: 'all' },
  ...STATUS_OPTIONS,
]);

const selectedAsset = computed(() => mapState.selectedAsset);
const selectedForm = computed(() => mapState.selectedForm);
const formImages = computed(() => selectedForm.value?.attachments.filter((item) => item.content_type.startsWith('image/')) ?? []);
const formDocuments = computed(() => selectedForm.value?.attachments.filter((item) => !item.content_type.startsWith('image/')) ?? []);
const selectedAttachmentLinks = computed(() => [...new Set([
  ...parseAttachmentLinks(selectedForm.value?.attachment_links),
  ...parseAttachmentLinks(selectedAsset.value?.attachment_links),
])].filter((link) => /^https?:\/\//i.test(link)));

const analysis = computed(() => (
  selectedAsset.value ? media.analysisByAssetId[selectedAsset.value.id] : null
));

watch(() => [mapState.items, mapState.clusters, mapState.selectedAssetId], renderAssets);

watch([companyFilter, typeFilter, statusFilter], scheduleViewportLoad);

watch(() => route.query.asset, (id) => {
  if (typeof id === 'string' && id !== mapState.selectedAssetId) void mapState.selectAsset(id, auth.canWrite);
});

watch(companyFilterOptions, (options) => {
  if (options.some((option) => option.value === companyFilter.value)) return;
  companyFilter.value = 'all';
});

watch(() => mapState.selectedAssetId, async () => {
  await nextTick();
  if (detailScrollElement.value) detailScrollElement.value.scrollTop = 0;
});

watch(selectedAsset, (asset) => {
  if (!asset) return;
  if (asset.status === 'novos processos') {
    delete media.analysisByAssetId[asset.id];
  } else {
    void media.analyzeAsset(asset.id).catch(() => undefined);
  }
  mode.value = 'analysis';
  reviewStatus.value = asset.status === 'novos processos' ? 'análise' : asset.status;
  reviewJustification.value = asset.justification ?? '';
  resetReviewAttachmentLinks(asset.attachment_links);
  focusAsset(asset);
}, { immediate: true });

onMounted(async () => {
  void mapState.loadCompanyOptions();
  window.addEventListener('geomidia:map-refresh', refreshMap);
  await nextTick();
  if (!mapElement.value) return;
  if (sideStack.value) L.DomEvent.disableScrollPropagation(sideStack.value);

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
  assetLayerRenderer = createMapAssetLayerRenderer({
    leaflet: L,
    layer: assetLayer,
    onAssetClick: selectMapAsset,
    onClusterClick: (cluster, event) => {
      event.originalEvent.stopPropagation();
      map?.setView([cluster.latitude, cluster.longitude], clusterZoom(map?.getZoom() ?? 0));
    },
  });
  map.on('click', handleMapClick);
  map.on('moveend zoomend', scheduleViewportLoad);
  renderAssets();
  const queryAsset = route.query.asset;
  if (typeof queryAsset === 'string') void mapState.selectAsset(queryAsset, auth.canWrite);
  setTimeout(() => {
    map?.invalidateSize();
    scheduleViewportLoad();
  }, 120);
});

onUnmounted(() => {
  viewportScheduler.cancel();
  window.removeEventListener('geomidia:map-refresh', refreshMap);
  mapState.invalidate();
  publicPropertiesRequest?.abort();
  map?.remove();
  map = null;
  assetLayer = null;
  assetLayerRenderer = null;
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

function currentViewport() {
  return map ? readMapViewport(map) : null;
}

function loadViewport() {
  const viewport = currentViewport();
  if (!viewport) return;
  void mapState.loadViewport(viewport, currentFilters());
}

function currentFilters() {
  return {
    company: companyFilter.value === 'all' ? undefined : companyFilter.value,
    mediaType: typeFilter.value === 'all' ? undefined : typeFilter.value,
    status: statusFilter.value === 'all' ? undefined : statusFilter.value,
  };
}

function scheduleViewportLoad() {
  const viewport = currentViewport();
  if (!viewport) return;
  if (mapState.stageViewport(viewport, currentFilters())) viewportScheduler.schedule();
}

function refreshMap() {
  viewportScheduler.cancel();
  const viewport = currentViewport();
  if (viewport) void mapState.loadViewport(viewport, currentFilters(), true);
}

function blankDraft(): MediaAssetInput {
  return {
    media_type: 'outdoor',
    address: '',
    district: 'Centro',
    latitude: CAMPO_GRANDE_CENTER[0],
    longitude: CAMPO_GRANDE_CENTER[1],
    area_m2: null,
    area_rule_classification: null,
    width_m: 9,
    bottom_height_m: null,
    top_height_m: null,
    expiration_date: null,
    status: 'novos processos',
    justification: '',
    attachment_links: '',
    contact_name: '',
    contact_email: '',
  };
}

function formatCompanyCnpj(value: string | null | undefined): string {
  const raw = String(value ?? '').trim();
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 14) return raw || 'nao informado';
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
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
  assetLayerRenderer?.render(mapState.items, mapState.clusters, mapState.tooMany, mapState.selectedAssetId);
}

function selectMapAsset(assetId: string, event: L.LeafletMouseEvent) {
  event.originalEvent.stopPropagation();
  mode.value = 'analysis';
  void mapState.selectAsset(assetId, auth.canWrite);
}

function handleMapClick(event: L.LeafletMouseEvent) {
  if (!auth.canWrite || (mode.value !== 'form' && selectedAsset.value)) return;
  Object.assign(draft, blankDraft(), {
    latitude: Number(event.latlng.lat.toFixed(6)),
    longitude: Number(event.latlng.lng.toFixed(6)),
    address: `Ponto capturado (${event.latlng.lat.toFixed(4)}, ${event.latlng.lng.toFixed(4)})`,
  });
  void mapState.selectAsset(null, auth.canWrite);
  mode.value = 'form';
}

function focusAsset(asset: MediaAsset) {
  if (!map) return;
  map.setView([asset.latitude, asset.longitude], Math.max(map.getZoom(), 15), { animate: true });
}

async function openUploadedAttachment(attachment: ApplicationFormAttachment) {
  const formId = selectedForm.value?.id;
  if (!formId) return;
  try {
    await openApplicationFormAttachment(formId, attachment.id);
  } catch (error) {
    media.error = error instanceof Error ? error.message : 'Falha ao abrir o anexo.';
  }
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
    refreshMap();
    void mapState.loadCompanyOptions();
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
    await mapState.refreshSelected(auth.canWrite);
    refreshMap();
  } catch {
    // O store publica conflitos e erros no alerta global.
  }
}

async function startSelectedAnalysis() {
  if (!selectedAsset.value || selectedAsset.value.status !== 'novos processos') return;
  try {
    await media.startAnalysis(selectedAsset.value.id);
    await mapState.refreshSelected(auth.canWrite);
    refreshMap();
  } catch {
    // O store publica o erro no alerta global.
  }
}

async function deleteSelected() {
  if (!selectedAsset.value) return;
  try {
    await media.deleteAsset(selectedAsset.value.id);
    void mapState.selectAsset(null, auth.canWrite);
    refreshMap();
    void mapState.loadCompanyOptions();
    confirmDelete.value = false;
  } catch {
    // O store publica o erro no alerta global.
  }
}
</script>
