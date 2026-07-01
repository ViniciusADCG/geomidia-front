import { defineStore } from 'pinia';

import { api } from '../services/api';
import type { ActivityLog, ConflictAnalysis, MediaAsset, MediaAssetInput, MediaStats } from '../types';

const EMPTY_STATS: MediaStats = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  by_type: {},
};

interface MediaState {
  assets: MediaAsset[];
  activities: ActivityLog[];
  stats: MediaStats;
  selectedAssetId: string | null;
  analysisByAssetId: Record<string, ConflictAnalysis>;
  loading: boolean;
  error: string | null;
}

export const useMediaStore = defineStore('media', {
  state: (): MediaState => ({
    assets: [],
    activities: [],
    stats: EMPTY_STATS,
    selectedAssetId: null,
    analysisByAssetId: {},
    loading: false,
    error: null,
  }),
  getters: {
    selectedAsset: (state) => state.assets.find((asset) => asset.id === state.selectedAssetId) ?? null,
  },
  actions: {
    async loadAll() {
      this.loading = true;
      this.error = null;
      try {
        const [assets, activities, stats] = await Promise.all([
          api.listMediaAssets(),
          api.listActivities(),
          api.getMediaStats(),
        ]);
        this.assets = assets;
        this.activities = activities;
        this.stats = stats;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Falha ao carregar dados.';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async createAsset(input: MediaAssetInput) {
      await api.createMediaAsset(input);
      await this.loadAll();
    },
    async updateAsset(id: string, input: Partial<MediaAssetInput>) {
      await api.updateMediaAsset(id, input);
      await this.loadAll();
      if (this.selectedAssetId === id) {
        await this.analyzeAsset(id);
      }
    },
    async deleteAsset(id: string) {
      await api.deleteMediaAsset(id);
      if (this.selectedAssetId === id) {
        this.selectedAssetId = null;
      }
      delete this.analysisByAssetId[id];
      await this.loadAll();
    },
    async analyzeAsset(id: string) {
      this.analysisByAssetId[id] = await api.analyzeMediaAsset(id);
    },
    selectAsset(id: string | null) {
      this.selectedAssetId = id;
      if (id) {
        void this.analyzeAsset(id);
      }
    },
  },
});
