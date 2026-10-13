import { defineStore } from 'pinia';

import { api } from '../services/api';
import type { ActivityLog, ApplicationForm, ConflictAnalysis, LinkedApplicationFormUpdate, MediaAsset, MediaAssetInput, MediaRule, MediaStats } from '../types';

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
const sessionGeneration = new WeakMap<object, number>();

function generation(store: object): number {
  return sessionGeneration.get(store) ?? 0;
}

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
    clearSessionData() {
      sessionGeneration.set(this, generation(this) + 1);
      loadAllInFlight.delete(this);
      this.$reset();
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
      const asset = this.assets.find((item) => item.id === id);
      if (asset?.status === 'novos processos') {
        delete this.analysisByAssetId[id];
        return;
      }
      void this.analyzeAsset(id).catch(() => undefined);
    },
  },
});
