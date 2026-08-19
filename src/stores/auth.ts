import { defineStore } from 'pinia';

import { api } from '../services/api';
import type { UserRole } from '../types';

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
      this.loading = true;
      this.error = null;
      try {
        const response = await api.login(username, password);
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
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Falha ao autenticar.';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async validateSession() {
      if (!this.isAuthenticated) {
        this.logout();
        return false;
      }
      try {
        const user = await api.me();
        this.userId = user.id;
        this.userName = user.full_name;
        this.role = user.role;
        return true;
      } catch {
        this.logout();
        return false;
      }
    },
    logout() {
      this.userId = null;
      this.userName = null;
      this.role = null;
      this.token = null;
      this.expiresAt = null;
      clearSession();
    },
  },
});
