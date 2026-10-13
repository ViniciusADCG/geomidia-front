import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { ApiError, api } from '../services/api';
import type { MapAssetPage, MapClusterPage, MapViewport, MediaAsset } from '../types';
import { useMapStore } from './map';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ApiError: actual.ApiError, api: {
    listMapAssets: vi.fn(), listMapClusters: vi.fn(), listMapCompanyOptions: vi.fn(),
    getMediaAsset: vi.fn(), getApplicationFormByAsset: vi.fn(),
  } };
});

const viewport: MapViewport = { north: -20.45, south: -20.47, east: -54.60, west: -54.62, zoom: 12 };
const asset = (id: string, linked = false): MediaAsset => ({
  id, process_code: `PROC-${id}`, media_type: 'outdoor', status: 'aprovado',
  address: 'Rua Exemplo', district: 'Centro', latitude: -20.46, longitude: -54.61,
  radius_meters: 80, area_m2: null, bottom_height_m: null,
  company_responsible: linked ? 'Empresa Exemplo' : null,
  created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z',
});
const individual = (id: string): MapAssetPage => ({
  items: [{ id, process_code: `PROC-${id}`, official_process_code: null,
    media_type: 'outdoor', status: 'aprovado', latitude: -20.46, longitude: -54.61,
    radius_meters: 80, company_responsible: null, contact_name: null }],
  total: 1, too_many: false, max_items: 1000,
});
const dense: MapAssetPage = { items: [], total: 5237, too_many: true, max_items: 1000 };
const grouped: MapClusterPage = { clusters: [
  { id: '12:1:1', count: 5000, latitude: -20.46, longitude: -54.61 },
  { id: '12:2:1', count: 237, latitude: -20.46, longitude: -54.605 },
], total: 5237 };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  setActivePinia(createPinia());
  vi.resetAllMocks();
  vi.mocked(api.listMapAssets).mockResolvedValue(individual('one'));
  vi.mocked(api.listMapClusters).mockResolvedValue(grouped);
  vi.mocked(api.listMapCompanyOptions).mockResolvedValue([]);
});

