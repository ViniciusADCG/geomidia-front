import { beforeEach, describe, expect, it, vi } from 'vitest';

import { advanceSessionEpoch, api, ApiError } from './api';
import type { ApplicationForm } from '../types';

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

describe('compatibilidade da listagem de solicitações', () => {
  const form = (id: string, fields: Partial<ApplicationForm> = {}) => ({
    id, process_code: `PROC-${id}`, company_responsible: 'Empresa', company_cnpj: null,
    municipal_registration: '', property_registration: '', street: '', district: '',
    ...fields,
  }) as ApplicationForm;

  function respondWith(payload: unknown) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200, ok: true, json: async () => payload,
    }));
  }

  it('preserva a resposta paginada do backend novo', async () => {
    const page = { items: [form('2')], total: 20, limit: 1, offset: 1 };
    respondWith(page);
    expect(await api.listApplicationForms({ search: 'empresa', limit: 1, offset: 1 })).toEqual(page);
  });

  it('normaliza o array antigo e aplica offset e limit', async () => {
    respondWith([form('1'), form('2'), form('3')]);
    expect(await api.listApplicationForms({ limit: 1, offset: 1 })).toEqual({
      items: [form('2')], total: 3, limit: 1, offset: 1,
    });
  });

  it('aplica a busca antiga antes de calcular total e página', async () => {
    respondWith([
      form('1', { company_responsible: 'Outra' }),
      form('2', { street: 'Rua das Flores' }),
      form('3', { property_registration: 'FLORES-3' }),
      form('4', { district: 'Flores' }),
    ]);
    expect(await api.listApplicationForms({ search: '  FLORES  ', limit: 1, offset: 1 })).toEqual({
      items: [form('3', { property_registration: 'FLORES-3' })],
      total: 3, limit: 1, offset: 1,
    });
  });

  it('aceita array antigo vazio, inclusive com busca', async () => {
    respondWith([]);
    expect(await api.listApplicationForms({ search: 'empresa', limit: 25, offset: 0 })).toEqual({
      items: [], total: 0, limit: 25, offset: 0,
    });
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

describe('reavaliação individual de raio', () => {
  it('busca prévia e confirma somente o ativo escolhido com motivo e valores esperados', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => ({}) }));
    await api.previewRadiusReassessment('asset-1');
    await api.confirmRadiusReassessment('asset-1', {
      reason: 'Área real conferida no processo',
      expected_registered_radius_meters: 250,
      expected_rule_updated_at: '2026-10-14T10:00:00Z',
    });
    const calls = vi.mocked(fetch).mock.calls;
    expect(calls.map((call) => new URL(call[0] as string).pathname)).toEqual([
      '/api/media-assets/asset-1/radius-reassessment',
      '/api/media-assets/asset-1/radius-reassessment',
    ]);
    expect(calls[0][1]?.method).toBeUndefined();
    expect(calls[1][1]?.method).toBe('POST');
    expect(JSON.parse(String(calls[1][1]?.body))).toMatchObject({
      reason: 'Área real conferida no processo', expected_registered_radius_meters: 250,
    });
  });
});


describe('filtros de múltiplos tipos', () => {
  it('envia parâmetros repetidos nas três consultas e omite seleção vazia', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200, ok: true, json: async () => ({}),
    }));
    const mediaTypes = ['outdoor', 'front light'] as const;
    const viewport = { north: -20, south: -21, east: -54, west: -55, zoom: 12 };
    await api.listMediaAssets({ mediaTypes: [...mediaTypes] });
    await api.listMapAssets(viewport, { mediaTypes: [...mediaTypes] });
    await api.listMapClusters(viewport, { mediaTypes: [...mediaTypes] });
    for (const [url] of vi.mocked(fetch).mock.calls) {
      expect(new URL(String(url)).searchParams.getAll('media_types')).toEqual(mediaTypes);
    }
    vi.mocked(fetch).mockClear();
    await api.listMediaAssets({ mediaTypes: [] });
    expect(new URL(String(vi.mocked(fetch).mock.calls[0][0])).searchParams.has('media_types')).toBe(false);
  });
});
