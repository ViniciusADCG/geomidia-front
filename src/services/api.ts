import type {
  ActivityLog,
  ApplicationForm,
  ApplicationFormInput,
  ConflictAnalysis,
  ExpirationOverview,
  LoginResponse,
  MapAssetPage,
  MapClusterPage,
  MapFilters,
  MapViewport,
  LinkedApplicationFormResult,
  LinkedApplicationFormUpdate,
  MediaAsset,
  MediaAssetInput,
  MediaRule,
  MediaRuleInput,
  MediaStats,
  MediaStatus,
  MediaType,
  Page,
  RequirementResponse,
  User,
  UserInput,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';
let sessionEpoch = 0;

export function advanceSessionEpoch(): void {
  sessionEpoch += 1;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

function accessToken(): string | null {
  return sessionStorage.getItem('geomidia_token') ?? localStorage.getItem('geomidia_token');
}

function errorMessage(payload: unknown): string {
  const detail = (payload as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => (item as { msg?: string }).msg ?? 'Campo inválido').join(', ');
  }
  if (detail && typeof detail === 'object' && 'message' in detail) {
    return String((detail as { message: unknown }).message);
  }
  return 'Não foi possível concluir a solicitação.';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = accessToken();
  const requestEpoch = sessionEpoch;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
  } catch (error) {
    throw new ApiError(
      `Não foi possível comunicar com a API em ${API_BASE_URL}. O navegador não recebeu uma resposta; `
        + 'verifique a rede, DNS/TLS, a política de CORS e as restrições do deployment, como um preview protegido.',
      0,
      error,
    );
  }

  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login' && requestEpoch === sessionEpoch) {
      window.dispatchEvent(new CustomEvent('geomidia:unauthorized', { detail: { token } }));
    }
    throw new ApiError(errorMessage(payload), response.status, payload);
  }
  return payload as T;
}

async function requestPdf(path: string): Promise<Blob> {
  const token = accessToken();
  const requestEpoch = sessionEpoch;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new ApiError('Não foi possível conectar à API para baixar o comprovante.', 0);
  }
  if (!response.ok) {
    if (response.status === 401 && requestEpoch === sessionEpoch) {
      window.dispatchEvent(new CustomEvent('geomidia:unauthorized', { detail: { token } }));
    }
    const payload = await response.json().catch(() => null);
    throw new ApiError(errorMessage(payload), response.status, payload);
  }
  return response.blob();
}

function queryString(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
}