describe('estado espacial do Mapa', () => {
  it('consulta a viewport e mostra veículos com raio individual sem carregar páginas globais', async () => {
    const store = useMapStore();
    await store.loadViewport(viewport);
    expect(api.listMapAssets).toHaveBeenCalledWith(viewport, {});
    expect(api.listMapClusters).not.toHaveBeenCalled();
    expect(store.items[0].radius_meters).toBe(80);
    expect(store.total).toBe(1);
    expect(store.tooMany).toBe(false);
  });

  it('usa clusters do servidor para viewport densa e representa todo o total', async () => {
    vi.mocked(api.listMapAssets).mockResolvedValue(dense);
    const store = useMapStore();
    await store.loadViewport(viewport);
    expect(api.listMapClusters).toHaveBeenCalledWith(viewport, {});
    expect(store.items).toEqual([]);
    expect(store.clusters.map((cluster) => cluster.count)).toEqual([5000, 237]);
    expect(store.total).toBe(5237);
    expect(store.tooMany).toBe(true);
  });

  it('mantém os veículos anteriores até a nova viewport estar pronta e preserva-os em erro', async () => {
    const store = useMapStore();
    await store.loadViewport(viewport);
    const pending = deferred<MapAssetPage>();
    vi.mocked(api.listMapAssets).mockReturnValueOnce(pending.promise);
    const next = { ...viewport, east: -54.59 };
    expect(store.stageViewport(next, {})).toBe(true);
    expect(store.items[0].id).toBe('one');
    const request = store.loadViewport(next);
    expect(store.items[0].id).toBe('one');
    pending.resolve(individual('two'));
    await request;
    expect(store.items[0].id).toBe('two');

    vi.mocked(api.listMapAssets).mockRejectedValueOnce(new Error('Falha'));
    await store.loadViewport({ ...next, east: -54.58 });
    expect(store.items[0].id).toBe('two');
    expect(store.error).toBe('Falha');
  });

  it('mantém clusters durante a transição para nova viewport individual', async () => {
    vi.mocked(api.listMapAssets).mockResolvedValueOnce(dense);
    const store = useMapStore();
    await store.loadViewport(viewport);
    const pending = deferred<MapAssetPage>();
    vi.mocked(api.listMapAssets).mockReturnValueOnce(pending.promise);
    const next = { ...viewport, zoom: 16 };
    store.stageViewport(next, {});
    const request = store.loadViewport(next);
    expect(store.clusters).toHaveLength(2);
    expect(store.tooMany).toBe(true);
    pending.resolve(individual('close'));
    await request;
    expect(store.clusters).toEqual([]);
    expect(store.items[0].id).toBe('close');
  });

  it('deduplica eventos equivalentes e mantém refresh manual explícito', async () => {
    const store = useMapStore();
    expect(store.stageViewport(viewport, {})).toBe(true);
    expect(store.stageViewport(viewport, {})).toBe(false);
    const pending = deferred<MapAssetPage>();
    vi.mocked(api.listMapAssets).mockReturnValueOnce(pending.promise);
    const first = store.loadViewport(viewport);
    const duplicate = store.loadViewport(viewport);
    expect(api.listMapAssets).toHaveBeenCalledTimes(1);
    pending.resolve(individual('one'));
    await Promise.all([first, duplicate]);
    expect(store.stageViewport(viewport, {})).toBe(false);
    await store.loadViewport(viewport);
    expect(api.listMapAssets).toHaveBeenCalledTimes(1);
    await store.refreshViewport();
    expect(api.listMapAssets).toHaveBeenCalledTimes(2);
  });

  it('envia filtros, preserva viewport e filtros no refresh e troca clusters por indivíduos no zoom próximo', async () => {
    const store = useMapStore();
    const filters = { company: 'Empresa Exemplo', mediaType: 'outdoor' as const, status: 'aprovado' as const };
    vi.mocked(api.listMapAssets).mockResolvedValueOnce(dense).mockResolvedValueOnce(individual('zoom'));
    await store.loadViewport(viewport, filters);
    await store.loadViewport({ ...viewport, zoom: 17 }, filters);
    expect(store.clusters).toEqual([]);
    expect(store.items[0].id).toBe('zoom');
    await store.refreshViewport();
    expect(api.listMapAssets).toHaveBeenLastCalledWith({ ...viewport, zoom: 17 }, filters);
  });

  it('ignora resposta antiga de viewport mesmo quando chega após a nova', async () => {
    const old = deferred<MapAssetPage>();
    vi.mocked(api.listMapAssets).mockReturnValueOnce(old.promise).mockResolvedValueOnce(individual('new'));
    const store = useMapStore();
    const first = store.loadViewport(viewport);
    await store.loadViewport({ ...viewport, zoom: 13 });
    old.resolve(individual('old'));
    await first;
    expect(store.items[0].id).toBe('new');
    expect(store.viewport?.zoom).toBe(13);
  });

  it('invalida a resposta anterior assim que uma nova viewport é agendada', async () => {
    const old = deferred<MapAssetPage>();
    vi.mocked(api.listMapAssets).mockReturnValueOnce(old.promise);
    const store = useMapStore();
    const first = store.loadViewport(viewport);
    store.stageViewport({ ...viewport, zoom: 14 }, { company: 'Empresa Exemplo' });
    old.resolve(individual('old'));
    await first;
    expect(store.items).toEqual([]);
    expect(store.viewport?.zoom).toBe(14);
    expect(store.filters.company).toBe('Empresa Exemplo');
  });

  it('ignora clusters antigos e rejeita uma soma incompleta', async () => {
    const old = deferred<MapClusterPage>();
    vi.mocked(api.listMapAssets).mockResolvedValueOnce(dense).mockResolvedValueOnce(individual('new'));
    vi.mocked(api.listMapClusters).mockReturnValueOnce(old.promise);
    const store = useMapStore();
    const first = store.loadViewport(viewport);
    await Promise.resolve();
    await store.loadViewport({ ...viewport, zoom: 16 });
    old.resolve(grouped);
    await first;
    expect(store.items[0].id).toBe('new');
    vi.mocked(api.listMapAssets).mockResolvedValueOnce(dense);
    vi.mocked(api.listMapClusters).mockResolvedValueOnce({ clusters: grouped.clusters.slice(0, 1), total: 5237 });
    await store.refreshViewport();
    expect(store.error).toMatch(/contagem/);
    expect(store.clusters).toEqual([]);
  });

  it('mantém a seleção ao mover a viewport e carrega detalhe e formulário somente por ID', async () => {
    vi.mocked(api.getMediaAsset).mockResolvedValue(asset('linked', true));
    vi.mocked(api.getApplicationFormByAsset).mockResolvedValue({ id: 'form', asset_id: 'linked' } as never);
    const store = useMapStore();
    await store.selectAsset('linked', true);
    await store.loadViewport(viewport);
    await store.loadViewport({ ...viewport, east: -54.59 });
    expect(store.selectedAsset?.id).toBe('linked');
    expect(store.selectedForm?.id).toBe('form');
    expect(api.getMediaAsset).toHaveBeenCalledWith('linked');
    expect(api.getApplicationFormByAsset).toHaveBeenCalledTimes(1);
  });

  it('aceita ativo manual sem formulário e 404 de formulário vinculado', async () => {
    const store = useMapStore();
    vi.mocked(api.getMediaAsset).mockResolvedValueOnce(asset('manual'));
    await store.selectAsset('manual', true);
    expect(api.getApplicationFormByAsset).not.toHaveBeenCalled();
    vi.mocked(api.getMediaAsset).mockResolvedValueOnce(asset('linked', true));
    vi.mocked(api.getApplicationFormByAsset).mockRejectedValueOnce(new ApiError('Não encontrado', 404));
    await store.selectAsset('linked', true);
    expect(store.selectedAsset?.id).toBe('linked');
    expect(store.selectedForm).toBeNull();
    expect(store.formError).toBeNull();
  });

  it('não carrega formulário para visualizador e ignora detalhe antigo após nova seleção', async () => {
    const old = deferred<MediaAsset>();
    vi.mocked(api.getMediaAsset).mockReturnValueOnce(old.promise).mockResolvedValueOnce(asset('new', true));
    const store = useMapStore();
    const first = store.selectAsset('old', false);
    await store.selectAsset('new', false);
    old.resolve(asset('old'));
    await first;
    expect(store.selectedAsset?.id).toBe('new');
    expect(api.getApplicationFormByAsset).not.toHaveBeenCalled();
  });

  it('mantém estado consistente em erro e limpa dados de sessão', async () => {
    vi.mocked(api.listMapAssets).mockRejectedValueOnce(new Error('Falha'));
    const store = useMapStore();
    await store.loadViewport(viewport);
    expect(store.error).toBe('Falha');
    expect(store.loading).toBe(false);
    expect(store.items).toEqual([]);
    store.clearSessionData();
    expect(store.viewport).toBeNull();
    expect(store.selectedAsset).toBeNull();
  });

  it('obtém empresas autorizadas sem depender dos itens da viewport', async () => {
    vi.mocked(api.listMapCompanyOptions).mockResolvedValue(['Empresa Exemplo', 'Oficina Manual']);
    const store = useMapStore();
    await store.loadCompanyOptions();
    expect(store.companyOptions).toEqual(['Empresa Exemplo', 'Oficina Manual']);
    expect(api.listMapAssets).not.toHaveBeenCalled();
  });
});
