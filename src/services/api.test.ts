import { beforeEach, describe, expect, it, vi } from 'vitest';

import { advanceSessionEpoch, api, ApiError } from './api';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  vi.stubGlobal('sessionStorage', { getItem: () => 'token-A' });
  vi.stubGlobal('localStorage', { getItem: () => null });
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  vi.stubGlobal('CustomEvent', class {
    constructor(public type: string, public options: { detail: { token: string | null } }) {}
  });
});

describe('respostas de autorização da API', () => {
  it('emite encerramento para 401 da sessão atual', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401, ok: false, json: async () => null }));

    await expect(api.me()).rejects.toMatchObject({ status: 401 } satisfies Partial<ApiError>);
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'geomidia:unauthorized', options: { detail: { token: 'token-A' } },
    }));
  });

  it('não emite encerramento para 403', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 403, ok: false, json: async () => null }));

    await expect(api.me()).rejects.toMatchObject({ status: 403 } satisfies Partial<ApiError>);
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });

  it('ignora 401 de requisição iniciada antes da troca de sessão', async () => {
    const response = deferred<Response>();
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(response.promise));
    const oldRequest = api.me();
    advanceSessionEpoch();
    response.resolve({ status: 401, ok: false, json: async () => null } as Response);

    await expect(oldRequest).rejects.toMatchObject({ status: 401 } satisfies Partial<ApiError>);
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });
});

describe('listagem paginada de veículos', () => {
  it('envia paginação, busca e filtros com os nomes aceitos pelo backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200, ok: true,
      json: async () => ({ items: [], total: 0, limit: 50, offset: 50 }),
    }));

    await api.listMediaAssets({
      search: 'PROC 123', mediaType: 'outdoor', status: 'aprovado',
      district: 'Centro', company: 'Empresa Exemplo', limit: 50, offset: 50,
    });

    const url = new URL(vi.mocked(fetch).mock.calls[0][0] as string);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      search: 'PROC 123', media_type: 'outdoor', status: 'aprovado',
      district: 'Centro', company: 'Empresa Exemplo', limit: '50', offset: '50',
    });
  });
});

describe('listagem paginada de solicitações recebidas', () => {
  it('envia busca, limite e offset para o backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200, ok: true, json: async () => ({ items: [], total: 0, limit: 25, offset: 25 }),
    }));
    await api.listApplicationForms({ search: 'PROC 123', limit: 25, offset: 25 });
    const url = new URL(vi.mocked(fetch).mock.calls[0][0] as string);
    expect(url.pathname).toBe('/api/application-forms');
    expect(Object.fromEntries(url.searchParams)).toEqual({ search: 'PROC 123', limit: '25', offset: '25' });
  });
});

describe('API espacial do Mapa', () => {
  it('envia bounds, zoom e filtros para endpoints espaciais sem limit global', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200, ok: true, json: async () => ({ items: [], clusters: [], total: 0, too_many: false, max_items: 1000 }),
    }));
    const viewport = { north: -20.45, south: -20.47, east: -54.60, west: -54.62, zoom: 12 };
    const filters = { mediaType: 'outdoor' as const, status: 'aprovado' as const, company: 'Empresa Exemplo' };
    await api.listMapAssets(viewport, filters);
    await api.listMapClusters(viewport, filters);
    const urls = vi.mocked(fetch).mock.calls.map((call) => new URL(call[0] as string));
    expect(urls.map((url) => url.pathname)).toEqual(['/api/media-assets/map', '/api/media-assets/map/clusters']);
    expect(Object.fromEntries(urls[0].searchParams)).toEqual({
      north: '-20.45', south: '-20.47', east: '-54.6', west: '-54.62',
      media_type: 'outdoor', status: 'aprovado', company: 'Empresa Exemplo',
    });
    expect(urls[1].searchParams.get('zoom')).toBe('12');
    expect(urls[1].searchParams.has('limit')).toBe(false);
  });

  it('busca empresas e formulário somente pelos endpoints dedicados', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => [] }));
    await api.listMapCompanyOptions();
    await api.getApplicationFormByAsset('asset-1');
    expect(vi.mocked(fetch).mock.calls.map((call) => new URL(call[0] as string).pathname)).toEqual([
      '/api/media-assets/map/company-options', '/api/application-forms/by-asset/asset-1',
    ]);
  });
});
