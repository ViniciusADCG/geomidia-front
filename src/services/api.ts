import type {
  ActivityLog,
  ConflictAnalysis,
  MediaAsset,
  MediaAssetInput,
  MediaStats,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.detail ?? 'Não foi possível concluir a solicitação.';
    throw new Error(Array.isArray(detail) ? detail.map((item) => item.msg).join(', ') : detail);
  }

  return payload as T;
}

export const api = {
  login(email: string, password: string) {
    return request<{ access_token: string; user_email: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  listMediaAssets() {
    return request<MediaAsset[]>('/media-assets');
  },
  createMediaAsset(input: MediaAssetInput) {
    return request<MediaAsset>('/media-assets', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  updateMediaAsset(id: string, input: Partial<MediaAssetInput>) {
    return request<MediaAsset>(`/media-assets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
  deleteMediaAsset(id: string) {
    return request<void>(`/media-assets/${id}`, {
      method: 'DELETE',
    });
  },
  getMediaStats() {
    return request<MediaStats>('/media-assets/stats');
  },
  analyzeMediaAsset(id: string) {
    return request<ConflictAnalysis>(`/media-assets/${id}/analysis`);
  },
  listActivities() {
    return request<ActivityLog[]>('/activities');
  },
};
