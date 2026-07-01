import { defineStore } from 'pinia';

import { api } from '../services/api';

interface AuthState {
  userEmail: string | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

const storedEmail = localStorage.getItem('geomidia_user_email');
const storedToken = localStorage.getItem('geomidia_token');

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    userEmail: storedEmail,
    token: storedToken,
    loading: false,
    error: null,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.userEmail && state.token),
  },
  actions: {
    async login(email: string, password: string) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.login(email, password);
        this.userEmail = response.user_email;
        this.token = response.access_token;
        localStorage.setItem('geomidia_user_email', response.user_email);
        localStorage.setItem('geomidia_token', response.access_token);
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Falha ao autenticar.';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    logout() {
      this.userEmail = null;
      this.token = null;
      localStorage.removeItem('geomidia_user_email');
      localStorage.removeItem('geomidia_token');
    },
  },
});
