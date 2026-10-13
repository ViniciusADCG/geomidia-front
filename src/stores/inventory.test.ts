import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { api } from '../services/api';
import type { ApplicationForm, MediaAsset, MediaAssetInput, Page } from '../types';
import { useMediaStore } from './media';

vi.mock('../services/api', () => ({
  api: {
    listMediaAssets: vi.fn(),
    createMediaAsset: vi.fn(),
    updateLinkedApplicationForm: vi.fn(),
    updateApplicationForm: vi.fn(),
    updateMediaAsset: vi.fn(),
    listActivities: vi.fn(),
    getMediaStats: vi.fn(),
  },
}));

const asset = (id: string): MediaAsset => ({
  id, process_code: `PROC-${id}`, media_type: 'outdoor', address: 'Rua Exemplo',
  district: 'Centro', latitude: -20.46, longitude: -54.61, area_m2: null,
  bottom_height_m: null, radius_meters: 80, status: 'novos processos',
  created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z',
});

const page = (ids: string[], total = ids.length): Page<MediaAsset> => ({
  items: ids.map(asset), total, limit: 50, offset: 0,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  setActivePinia(createPinia());
  vi.resetAllMocks();
  vi.useRealTimers();
  vi.mocked(api.listMediaAssets).mockResolvedValue(page(['primeiro'], 101));
  vi.mocked(api.listActivities).mockResolvedValue({ items: [], total: 0, limit: 30, offset: 0 });
  vi.mocked(api.getMediaStats).mockResolvedValue({
    total: 101, new_processes: 0, pending: 0, approved: 0, rejected: 0,
    expiring_soon: 0, expired: 0, by_type: {},
  });
});

