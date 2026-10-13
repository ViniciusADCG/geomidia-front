import { defineStore } from 'pinia';

import { advanceSessionEpoch, api, ApiError } from '../services/api';
import type { UserRole } from '../types';
import { useMediaStore } from './media';

interface AuthState {
  userId: string | null;
  userName: string | null;
  role: UserRole | null;
  token: string | null;
  expiresAt: string | null;
  loading: boolean;
  error: string | null;
}

function stored(key: string): string | null {
  return sessionStorage.getItem(key) ?? localStorage.getItem(key);
}

function clearSession() {
  ['geomidia_user_id', 'geomidia_user_name', 'geomidia_user_email', 'geomidia_role', 'geomidia_token', 'geomidia_expires_at']
    .forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
}

const authGeneration = new WeakMap<object, number>();

function generation(store: object): number {
  return authGeneration.get(store) ?? 0;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    userId: stored('geomidia_user_id'),
    userName: stored('geomidia_user_name') ?? stored('geomidia_user_email'),
    role: stored('geomidia_role') as UserRole | null,
    token: stored('geomidia_token'),
    expiresAt: stored('geomidia_expires_at'),
    loading: false,
    error: null,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(
      state.userName && state.token && state.expiresAt && new Date(state.expiresAt).getTime() > Date.now(),
    ),
    canWrite: (state) => state.role === 'admin' || state.role === 'analyst',
    canDelete: (state) => state.role === 'admin',
  },
  actions: {
    async login(username: string, password: string, remember = false) {
      const session = generation(this);
      let completed = false;
      this.loading = true;
      this.error = null;
      try {
        const response = await api.login(username, password);
        if (generation(this) !== session) throw new Error('Sessão alterada.');
        authGeneration.set(this, generation(this) + 1);
        advanceSessionEpoch();
        useMediaStore().clearSessionData();
        clearSession();
        const storage = remember ? localStorage : sessionStorage;
        this.userId = response.user_id;
        this.userName = response.user_name;
        this.role = response.role;
        this.token = response.access_token;
        this.expiresAt = response.expires_at;
        storage.setItem('geomidia_user_id', response.user_id);
        storage.setItem('geomidia_user_name', response.user_name);
        storage.setItem('geomidia_role', response.role);
        storage.setItem('geomidia_token', response.access_token);
        storage.setItem('geomidia_expires_at', response.expires_at);
        completed = true;
      } catch (error) {
        if (generation(this) === session) this.error = error instanceof Error ? error.message : 'Falha ao autenticar.';
        throw error;
      } finally {
        if (generation(this) === session || (completed && generation(this) === session + 1)) this.loading = false;
      }
    },
    async validateSession() {
      if (!this.isAuthenticated) {
        this.logout();
        return false;
      }
      const token = this.token;
      const session = generation(this);
      try {
        const user = await api.me();
        if (generation(this) !== session || this.token !== token) return false;
        this.userId = user.id;
        this.userName = user.full_name;
        this.role = user.role;
        this.error = null;
        return true;
      } catch (error) {
        if (generation(this) !== session || this.token !== token) return false;
        if (error instanceof ApiError && error.status === 401) {
          this.logout();
          return false;
        }
        this.error = error instanceof Error ? error.message : 'Falha ao validar a sessão.';
        return this.isAuthenticated;
      }
    },
    logout() {
      authGeneration.set(this, generation(this) + 1);
      advanceSessionEpoch();
      useMediaStore().clearSessionData();
      this.userId = null;
      this.userName = null;
      this.role = null;
      this.token = null;
      this.expiresAt = null;
      this.loading = false;
      this.error = null;
      clearSession();
    },
  },
});
