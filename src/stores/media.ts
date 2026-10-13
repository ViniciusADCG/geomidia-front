import { defineStore } from 'pinia';

import { api } from '../services/api';
import type { ActivityLog, ApplicationForm, ConflictAnalysis, LinkedApplicationFormUpdate, MediaAsset, MediaAssetInput, MediaRule, MediaStats, MediaStatus, MediaType, Page } from '../types';

const EMPTY_STATS: MediaStats = {
  total: 0,
  new_processes: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  expiring_soon: 0,
  expired: 0,
  by_type: {},
};

interface MediaState {
  assets: MediaAsset[];
  assetTotal: number;
  inventoryItems: MediaAsset[];
  inventoryTotal: number;
  inventoryPage: number;
  inventoryPageSize: number;
  inventorySearch: string;
  inventorySearchDraft: string;
  inventoryTypeFilter: MediaType | 'all';
  inventoryStatusFilter: MediaStatus | 'all';
  inventoryLoading: boolean;
  inventoryLoaded: boolean;
  inventoryError: string | null;
  activities: ActivityLog[];
  rules: MediaRule[];
  stats: MediaStats;
  selectedAssetId: string | null;
  applicationForms: ApplicationForm[];
  applicationFormsLoaded: boolean;
  applicationFormsLoading: boolean;
  applicationFormsError: string | null;
  analysisByAssetId: Record<string, ConflictAnalysis>;
  loading: boolean;
  saving: boolean;
  analyzing: boolean;
  error: string | null;
}

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function failureMessage(label: string, result: PromiseSettledResult<unknown>): string | null {
  return result.status === 'rejected' ? `${label}: ${messageFrom(result.reason, 'Falha na requisição')}` : null;
}

const loadAllInFlight = new WeakMap<object, Promise<void>>();
const dashboardInFlight = new WeakMap<object, Promise<void>>();
const rulesInFlight = new WeakMap<object, Promise<void>>();
const sessionGeneration = new WeakMap<object, number>();
const inventoryRequestVersion = new WeakMap<object, number>();
const inventorySearchTimer = new WeakMap<object, ReturnType<typeof setTimeout>>();

function generation(store: object): number {
  return sessionGeneration.get(store) ?? 0;
}