describe('Inventário paginado', () => {
  it('consulta a primeira página com 50 itens e calcula páginas pelo total do servidor', async () => {
    const store = useMediaStore();
    await store.loadInventory();
    expect(api.listMediaAssets).toHaveBeenCalledWith({
      search: undefined, mediaType: undefined, status: undefined, limit: 50, offset: 0,
    });
    expect(store.inventoryTotal).toBe(101);
    expect(store.inventoryPageCount).toBe(3);
    expect(store.inventoryItems[0].id).toBe('primeiro');
    expect(store.assets).toEqual([]);
  });

  it('busca novos dados ao mudar para a página 2 e usa offset 50', async () => {
    const store = useMediaStore();
    await store.loadInventory();
    vi.mocked(api.listMediaAssets).mockResolvedValueOnce(page(['segundo'], 101));
    await store.changeInventoryPage(2);
    expect(api.listMediaAssets).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 50, offset: 50 }));
    expect(store.inventoryItems[0].id).toBe('segundo');
    expect(store.inventoryPage).toBe(2);
  });

  it('envia busca ao backend, volta à página 1 e agrupa digitação em 350 ms', async () => {
    vi.useFakeTimers();
    const store = useMediaStore();
    store.inventoryPage = 3;
    store.scheduleInventorySearch('Em');
    store.scheduleInventorySearch('Empresa');
    await vi.advanceTimersByTimeAsync(349);
    expect(api.listMediaAssets).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(api.listMediaAssets).toHaveBeenCalledTimes(1);
    expect(api.listMediaAssets).toHaveBeenCalledWith(expect.objectContaining({ search: 'Empresa', offset: 0 }));
    expect(store.inventoryPage).toBe(1);
  });

  it('envia filtros existentes ao backend e volta à página 1', async () => {
    const store = useMediaStore();
    store.inventoryPage = 2;
    await store.changeInventoryType('outdoor');
    expect(api.listMediaAssets).toHaveBeenLastCalledWith(expect.objectContaining({ mediaType: 'outdoor', offset: 0 }));
    store.inventoryPage = 2;
    await store.changeInventoryStatus('aprovado');
    expect(api.listMediaAssets).toHaveBeenLastCalledWith(expect.objectContaining({
      mediaType: 'outdoor', status: 'aprovado', offset: 0,
    }));
    expect(store.inventoryPage).toBe(1);
  });

  it('muda o tamanho da página, volta à primeira e preserva filtros', async () => {
    const store = useMediaStore();
    store.inventoryPage = 3;
    store.inventoryTypeFilter = 'outdoor';
    await store.changeInventoryPageSize(25);
    expect(store.inventoryPage).toBe(1);
    expect(store.inventoryPageCount).toBe(5);
    expect(api.listMediaAssets).toHaveBeenLastCalledWith(expect.objectContaining({
      limit: 25, offset: 0, mediaType: 'outdoor',
    }));
  });

  it('ignora uma resposta antiga, mantendo a página e loading da consulta recente', async () => {
    const store = useMediaStore();
    const old = deferred<Page<MediaAsset>>();
    const recent = deferred<Page<MediaAsset>>();
    vi.mocked(api.listMediaAssets).mockReturnValueOnce(old.promise).mockReturnValueOnce(recent.promise);
    const first = store.loadInventory();
    const second = store.changeInventoryPage(2);
    old.resolve(page(['antigo'], 120));
    await first;
    expect(store.inventoryLoading).toBe(true);
    expect(store.inventoryItems).toEqual([]);
    recent.resolve(page(['recente'], 120));
    await second;
    expect(store.inventoryItems[0].id).toBe('recente');
    expect(store.inventoryPage).toBe(2);
    expect(store.inventoryLoading).toBe(false);
  });

  it('mantém estado consistente e oferece nova tentativa após erro', async () => {
    const store = useMediaStore();
    vi.mocked(api.listMediaAssets).mockRejectedValueOnce(new Error('Sem conexão'));
    await store.loadInventory();
    expect(store.inventoryItems).toEqual([]);
    expect(store.inventoryTotal).toBe(0);
    expect(store.inventoryLoading).toBe(false);
    expect(store.inventoryError).toBe('Sem conexão');
    await store.refreshInventory();
    expect(store.inventoryError).toBeNull();
    expect(store.inventoryTotal).toBe(101);
  });

  it('atualiza a página atual após salvar e mantém busca, filtro e tamanho', async () => {
    const store = useMediaStore();
    store.inventoryPage = 2;
    store.inventoryPageSize = 25;
    store.inventorySearch = 'PROC-20';
    store.inventorySearchDraft = 'PROC-20';
    store.inventoryStatusFilter = 'aprovado';
    await store.reloadInventoryAfterMutation();
    expect(api.listMediaAssets).toHaveBeenLastCalledWith(expect.objectContaining({
      search: 'PROC-20', status: 'aprovado', limit: 25, offset: 25,
    }));
    expect(store.inventoryPage).toBe(2);
  });

  it('reconsulta após uma criação ou edição bem-sucedida e não reconsulta se a gravação falha', async () => {
    const store = useMediaStore();
    store.inventoryPage = 2;
    const save = vi.fn().mockResolvedValue(asset('manual'));
    await store.runInventoryMutation(save);
    expect(save).toHaveBeenCalledOnce();
    expect(api.listMediaAssets).toHaveBeenCalledWith(expect.objectContaining({ offset: 50 }));
    vi.mocked(api.listMediaAssets).mockClear();
    await expect(store.runInventoryMutation(() => Promise.reject(new Error('Falha ao salvar'))))
      .rejects.toThrow('Falha ao salvar');
    expect(api.listMediaAssets).not.toHaveBeenCalled();
  });

  it('mantém o cadastro manual e recarrega o Inventário após criar', async () => {
    const store = useMediaStore();
    const input = { address: 'Rua Nova' } as MediaAssetInput;
    vi.mocked(api.createMediaAsset).mockResolvedValue(asset('manual'));
    await store.runInventoryMutation(() => store.createAsset(input));
    expect(api.createMediaAsset).toHaveBeenCalledWith(input);
    expect(api.listMediaAssets).toHaveBeenCalledWith(expect.objectContaining({ limit: 50, offset: 0 }));
    expect(store.assets[0].id).toBe('manual');
  });

  it('mantém o PATCH atômico vinculado e recarrega a página atual', async () => {
    const store = useMediaStore();
    store.inventoryPage = 2;
    const linkedAsset = asset('vinculado');
    const linkedForm = { id: 'form-vinculado', asset_id: 'vinculado' } as ApplicationForm;
    vi.mocked(api.updateLinkedApplicationForm).mockResolvedValue({ form: linkedForm, asset: linkedAsset });
    await store.runInventoryMutation(() => store.updateLinkedAsset(
      'vinculado', 'form-vinculado', { company_responsible: 'Empresa Nova' }, { width_m: 9 },
    ));
    expect(api.updateLinkedApplicationForm).toHaveBeenCalledWith('form-vinculado', {
      form: { company_responsible: 'Empresa Nova' }, asset: { width_m: 9 },
    });
    expect(api.updateApplicationForm).not.toHaveBeenCalled();
    expect(api.updateMediaAsset).not.toHaveBeenCalled();
    expect(api.listMediaAssets).toHaveBeenCalledWith(expect.objectContaining({ offset: 50 }));
    expect(store.inventoryPage).toBe(2);
  });

  it('após excluir o último item de uma página, retorna à última página válida', async () => {
    const store = useMediaStore();
    store.inventoryPage = 4;
    vi.mocked(api.listMediaAssets)
      .mockResolvedValueOnce(page([], 150))
      .mockResolvedValueOnce(page(['anterior'], 150));
    await store.reloadInventoryAfterMutation();
    expect(store.inventoryPage).toBe(3);
    expect(api.listMediaAssets).toHaveBeenNthCalledWith(1, expect.objectContaining({ offset: 150 }));
    expect(api.listMediaAssets).toHaveBeenNthCalledWith(2, expect.objectContaining({ offset: 100 }));
    expect(store.inventoryItems[0].id).toBe('anterior');
    expect(store.inventoryTotal).toBe(150);
  });

  it('não muda página nem filtros ao atualizar manualmente', async () => {
    const store = useMediaStore();
    store.inventoryPage = 2;
    store.inventoryTypeFilter = 'outdoor';
    store.inventorySearch = 'Rua';
    store.inventorySearchDraft = 'Rua';
    await store.refreshInventory();
    expect(api.listMediaAssets).toHaveBeenLastCalledWith(expect.objectContaining({
      offset: 50, limit: 50, search: 'Rua', mediaType: 'outdoor',
    }));
    expect(store.inventoryPage).toBe(2);
  });

  it('não restaura dados de uma sessão encerrada', async () => {
    const store = useMediaStore();
    const old = deferred<Page<MediaAsset>>();
    vi.mocked(api.listMediaAssets).mockReturnValueOnce(old.promise);
    const request = store.loadInventory();
    store.clearSessionData();
    old.resolve(page(['sessão anterior'], 1));
    await request;
    expect(store.inventoryItems).toEqual([]);
    expect(store.inventoryTotal).toBe(0);
    expect(store.inventoryLoading).toBe(false);
  });

  it('mantém visível no Mapa o veículo escolhido fora dos primeiros 500', () => {
    const store = useMediaStore();
    store.assets = [asset('primeira página global')];
    store.inventoryItems = [asset('página 2')];
    store.selectAsset('página 2');
    expect(store.selectedAsset?.id).toBe('página 2');
    expect(store.assets.map((item) => item.id)).toEqual(['primeira página global', 'página 2']);
  });
});
