<template>
  <section class="flex flex-col lg:h-[calc(100dvh-var(--shell-top,4rem)-4rem)]">
    <PageHeader title="Mapa GIS">
      <template #description>
        <span v-if="mapState.loading">Atualizando mapa...</span>
        <span v-else-if="mapState.error">Não foi possível carregar o mapa.</span>
        <span v-else>
          <span class="tabular font-medium text-foreground">{{ mapState.total }}</span>
          {{ mapState.total === 1 ? 'ativo na área visível' : 'ativos na área visível' }}{{ mapState.tooMany ? ', agrupados por região' : '' }}.
        </span>
      </template>
      <template #actions>
        <div class="grid w-full gap-2 md:w-auto md:grid-cols-3">
          <Select v-model="companyFilter">
            <SelectTrigger class="w-full md:w-48" aria-label="Filtrar por empresa"><SelectValue /></SelectTrigger>
            <SelectContent class="max-h-72">
              <SelectItem v-for="option in companyFilterOptions" :key="option.value" :value="option.value">{{ option.title }}</SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="typeFilter">
            <SelectTrigger class="w-full md:w-48" aria-label="Filtrar por tipo"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="option in typeFilterOptions" :key="option.value" :value="option.value">{{ option.title }}</SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="statusFilter">
            <SelectTrigger class="w-full md:w-44" aria-label="Filtrar por status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="option in statusFilterOptions" :key="option.value" :value="option.value">{{ option.title }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </template>
    </PageHeader>

    <div class="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_25rem]">
      <div class="relative isolate overflow-hidden rounded-lg border bg-card">
        <div ref="mapElement" class="h-[60dvh] w-full lg:h-full" />
        <div
          v-if="mapState.error"
          class="absolute inset-x-3 top-3 z-[1000] flex flex-wrap items-center gap-3 rounded-md bg-card px-4 py-3 text-sm shadow-md"
          role="alert"
        >
          <CircleAlert class="size-4 text-destructive" aria-hidden="true" />
          <span class="flex-1">{{ mapState.error }}</span>
          <Button variant="outline" size="sm" @click="refreshMap">Tentar novamente</Button>
        </div>
      </div>

      <aside ref="sideStack" class="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card" aria-label="Painel do mapa">
        <div v-if="auth.canWrite" class="grid grid-cols-2 gap-1 border-b bg-muted/50 p-1.5" role="tablist" aria-label="Modo do painel">
          <button
            v-for="tab in panelTabs"
            :key="tab.value"
            type="button"
            role="tab"
            :aria-selected="mode === tab.value"
            :disabled="tab.value === 'form' && Boolean(selectedAsset)"
            :title="tab.value === 'form' && selectedAsset ? 'Feche o ativo selecionado para cadastrar um novo ponto' : undefined"
            :class="cn(
              'h-9 rounded-md text-base font-medium text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
              mode === tab.value ? 'bg-card text-foreground shadow-xs' : 'hover:text-foreground',
            )"
            @click="mode = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>

        <form v-if="mode === 'form'" class="grid content-start gap-4 overflow-y-auto p-5" novalidate @submit.prevent="saveDraft">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="font-semibold">Novo ponto</h2>
            <span class="tabular rounded-full bg-secondary px-2.5 py-0.5 text-sm text-primary">
              {{ draft.latitude.toFixed(5) }}, {{ draft.longitude.toFixed(5) }}
            </span>
          </div>
          <FormField v-slot="{ id }" label="Tipo de veículo">
            <Select v-model="draft.media_type">
              <SelectTrigger :id="id" class="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in registrationMediaTypeOptions" :key="option.value" :value="option.value">{{ option.title }}</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField v-slot="{ id, invalid }" label="Endereço" required :error="draftAttempted && !draft.address.trim() ? 'Informe o endereço.' : null">
            <Input :id="id" v-model="draft.address" :aria-invalid="invalid || undefined" />
          </FormField>
          <FormField v-slot="{ id }" label="Bairro">
            <Select v-model="draft.district">
              <SelectTrigger :id="id" class="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent class="max-h-72">
                <SelectItem v-for="district in DISTRICT_OPTIONS" :key="district" :value="district">{{ district }}</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <fieldset v-if="draftAreaThreshold != null" class="grid gap-2">
            <legend class="text-sm font-medium">
              O painel tem área maior que <span class="tabular">{{ draftAreaThreshold }}</span> m²?<span class="text-destructive" aria-hidden="true"> *</span>
            </legend>
            <div class="flex gap-2">
              <label
                v-for="option in AREA_OPTIONS"
                :key="option.value"
                class="flex h-10 cursor-pointer items-center gap-2 rounded-md border px-4 has-[:checked]:border-primary has-[:checked]:bg-secondary has-[:checked]:text-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              >
                <input v-model="draft.area_rule_classification" type="radio" name="draft-area-rule" :value="option.value" class="accent-[var(--brand-navy)]" />
                {{ option.title }}
              </label>
            </div>
            <p v-if="draftAttempted && !draft.area_rule_classification" class="text-sm text-destructive">Responda se a área passa do limite.</p>
          </fieldset>
          <FormField v-slot="{ id }" label="Vencimento da autorização" hint="Opcional">
            <Input :id="id" :model-value="draft.expiration_date ?? ''" type="date" @update:model-value="draft.expiration_date = String($event) || null" />
          </FormField>
          <p v-if="draftAreaThreshold == null || draft.area_rule_classification" class="flex gap-3 rounded-md bg-secondary px-4 py-3 text-sm text-foreground">
            <Ruler class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>Raio calculado: <strong class="tabular">{{ getRequiredRadius(draft.media_type, draft.area_m2, media.rules, draft.area_rule_classification) }} m</strong></span>
          </p>
          <Button type="submit" class="w-full" :disabled="media.saving">
            <LoaderCircle v-if="media.saving" class="animate-spin" />
            <MapPinPlus v-else />
            Adicionar ao mapa
          </Button>
        </form>

        <template v-else-if="selectedAsset">
          <header class="flex items-start gap-3 border-b p-5">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-semibold">{{ selectedAsset.official_process_code || selectedAsset.process_code }}</p>
                <StatusBadge :status="selectedAsset.status" />
              </div>
              <p class="mt-1 truncate" :title="selectedAsset.address">{{ selectedAsset.address }}</p>
              <p class="text-sm text-muted-foreground">{{ selectedAsset.district }}, {{ mediaTypeLabel(selectedAsset.media_type) }}</p>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label="Fechar detalhes" title="Fechar detalhes" @click="mapState.selectAsset(null, auth.canWrite)">
              <X />
            </Button>
          </header>

          <div ref="detailScrollElement" class="grid content-start gap-5 overflow-y-auto p-5">
            <div v-if="mapState.formLoading && auth.canWrite" class="grid gap-2" aria-label="Carregando solicitação e anexos">
              <Skeleton class="h-10" />
            </div>
            <div v-if="mapState.formError && auth.canWrite" class="flex flex-wrap items-center gap-3 rounded-md bg-warning-soft px-4 py-3 text-sm">
              <span>{{ mapState.formError }}</span>
              <Button variant="link" size="sm" class="h-auto px-0" @click="mapState.refreshSelected(auth.canWrite)">Tentar novamente</Button>
            </div>

            <AssetDetails
              :asset="selectedAsset"
              :form="selectedForm"
              :analysis="analysis"
              :analyzing="media.analyzing"
              @open-attachment="openUploadedAttachment"
            />

            <section v-if="auth.canWrite" class="grid gap-4 border-t pt-5">
              <Button
                v-if="selectedAsset.status === 'novos processos'"
                class="w-full"
                :disabled="media.saving"
                @click="startSelectedAnalysis"
              >
                <LoaderCircle v-if="media.saving" class="animate-spin" />
                <Play v-else />
                Iniciar análise
              </Button>
              <template v-else>
                <h3 class="text-sm font-semibold">Decisão</h3>
                <FormField v-slot="{ id }" label="Situação">
                  <Select v-model="reviewStatus">
                    <SelectTrigger :id="id" class="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="option in DECISION_STATUS_OPTIONS" :key="option.value" :value="option.value">{{ option.title }}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField v-slot="{ id }" label="Justificativa">
                  <Textarea :id="id" v-model="reviewJustification" rows="3" />
                </FormField>
                <AttachmentLinksEditor v-model="reviewAttachmentLinks" />
                <Button class="w-full" :disabled="media.saving || media.analyzing" @click="saveDecision">
                  <LoaderCircle v-if="media.saving" class="animate-spin" />
                  Salvar decisão
                </Button>
              </template>
            </section>

            <Button
              v-if="auth.canDelete"
              variant="ghost"
              class="justify-self-start text-destructive hover:bg-danger-soft hover:text-destructive"
              @click="media.error = null; confirmDelete = true"
            >
              <Trash2 />
              Excluir ponto
            </Button>
          </div>
        </template>

        <EmptyState
          v-else
          :icon="mapState.selectedLoading ? LoaderCircle : MousePointerClick"
          :title="mapState.selectedLoading ? 'Carregando veículo...' : 'Selecione um ponto no mapa'"
          :description="mapState.selectedLoading ? undefined : auth.canWrite ? 'Clique em um marcador para analisar, ou em uma área vazia para cadastrar um novo ponto.' : 'Clique em um marcador para ver os detalhes.'"
          class="flex-1"
        />
      </aside>
    </div>

    <AlertDialog :open="confirmDelete" @update:open="confirmDelete = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir o ponto {{ selectedAsset?.official_process_code || selectedAsset?.process_code }}?</AlertDialogTitle>
          <AlertDialogDescription>O veículo sai do mapa e do inventário. Essa ação não pode ser desfeita.</AlertDialogDescription>
        </AlertDialogHeader>
        <Alert v-if="media.error" variant="destructive">
          <CircleAlert />
          <AlertDescription>{{ media.error }}</AlertDescription>
        </Alert>
        <AlertDialogFooter>
          <Button variant="outline" @click="confirmDelete = false">Cancelar</Button>
          <Button variant="destructive" :disabled="media.saving" @click="deleteSelected">
            <LoaderCircle v-if="media.saving" class="animate-spin" />
            Excluir ponto
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>