export const api = {
  login(username: string, password: string) {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  me() {
    return request<User>('/auth/me');
  },
  listMediaAssets(params: {
    search?: string;
    mediaType?: MediaType;
    status?: MediaStatus;
    district?: string;
    company?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    return request<Page<MediaAsset>>(`/media-assets${queryString({
      search: params.search,
      media_type: params.mediaType,
      status: params.status,
      district: params.district,
      company: params.company,
      limit: params.limit,
      offset: params.offset,
    })}`);
  },
  listMapAssets(viewport: MapViewport, filters: MapFilters = {}) {
    return request<MapAssetPage>(`/media-assets/map${queryString({
      north: viewport.north,
      south: viewport.south,
      east: viewport.east,
      west: viewport.west,
      media_type: filters.mediaType,
      status: filters.status,
      company: filters.company,
    })}`);
  },
  listMapClusters(viewport: MapViewport, filters: MapFilters = {}) {
    return request<MapClusterPage>(`/media-assets/map/clusters${queryString({
      north: viewport.north,
      south: viewport.south,
      east: viewport.east,
      west: viewport.west,
      zoom: viewport.zoom,
      media_type: filters.mediaType,
      status: filters.status,
      company: filters.company,
    })}`);
  },
  listMapCompanyOptions() {
    return request<string[]>('/media-assets/map/company-options');
  },
  createMediaAsset(input: MediaAssetInput) {
    return request<MediaAsset>('/media-assets', { method: 'POST', body: JSON.stringify(input) });
  },
  getMediaAsset(id: string) {
    return request<MediaAsset>(`/media-assets/${id}`);
  },
  updateMediaAsset(id: string, input: Partial<MediaAssetInput>) {
    return request<MediaAsset>(`/media-assets/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  deleteMediaAsset(id: string) {
    return request<void>(`/media-assets/${id}`, { method: 'DELETE' });
  },
  getMediaStats() {
    return request<MediaStats>('/media-assets/stats');
  },
  getMediaExpirations() {
    return request<ExpirationOverview>('/media-assets/expirations');
  },
  analyzeMediaAsset(id: string) {
    return request<ConflictAnalysis>(`/media-assets/${id}/analysis`);
  },
  startMediaAssetAnalysis(id: string) {
    return request<MediaAsset>(`/media-assets/${id}/start-analysis`, { method: 'POST' });
  },
  listActivities(limit = 30, offset = 0) {
    return request<Page<ActivityLog>>(`/activities${queryString({ limit, offset })}`);
  },
  listUsers() {
    return request<User[]>('/users');
  },
  createUser(input: UserInput) {
    return request<User>('/users', { method: 'POST', body: JSON.stringify(input) });
  },
  updateUser(id: string, input: Partial<Omit<UserInput, 'username'>>) {
    return request<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  deleteUser(id: string) {
    return request<void>(`/users/${id}`, { method: 'DELETE' });
  },
  listMediaRules() {
    return request<MediaRule[]>('/media-rules');
  },
  createMediaRule(input: MediaRuleInput) {
    return request<MediaRule>('/media-rules', { method: 'POST', body: JSON.stringify(input) });
  },
  updateMediaRule(id: string, input: Partial<Omit<MediaRuleInput, 'media_type'>>) {
    return request<MediaRule>(`/media-rules/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  deleteMediaRule(id: string) {
    return request<void>(`/media-rules/${id}`, { method: 'DELETE' });
  },
  async listApplicationForms(params: { search?: string; limit?: number; offset?: number } = {}): Promise<Page<ApplicationForm>> {
    const result = await request<Page<ApplicationForm> | ApplicationForm[]>(`/application-forms${queryString(params)}`);
    if (!Array.isArray(result)) return result;

    const term = params.search?.trim().toLocaleLowerCase('pt-BR');
    const filtered = term ? result.filter((item) => [
      item.process_code,
      item.company_responsible,
      item.company_cnpj ?? '',
      item.municipal_registration,
      item.property_registration,
      item.street,
      item.district,
    ].some((value) => value.toLocaleLowerCase('pt-BR').includes(term))) : result;
    const offset = params.offset ?? 0;
    const limit = params.limit ?? filtered.length;
    return { items: filtered.slice(offset, offset + limit), total: filtered.length, limit, offset };
  },
  getApplicationFormByAsset(assetId: string) {
    return request<ApplicationForm>(`/application-forms/by-asset/${assetId}`);
  },
  updateApplicationForm(id: string, input: Partial<ApplicationFormInput>) {
    return request<ApplicationForm>(`/application-forms/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  updateLinkedApplicationForm(id: string, input: LinkedApplicationFormUpdate) {
    return request<LinkedApplicationFormResult>(`/application-forms/${id}/linked`, {
      method: 'PATCH', body: JSON.stringify(input),
    });
  },
  deleteApplicationForm(id: string) {
    return request<void>(`/application-forms/${id}`, { method: 'DELETE' });
  },
  getApplicationFormAttachmentDownload(formId: string, attachmentId: string) {
    return request<{ url: string }>(`/application-forms/${formId}/attachments/${attachmentId}/download`);
  },
  listRequirementResponses(search = '', limit = 50, offset = 0) {
    return request<Page<RequirementResponse>>(`/requirement-responses${queryString({ search, limit, offset })}`);
  },
  getRequirementAttachmentDownload(responseId: string, attachmentIndex: number) {
    return request<{ url: string }>(`/requirement-responses/${responseId}/attachments/${attachmentIndex}/download`);
  },
  getRequirementReceipt(responseId: string) {
    return requestPdf(`/requirement-responses/${responseId}/comprovante`);
  },
};
