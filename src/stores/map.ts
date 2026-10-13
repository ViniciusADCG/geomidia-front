import { defineStore } from 'pinia';

import { ApiError, api } from '../services/api';
import type { ApplicationForm, MapAssetSummary, MapCluster, MapFilters, MapViewport, MediaAsset } from '../types';

interface MapState {
  items: MapAssetSummary[];
  clusters: MapCluster[];
  total: number;
  tooMany: boolean;
  loading: boolean;
  error: string | null;
  viewport: MapViewport | null;
  filters: MapFilters;
  companyOptions: string[];
  selectedAssetId: string | null;
  selectedAsset: MediaAsset | null;
  selectedForm: ApplicationForm | null;
  selectedLoading: boolean;
  formLoading: boolean;
  formError: string | null;
}

const requestVersion = new WeakMap<object, number>();
const selectionVersion = new WeakMap<object, number>();
const optionsVersion = new WeakMap<object, number>();

function nextVersion(versions: WeakMap<object, number>, store: object): number {
  const version = (versions.get(store) ?? 0) + 1;
  versions.set(store, version);
  return version;
}

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export const useMapStore = defineStore('map', {
  state: (): MapState => ({
    items: [],
    clusters: [],
    total: 0,
    tooMany: false,
    loading: false,
    error: null,
    viewport: null,
    filters: {},
    companyOptions: [],
    selectedAssetId: null,
    selectedAsset: null,
    selectedForm: null,
    selectedLoading: false,
    formLoading: false,
    formError: null,
  }),
  actions: {
    invalidate() {
      nextVersion(requestVersion, this);
      nextVersion(selectionVersion, this);
      this.loading = false;
      this.selectedLoading = false;
      this.formLoading = false;
    },
    clearSessionData() {
      this.invalidate();
      nextVersion(optionsVersion, this);
      this.$reset();
    },
    async loadCompanyOptions() {
      const version = nextVersion(optionsVersion, this);
      try {
        const options = await api.listMapCompanyOptions();
        if (optionsVersion.get(this) === version) this.companyOptions = options;
      } catch (error) {
        if (optionsVersion.get(this) === version) this.error = messageFrom(error, 'Falha ao carregar empresas.');
      }
    },
    stageViewport(viewport: MapViewport, filters: MapFilters) {
      nextVersion(requestVersion, this);
      this.viewport = { ...viewport };
      this.filters = { ...filters };
      this.items = [];
      this.clusters = [];
      this.total = 0;
      this.tooMany = false;
      this.loading = true;
      this.error = null;
    },
    async loadViewport(viewport: MapViewport, filters?: MapFilters) {
      const activeFilters = filters ?? this.filters;
      const version = nextVersion(requestVersion, this);
      this.viewport = { ...viewport };
      this.filters = { ...activeFilters };
      this.loading = true;
      this.error = null;
      this.items = [];
      this.clusters = [];
      this.total = 0;
      this.tooMany = false;
      try {
        const page = await api.listMapAssets(viewport, activeFilters);
        if (requestVersion.get(this) !== version) return;
        if (page.too_many) {
          const clustered = await api.listMapClusters(viewport, activeFilters);
          if (requestVersion.get(this) !== version) return;
          if (clustered.clusters.reduce((sum, cluster) => sum + cluster.count, 0) !== clustered.total) {
            throw new Error('A contagem dos agrupamentos não corresponde ao total da viewport.');
          }
          this.clusters = clustered.clusters;
          this.total = clustered.total;
          this.tooMany = true;
        } else {
          this.items = page.items;
          this.total = page.total;
        }
      } catch (error) {
        if (requestVersion.get(this) === version) {
          this.error = messageFrom(error, 'Falha ao carregar o mapa.');
          this.items = [];
          this.clusters = [];
          this.total = 0;
          this.tooMany = false;
        }
      } finally {
        if (requestVersion.get(this) === version) this.loading = false;
      }
    },
    refreshViewport() {
      if (this.viewport) return this.loadViewport(this.viewport, this.filters);
      return Promise.resolve();
    },
    async selectAsset(id: string | null, loadForm: boolean) {
      const version = nextVersion(selectionVersion, this);
      this.selectedAssetId = id;
      this.selectedAsset = null;
      this.selectedForm = null;
      this.formError = null;
      this.selectedLoading = Boolean(id);
      this.formLoading = false;
      if (!id) return;
      try {
        const asset = await api.getMediaAsset(id);
        if (selectionVersion.get(this) !== version) return;
        this.selectedAsset = asset;
        if (loadForm && asset.company_responsible) {
          this.formLoading = true;
          try {
            const form = await api.getApplicationFormByAsset(id);
            if (selectionVersion.get(this) === version) this.selectedForm = form;
          } catch (error) {
            if (selectionVersion.get(this) === version && !(error instanceof ApiError && error.status === 404)) {
              this.formError = messageFrom(error, 'Falha ao carregar os dados da solicitação.');
            }
          } finally {
            if (selectionVersion.get(this) === version) this.formLoading = false;
          }
        }
      } catch (error) {
        if (selectionVersion.get(this) === version) {
          this.error = messageFrom(error, 'Falha ao carregar o veículo.');
          this.selectedAssetId = null;
        }
      } finally {
        if (selectionVersion.get(this) === version) this.selectedLoading = false;
      }
    },
    refreshSelected(loadForm: boolean) {
      if (this.selectedAssetId) return this.selectAsset(this.selectedAssetId, loadForm);
      return Promise.resolve();
    },
  },
});
