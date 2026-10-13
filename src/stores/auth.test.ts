import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { advanceSessionEpoch, api, ApiError } from '../services/api';
import type { ApplicationForm, MediaAsset, Page } from '../types';
import { useAuthStore } from './auth';
import { useMediaStore } from './media';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    advanceSessionEpoch: vi.fn(),
    api: {
      ...actual.api,
      login: vi.fn(),
      me: vi.fn(),
      listMediaAssets: vi.fn(),
      listActivities: vi.fn(),
      getMediaStats: vi.fn(),
      listMediaRules: vi.fn(),
      listApplicationForms: vi.fn(),
      getApplicationFormByAsset: vi.fn(),
    },
  };
});

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => { values.clear(); },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function login(token = 'token-A') {
  vi.mocked(api.login).mockResolvedValueOnce({
    access_token: token,
    token_type: 'bearer',
    user_id: token,
    user_name: `Usuário ${token}`,
    role: 'admin',
    expires_at: '2099-01-01T00:00:00Z',
  });
  await useAuthStore().login('admin', 'password');
}

function loadedMedia() {
  const media = useMediaStore();
  media.assets = [{ id: 'sessao-A' } as MediaAsset];
  media.applicationForms = [{ id: 'form-A' } as ApplicationForm];
  media.applicationFormsLoaded = true;
  media.applicationFormsLoading = true;
  media.applicationFormsError = 'erro antigo';
  media.loading = true;
  media.error = 'erro antigo';
  return media;
}

beforeEach(() => {
  vi.stubGlobal('localStorage', storage());
  vi.stubGlobal('sessionStorage', storage());
  setActivePinia(createPinia());
  vi.resetAllMocks();
});

describe('permissões de interface', () => {
  it('permite ações do inventário ao analista e as oculta do visualizador', () => {
    const auth = useAuthStore();
    auth.role = 'analyst';
    expect(auth.canWrite).toBe(true);
    expect(auth.canDelete).toBe(false);

    auth.role = 'viewer';
    expect(auth.canWrite).toBe(false);
    expect(auth.canDelete).toBe(false);
  });
});

describe('ciclo de sessão', () => {
  it('/auth/me 401 encerra a sessão e limpa credenciais e mídia', async () => {
    await login();
    const auth = useAuthStore();
    const media = loadedMedia();
    vi.mocked(api.me).mockRejectedValueOnce(new ApiError('Não autorizado', 401));

    expect(await auth.validateSession()).toBe(false);
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.userName).toBeNull();
    expect(sessionStorage.getItem('geomidia_token')).toBeNull();
    expect(media.assets).toEqual([]);
    expect(media.applicationForms).toEqual([]);
    expect(media.applicationFormsLoaded).toBe(false);
    expect(media.applicationFormsLoading).toBe(false);
    expect(media.applicationFormsError).toBeNull();
    expect(media.loading).toBe(false);
    expect(media.error).toBeNull();
  });

  it('/auth/me sem rede preserva a sessão e registra a falha', async () => {
    await login();
    const auth = useAuthStore();
    const media = loadedMedia();
    vi.mocked(api.me).mockRejectedValueOnce(new ApiError('Sem conexão', 0));

    expect(await auth.validateSession()).toBe(true);
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.error).toBe('Sem conexão');
    expect(media.assets[0].id).toBe('sessao-A');
    expect(sessionStorage.getItem('geomidia_token')).toBe('token-A');
  });

  it('/auth/me 500 preserva a sessão', async () => {
    await login();
    const auth = useAuthStore();
    vi.mocked(api.me).mockRejectedValueOnce(new ApiError('API indisponível', 500));

    expect(await auth.validateSession()).toBe(true);
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.error).toBe('API indisponível');
  });

  it('/auth/me 403 registra permissão insuficiente sem encerrar a sessão', async () => {
    await login();
    const auth = useAuthStore();
    vi.mocked(api.me).mockRejectedValueOnce(new ApiError('Permissão insuficiente', 403));

    expect(await auth.validateSession()).toBe(true);
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.error).toBe('Permissão insuficiente');
  });

  it('logout manual usa a mesma limpeza de autenticação e dados administrativos', async () => {
    await login();
    const auth = useAuthStore();
    const media = loadedMedia();
    auth.error = 'erro antigo';

    auth.logout();

    expect(auth.$state).toMatchObject({
      userId: null, userName: null, role: null, token: null, expiresAt: null,
      loading: false, error: null,
    });
    expect(sessionStorage.getItem('geomidia_token')).toBeNull();
    expect(localStorage.getItem('geomidia_token')).toBeNull();
    expect(media.assets).toEqual([]);
    expect(media.applicationForms).toEqual([]);
    expect(media.applicationFormsLoading).toBe(false);
    expect(media.error).toBeNull();
    expect(advanceSessionEpoch).toHaveBeenCalled();
  });

  it('novo login começa sem dados da sessão anterior', async () => {
    await login();
    const auth = useAuthStore();
    const media = loadedMedia();
    auth.logout();
    await login('token-B');

    expect(auth.token).toBe('token-B');
    expect(media.assets).toEqual([]);
    expect(media.applicationForms).toEqual([]);
    expect(media.applicationFormsLoaded).toBe(false);
    expect(media.error).toBeNull();
  });

  it('resposta de loadAll anterior ao logout não restaura dados após novo login', async () => {
    await login();
    const auth = useAuthStore();
    const media = useMediaStore();
    const pending = deferred<Page<MediaAsset>>();
    vi.mocked(api.listMediaAssets).mockReturnValueOnce(pending.promise);
    vi.mocked(api.listActivities).mockResolvedValue({ items: [], total: 0, limit: 30, offset: 0 });
    vi.mocked(api.getMediaStats).mockResolvedValue({
      total: 0, new_processes: 0, pending: 0, approved: 0, rejected: 0,
      expiring_soon: 0, expired: 0, by_type: {},
    });
    vi.mocked(api.listMediaRules).mockResolvedValue([]);

    const oldLoad = media.loadAll();
    auth.logout();
    await login('token-B');
    pending.resolve({ items: [{ id: 'sessao-A' } as MediaAsset], total: 1, limit: 500, offset: 0 });
    await oldLoad;

    expect(media.assets).toEqual([]);
    expect(media.loading).toBe(false);
    expect(media.error).toBeNull();
  });

  it('resposta antiga de ApplicationForms não restaura anexos nem loading', async () => {
    await login();
    const auth = useAuthStore();
    const media = useMediaStore();
    const pending = deferred<ApplicationForm>();
    vi.mocked(api.getApplicationFormByAsset).mockReturnValueOnce(pending.promise);

    const oldLoad = media.loadApplicationFormForInventory('sessao-A');
    auth.logout();
    await login('token-B');
    pending.resolve({ id: 'form-A' } as ApplicationForm);
    await oldLoad;

    expect(media.applicationForms).toEqual([]);
    expect(media.applicationFormsLoaded).toBe(false);
    expect(media.applicationFormsLoading).toBe(false);
    expect(media.applicationFormsError).toBeNull();
  });
});