export const useMediaStore = defineStore('media', {
  state: (): MediaState => ({
    assets: [],
    assetTotal: 0,
    inventoryItems: [],
    inventoryTotal: 0,
    inventoryPage: 1,
    inventoryPageSize: 50,
    inventorySearch: '',
    inventorySearchDraft: '',
    inventoryTypeFilter: 'all',
    inventoryStatusFilter: 'all',
    inventoryLoading: false,
    inventoryLoaded: false,
    inventoryError: null,
    activities: [],
    rules: [],
    stats: EMPTY_STATS,
    selectedAssetId: null,
    applicationForms: [],
    applicationFormsLoaded: false,
    applicationFormsLoading: false,
    applicationFormsError: null,
    analysisByAssetId: {},
    loading: false,
    saving: false,
    analyzing: false,
    error: null,
  }),
  getters: {
    selectedAsset: (state) => state.assets.find((asset) => asset.id === state.selectedAssetId) ?? null,
    selectedApplicationForm: (state) => state.applicationForms.find((form) => form.asset_id === state.selectedAssetId) ?? null,
    inventoryPageCount: (state) => Math.max(1, Math.ceil(state.inventoryTotal / state.inventoryPageSize)),
  },
  actions: {
    clearSessionData() {
      sessionGeneration.set(this, generation(this) + 1);
      loadAllInFlight.delete(this);
      dashboardInFlight.delete(this);
      rulesInFlight.delete(this);
      clearTimeout(inventorySearchTimer.get(this));
      inventorySearchTimer.delete(this);
      inventoryRequestVersion.delete(this);
      this.$reset();
    },
    async loadInventory(): Promise<Page<MediaAsset> | null> {
      const session = generation(this);
      const requestVersion = (inventoryRequestVersion.get(this) ?? 0) + 1;
      inventoryRequestVersion.set(this, requestVersion);
      const current = () => generation(this) === session && inventoryRequestVersion.get(this) === requestVersion;
      this.inventoryLoading = true;
      this.inventoryError = null;
      this.inventoryItems = [];
      this.inventoryTotal = 0;
      try {
        const page = await api.listMediaAssets({
          search: this.inventorySearch || undefined,
          mediaType: this.inventoryTypeFilter === 'all' ? undefined : this.inventoryTypeFilter,
          status: this.inventoryStatusFilter === 'all' ? undefined : this.inventoryStatusFilter,
          limit: this.inventoryPageSize,
          offset: (this.inventoryPage - 1) * this.inventoryPageSize,
        });
        if (!current()) return null;
        this.inventoryItems = page.items;
        this.inventoryTotal = page.total;
        this.inventoryLoaded = true;
        return page;
      } catch (error) {
        if (current()) {
          this.inventoryError = messageFrom(error, 'Falha ao carregar o inventário.');
          this.inventoryLoaded = true;
        }
        return null;
      } finally {
        if (current()) this.inventoryLoading = false;
      }
    },
    scheduleInventorySearch(value: string) {
      this.inventorySearchDraft = value;
      clearTimeout(inventorySearchTimer.get(this));
      inventoryRequestVersion.set(this, (inventoryRequestVersion.get(this) ?? 0) + 1);
      this.inventoryLoading = true;
      const timer = setTimeout(() => {
        inventorySearchTimer.delete(this);
        this.inventorySearch = this.inventorySearchDraft.trim();
        this.inventoryPage = 1;
        void this.loadInventory();
      }, 350);
      inventorySearchTimer.set(this, timer);
    },
    refreshInventory() {
      clearTimeout(inventorySearchTimer.get(this));
      inventorySearchTimer.delete(this);
      const search = this.inventorySearchDraft.trim();
      if (search !== this.inventorySearch) {
        this.inventorySearch = search;
        this.inventoryPage = 1;
      }
      return this.loadInventory();
    },
    changeInventoryType(value: MediaType | 'all') {
      this.inventoryTypeFilter = value;
      this.inventoryPage = 1;
      return this.refreshInventory();
    },
    changeInventoryStatus(value: MediaStatus | 'all') {
      this.inventoryStatusFilter = value;
      this.inventoryPage = 1;
      return this.refreshInventory();
    },
    changeInventoryPageSize(value: number) {
      this.inventoryPageSize = value;
      this.inventoryPage = 1;
      return this.refreshInventory();
    },
    changeInventoryPage(value: number) {
      this.inventoryPage = value;
      return this.refreshInventory();
    },
    async reloadInventoryAfterMutation() {
      const page = await this.refreshInventory();
      if (page && this.inventoryPage > 1 && this.inventoryPage > Math.max(1, Math.ceil(page.total / this.inventoryPageSize))) {
        this.inventoryPage = Math.max(1, Math.ceil(page.total / this.inventoryPageSize));
        await this.loadInventory();
      }
    },
    async runInventoryMutation<T>(mutation: () => Promise<T>): Promise<T> {
      const result = await mutation();
      await this.reloadInventoryAfterMutation();
      return result;
    },
    async loadApplicationFormsForMap(force = false) {
      if (this.applicationFormsLoading || (this.applicationFormsLoaded && !force && !this.applicationFormsError)) return;
      const session = generation(this);
      this.applicationFormsLoading = true;
      this.applicationFormsError = null;
      try {
        const forms = await api.listApplicationForms();
        if (generation(this) !== session) return;
        this.applicationForms = forms;
        this.applicationFormsLoaded = true;
      } catch (error) {
        if (generation(this) !== session) return;
        this.applicationFormsError = messageFrom(error, 'Falha ao carregar os dados da solicitação.');
      } finally {
        if (generation(this) === session) this.applicationFormsLoading = false;
      }
    },
    loadDashboard() {
      const inFlight = dashboardInFlight.get(this);
      if (inFlight) return inFlight;
      const session = generation(this);
      this.loading = true;
      this.error = null;
      const activities = api.listActivities().then((page) => {
        if (generation(this) === session) this.activities = page.items;
      });
      const stats = api.getMediaStats().then((value) => {
        if (generation(this) === session) {
          this.stats = value;
          this.assetTotal = value.total;
        }
      });
      const request = Promise.allSettled([activities, stats]).then((results) => {
        if (generation(this) !== session || dashboardInFlight.get(this) !== request) return;
        const failures = [
          failureMessage('atividades', results[0]),
          failureMessage('estatísticas', results[1]),
        ].filter((message): message is string => message !== null);
        if (failures.length) this.error = `Falha ao carregar ${failures.join('; ')}.`;
      }).finally(() => {
        if (generation(this) !== session || dashboardInFlight.get(this) !== request) return;
        dashboardInFlight.delete(this);
        this.loading = false;
      });
      dashboardInFlight.set(this, request);
      return request;
    },
    loadRules() {
      const inFlight = rulesInFlight.get(this);
      if (inFlight) return inFlight;
      const session = generation(this);
      const request = api.listMediaRules().then((rules) => {
        if (generation(this) === session && rulesInFlight.get(this) === request) this.rules = rules;
      }).catch((error: unknown) => {
        if (generation(this) === session && rulesInFlight.get(this) === request) {
          this.error = messageFrom(error, 'Falha ao carregar regras.');
        }
      }).finally(() => {
        if (rulesInFlight.get(this) === request) rulesInFlight.delete(this);
      });
      rulesInFlight.set(this, request);
      return request;
    },
    loadAll(force = false) {
      const session = generation(this);
      const inFlight = loadAllInFlight.get(this);
      if (inFlight && !force) return inFlight;
      this.loading = true;
      this.error = null;
      const request = Promise.allSettled([
        api.listMediaAssets({ limit: 500 }),
        api.listActivities(),
        api.getMediaStats(),
        api.listMediaRules(),
      ]).then(([assetPage, activityPage, stats, rules]) => {
        if (generation(this) !== session || loadAllInFlight.get(this) !== request) return;

        if (assetPage.status === 'fulfilled') {
          const selected = this.assets.find((asset) => asset.id === this.selectedAssetId);
          this.assets = assetPage.value.items;
          if (selected && !this.assets.some((asset) => asset.id === selected.id)) this.assets.push(selected);
          this.assetTotal = assetPage.value.total;
        }
        if (activityPage.status === 'fulfilled') this.activities = activityPage.value.items;
        if (stats.status === 'fulfilled') this.stats = stats.value;
        if (rules.status === 'fulfilled') this.rules = rules.value;

        const failures = [
          failureMessage('veículos', assetPage),
          failureMessage('atividades', activityPage),
          failureMessage('estatísticas', stats),
          failureMessage('regras', rules),
        ].filter((message): message is string => message !== null);
        if (failures.length) {
          this.error = `Falha ao carregar ${failures.join('; ')}.`;
          throw new Error(this.error);
        }
      }).catch((error: unknown) => {
        if (generation(this) === session && loadAllInFlight.get(this) === request) {
          this.error = messageFrom(error, 'Falha ao carregar dados.');
        }
        throw error;
      }).finally(() => {
        if (generation(this) !== session || loadAllInFlight.get(this) !== request) return;
        loadAllInFlight.delete(this);
        this.loading = false;
      });
      loadAllInFlight.set(this, request);
      return request;
    },
    async refreshMeta() {
      const session = generation(this);
      const [activityPage, stats] = await Promise.all([api.listActivities(), api.getMediaStats()]);
      if (generation(this) !== session) return;
      this.activities = activityPage.items;
      this.stats = stats;
      this.assetTotal = stats.total;
    },
    async createAsset(input: MediaAssetInput) {
      const session = generation(this);
      this.saving = true;
      this.error = null;
      try {
        const created = await api.createMediaAsset(input);
        if (generation(this) !== session) return created;
        this.assets.unshift(created);
        await this.refreshMeta();
        return created;
      } catch (error) {
        if (generation(this) !== session) throw error;
        this.error = messageFrom(error, 'Falha ao cadastrar o ativo.');
        throw error;
      } finally {
        if (generation(this) === session) this.saving = false;
      }
    },
    async updateAsset(id: string, input: Partial<MediaAssetInput>) {
      const session = generation(this);
      this.saving = true;
      this.error = null;
      try {
        const updated = await api.updateMediaAsset(id, input);
        if (generation(this) !== session) return updated;
        const index = this.assets.findIndex((asset) => asset.id === id);
        if (index >= 0) this.assets[index] = updated;
        await this.refreshMeta();
        if (generation(this) === session && this.selectedAssetId === id && updated.status !== 'novos processos') await this.analyzeAsset(id);
        return updated;
      } catch (error) {
        if (generation(this) !== session) throw error;
        this.error = messageFrom(error, 'Falha ao atualizar o ativo.');
        throw error;
      } finally {
        if (generation(this) === session) this.saving = false;
      }
    },
    async updateLinkedAsset(id: string, formId: string, formInput: LinkedApplicationFormUpdate['form'], assetInput: LinkedApplicationFormUpdate['asset']) {
      const session = generation(this);
      this.saving = true;
      this.error = null;
      try {
        const { form, asset } = await api.updateLinkedApplicationForm(formId, { form: formInput, asset: assetInput });
        if (generation(this) !== session) return asset;
        if (form.asset_id !== id || asset.id !== id) throw new Error('Resposta inconsistente da edição vinculada.');
        const formIndex = this.applicationForms.findIndex((item) => item.id === formId);
        if (formIndex >= 0) this.applicationForms[formIndex] = form;
        const assetIndex = this.assets.findIndex((item) => item.id === id);
        if (assetIndex >= 0) this.assets[assetIndex] = asset;
        try {
          await this.refreshMeta();
          if (generation(this) === session && this.selectedAssetId === id && asset.status !== 'novos processos') {
            await this.analyzeAsset(id);
          }
        } catch (refreshError) {
          if (generation(this) === session) {
            this.error = `Cadastro salvo, mas falhou a atualização dos dados: ${messageFrom(refreshError, 'falha desconhecida')}`;
          }
        }
        return asset;
      } catch (error) {
        if (generation(this) !== session) throw error;
        this.error = messageFrom(error, 'Falha ao atualizar o cadastro.');
        throw error;
      } finally {
        if (generation(this) === session) this.saving = false;
      }
    },
    async startAnalysis(id: string) {
      const session = generation(this);
      this.saving = true;
      this.error = null;
      try {
        const updated = await api.startMediaAssetAnalysis(id);
        if (generation(this) !== session) return updated;
        const index = this.assets.findIndex((asset) => asset.id === id);
        if (index >= 0) this.assets[index] = updated;
        await this.refreshMeta();
        if (generation(this) === session && this.selectedAssetId === id) await this.analyzeAsset(id);
        return updated;
      } catch (error) {
        if (generation(this) !== session) throw error;
        this.error = messageFrom(error, 'Falha ao iniciar a análise do processo.');
        throw error;
      } finally {
        if (generation(this) === session) this.saving = false;
      }
    },
    async deleteAsset(id: string) {
      const session = generation(this);
      this.saving = true;
      this.error = null;
      try {
        await api.deleteMediaAsset(id);
        if (generation(this) !== session) return;
        this.assets = this.assets.filter((asset) => asset.id !== id);
        if (this.selectedAssetId === id) this.selectedAssetId = null;
        delete this.analysisByAssetId[id];
        await this.refreshMeta();
      } catch (error) {
        if (generation(this) !== session) throw error;
        this.error = messageFrom(error, 'Falha ao excluir o ativo.');
        throw error;
      } finally {
        if (generation(this) === session) this.saving = false;
      }
    },
    async analyzeAsset(id: string) {
      const session = generation(this);
      this.analyzing = true;
      try {
        const analysis = await api.analyzeMediaAsset(id);
        if (generation(this) !== session) return;
        this.analysisByAssetId[id] = analysis;
      } catch (error) {
        if (generation(this) !== session) throw error;
        this.error = messageFrom(error, 'Falha ao analisar conflitos.');
        throw error;
      } finally {
        if (generation(this) === session) this.analyzing = false;
      }
    },
    selectAsset(id: string | null) {
      this.selectedAssetId = id;
      if (!id) return;
      let asset = this.assets.find((item) => item.id === id);
      if (!asset) {
        asset = this.inventoryItems.find((item) => item.id === id);
        if (asset) this.assets.push(asset);
      }
      if (asset?.status === 'novos processos') {
        delete this.analysisByAssetId[id];
        return;
      }
      void this.analyzeAsset(id).catch(() => undefined);
    },
  },
});