<script setup lang="ts">
import {
  CircleAlert,
  LoaderCircle,
  MapPinPlus,
  MousePointerClick,
  Play,
  Ruler,
  Trash2,
  X,
} from '@lucide/vue';
import L from 'leaflet';
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import EmptyState from '@/components/common/EmptyState.vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import AttachmentLinksEditor from '@/components/form/AttachmentLinksEditor.vue';
import FormField from '@/components/form/FormField.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AssetDetails from '@/components/map/AssetDetails.vue';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import {
  DECISION_STATUS_OPTIONS,
  DISTRICT_OPTIONS,
  MEDIA_TYPE_OPTIONS,
  STATUS_OPTIONS,
  getRequiredRadius,
  mediaTypeOptionsFromRules,
  mediaTypeLabel,
} from '../domain/rules';
import { useMediaStore } from '../stores/media';
import { useMapStore } from '../stores/map';
import { useAuthStore } from '../stores/auth';
import type { ApplicationFormAttachment, MediaAsset, MediaAssetInput, MediaStatus, MediaType } from '../types';
import { openApplicationFormAttachment } from '../utils/application-form-attachments';
import { joinAttachmentLinks, parseAttachmentLinks } from '../utils/attachment-links';
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
const reviewAttachmentLinks = ref<string[]>([]);
const draft = reactive<MediaAssetInput>(blankDraft());
const draftAttempted = ref(false);
const confirmDelete = ref(false);
const AREA_OPTIONS = [
  { title: 'Não', value: 'within_limit' },
  { title: 'Sim', value: 'above_limit' },
] as const;
const panelTabs = [
  { value: 'analysis', label: 'Análise' },
  { value: 'form', label: 'Cadastro' },
] as const;

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

function resetReviewAttachmentLinks(value: string | null | undefined = '') {
  reviewAttachmentLinks.value = parseAttachmentLinks(value);
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
  draftAttempted.value = false;
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
  draftAttempted.value = true;
  if (!draft.address.trim() || (draftAreaThreshold.value != null && !draft.area_rule_classification)) return;
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
  media.error = null;
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
