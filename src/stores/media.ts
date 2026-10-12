import { defineStore } from 'pinia';

import { api } from '../services/api';
import type { ActivityLog, ApplicationForm, ApplicationFormInput, ConflictAnalysis, MediaAsset, MediaAssetInput, MediaRule, MediaStats } from '../types';

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

export const useMediaStore = defineStore('media', {
  state: (): MediaState => ({
    assets: [],
    assetTotal: 0,
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
  },
  actions: {
    async loadApplicationFormsForMap(force = false) {
      if (this.applicationFormsLoading || (this.applicationFormsLoaded && !force && !this.applicationFormsError)) return;
      this.applicationFormsLoading = true;
      this.applicationFormsError = null;
      try {
        this.applicationForms = await api.listApplicationForms();
        this.applicationFormsLoaded = true;
      } catch (error) {
        this.applicationFormsError = messageFrom(error, 'Falha ao carregar os dados da solicitação.');
      } finally {
        this.applicationFormsLoading = false;
      }
    },
    loadAll(force = false) {
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
        if (loadAllInFlight.get(this) !== request) return;

        if (assetPage.status === 'fulfilled') {
          this.assets = assetPage.value.items;
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
        if (loadAllInFlight.get(this) === request) {
          this.error = messageFrom(error, 'Falha ao carregar dados.');
        }
        throw error;
      }).finally(() => {
        if (loadAllInFlight.get(this) !== request) return;
        loadAllInFlight.delete(this);
        this.loading = false;
      });
      loadAllInFlight.set(this, request);
      return request;
    },
    async refreshMeta() {
      const [activityPage, stats] = await Promise.all([api.listActivities(), api.getMediaStats()]);
      this.activities = activityPage.items;
      this.stats = stats;
      this.assetTotal = stats.total;
    },
    async createAsset(input: MediaAssetInput) {
      this.saving = true;
      this.error = null;
      try {
        const created = await api.createMediaAsset(input);
        this.assets.unshift(created);
        await this.refreshMeta();
        return created;
      } catch (error) {
        this.error = messageFrom(error, 'Falha ao cadastrar o ativo.');
        throw error;
      } finally {
        this.saving = false;
      }
    },
    async updateAsset(id: string, input: Partial<MediaAssetInput>) {
      this.saving = true;
      this.error = null;
      try {
        const updated = await api.updateMediaAsset(id, input);
        const index = this.assets.findIndex((asset) => asset.id === id);
        if (index >= 0) this.assets[index] = updated;
        await this.refreshMeta();
        if (this.selectedAssetId === id && updated.status !== 'novos processos') await this.analyzeAsset(id);
        return updated;
      } catch (error) {
        this.error = messageFrom(error, 'Falha ao atualizar o ativo.');
        throw error;
      } finally {
        this.saving = false;
      }
    },
    async updateLinkedAsset(id: string, formId: string, formInput: Partial<ApplicationFormInput>, assetInput: Partial<MediaAssetInput>) {
      this.saving = true;
      this.error = null;
      try {
        if (Object.keys(formInput).length) {
          const form = await api.updateApplicationForm(formId, formInput);
          const formIndex = this.applicationForms.findIndex((item) => item.id === formId);
          if (formIndex >= 0) this.applicationForms[formIndex] = form;
        }
        if (Object.keys(assetInput).length) await api.updateMediaAsset(id, assetInput);
        const asset = await api.getMediaAsset(id);
        const assetIndex = this.assets.findIndex((item) => item.id === id);
        if (assetIndex >= 0) this.assets[assetIndex] = asset;
        await this.refreshMeta();
        if (this.selectedAssetId === id && asset.status !== 'novos processos') await this.analyzeAsset(id);
        return asset;
      } catch (error) {
        // The form and asset endpoints commit separately; reload both after a partial save.
        const [asset, form] = await Promise.allSettled([api.getMediaAsset(id), api.listApplicationForms()]);
        if (asset.status === 'fulfilled') {
          const index = this.assets.findIndex((item) => item.id === id);
          if (index >= 0) this.assets[index] = asset.value;
        }
        if (form.status === 'fulfilled') this.applicationForms = form.value;
        this.error = messageFrom(error, 'Falha ao atualizar o cadastro.');
        throw error;
      } finally {
        this.saving = false;
      }
    },
    async startAnalysis(id: string) {
      this.saving = true;
      this.error = null;
      try {
        const updated = await api.startMediaAssetAnalysis(id);
        const index = this.assets.findIndex((asset) => asset.id === id);
        if (index >= 0) this.assets[index] = updated;
        await this.refreshMeta();
        if (this.selectedAssetId === id) await this.analyzeAsset(id);
        return updated;
      } catch (error) {
        this.error = messageFrom(error, 'Falha ao iniciar a análise do processo.');
        throw error;
      } finally {
        this.saving = false;
      }
    },
    async deleteAsset(id: string) {
      this.saving = true;
      this.error = null;
      try {
        await api.deleteMediaAsset(id);
        this.assets = this.assets.filter((asset) => asset.id !== id);
        if (this.selectedAssetId === id) this.selectedAssetId = null;
        delete this.analysisByAssetId[id];
        await this.refreshMeta();
      } catch (error) {
        this.error = messageFrom(error, 'Falha ao excluir o ativo.');
        throw error;
      } finally {
        this.saving = false;
      }
    },
    async analyzeAsset(id: string) {
      this.analyzing = true;
      try {
        this.analysisByAssetId[id] = await api.analyzeMediaAsset(id);
      } catch (error) {
        this.error = messageFrom(error, 'Falha ao analisar conflitos.');
        throw error;
      } finally {
        this.analyzing = false;
      }
    },
    selectAsset(id: string | null) {
      this.selectedAssetId = id;
      if (!id) return;
      const asset = this.assets.find((item) => item.id === id);
      if (asset?.status === 'novos processos') {
        delete this.analysisByAssetId[id];
        return;
      }
      void this.analyzeAsset(id).catch(() => undefined);
    },
  },
});
