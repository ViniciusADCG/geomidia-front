import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { api } from '../services/api';
import type { ActivityLog, ApplicationForm, MediaAsset, MediaRule, MediaStats, Page } from '../types';
import { useMediaStore } from './media';

vi.mock('../services/api', () => ({
  api: {
    listApplicationForms: vi.fn(),
    analyzeMediaAsset: vi.fn(),
    updateApplicationForm: vi.fn(),
    updateLinkedApplicationForm: vi.fn(),
    updateMediaAsset: vi.fn(),
    getMediaAsset: vi.fn(),
    listMediaAssets: vi.fn(),
    listActivities: vi.fn(),
    getMediaStats: vi.fn(),
    listMediaRules: vi.fn(),
  },
}));

const asset = (id: string): MediaAsset => ({
  id,
  process_code: `PROC-${id}`,
  media_type: 'outdoor',
  address: 'Rua Exemplo, 10',
  district: 'Centro',
  latitude: -20.46,
  longitude: -54.61,
  area_m2: 12,
  bottom_height_m: 4,
  radius_meters: 100,
  status: 'novos processos',
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-02T00:00:00Z',
});

const form = (assetId: string, overrides: Partial<ApplicationForm> = {}): ApplicationForm => ({
  id: `form-${assetId}`,
  asset_id: assetId,
  process_code: `PROC-${assetId}`,
  status: 'novos processos',
  company_responsible: 'Empresa Exemplo',
  company_cnpj: '11222333000144',
  municipal_registration: '12345',
  property_registration: '12345678901',
  latitude: -20.46,
  longitude: -54.61,
  street: 'Rua Exemplo',
  number: '10',
  district: 'Centro',
  postal_code: '79002-000',
  media_type: 'outdoor',
  area_m2: 12,
  bottom_height_m: 4,
  number_of_faces: 'Duas',
  requester_email: 'empresa@example.com',
  attachments: [],
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-02T00:00:00Z',
  ...overrides,
});

const activity = (id: string): ActivityLog => ({
  id,
  process_code: `PROC-${id}`,
  activity_type: 'cadastro',
  message: 'Cadastro realizado',
  created_at: '2026-09-01T00:00:00Z',
});

const rule = (id: string): MediaRule => ({
  id,
  media_type: 'outdoor',
  name: 'Outdoor',
  base_radius_meters: 100,
  is_active: true,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-02T00:00:00Z',
});

const stats = (total: number): MediaStats => ({
  total,
  new_processes: total,
  pending: 0,
  approved: 0,
  rejected: 0,
  expiring_soon: 0,
  expired: 0,
  by_type: {},
});

const page = (id: string): Page<MediaAsset> => ({ items: [asset(id)], total: 1, limit: 500, offset: 0 });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function mockLoadAllSuccess() {
  vi.mocked(api.listMediaAssets).mockResolvedValue(page('novo'));
  vi.mocked(api.listActivities).mockResolvedValue({ items: [activity('nova')], total: 1, limit: 30, offset: 0 });
  vi.mocked(api.getMediaStats).mockResolvedValue(stats(1));
  vi.mocked(api.listMediaRules).mockResolvedValue([rule('nova')]);
}

beforeEach(() => {
  setActivePinia(createPinia());
  vi.resetAllMocks();
});

describe('dados necessários ao Dashboard', () => {
  it('carrega estatísticas sem listar 500 veículos e publica antes das atividades', async () => {
    const store = useMediaStore();
    const pending = deferred<Page<ActivityLog>>();
    vi.mocked(api.listActivities).mockReturnValue(pending.promise);
    vi.mocked(api.getMediaStats).mockResolvedValue(stats(2438));
    const loading = store.loadDashboard();
    await Promise.resolve();
    await Promise.resolve();
    expect(store.stats.total).toBe(2438);
    expect(store.loading).toBe(true);
    expect(api.listMediaAssets).not.toHaveBeenCalled();
    expect(api.listMediaRules).not.toHaveBeenCalled();
    pending.resolve({ items: [activity('recente')], total: 1, limit: 30, offset: 0 });
    await loading;
    expect(store.activities[0].id).toBe('recente');
    expect(store.loading).toBe(false);
  });

  it('preserva estatísticas se atividades falham e carrega regras só quando solicitadas', async () => {
    const store = useMediaStore();
    vi.mocked(api.listActivities).mockRejectedValue(new Error('sem atividades'));
    vi.mocked(api.getMediaStats).mockResolvedValue(stats(10));
    vi.mocked(api.listMediaRules).mockResolvedValue([rule('mapa')]);
    await store.loadDashboard();
    expect(store.stats.total).toBe(10);
    expect(store.error).toContain('atividades');
    expect(api.listMediaRules).not.toHaveBeenCalled();
    await store.loadRules();
    expect(store.rules[0].id).toBe('mapa');
    expect(api.listMediaAssets).not.toHaveBeenCalled();
  });
});

describe('carregamento global de mídia', () => {
  it('preserva no Mapa o item selecionado pelo Inventário fora da página global', async () => {
    const store = useMediaStore();
    store.inventoryItems = [asset('fora-da-pagina')];
    store.selectAsset('fora-da-pagina');
    mockLoadAllSuccess();

    await store.loadAll();

    expect(store.selectedAsset?.id).toBe('fora-da-pagina');
    expect(store.assets.map((item) => item.id)).toEqual(['novo', 'fora-da-pagina']);
  });

  it('reutiliza a carga em andamento para chamadas simultâneas equivalentes', async () => {
    const store = useMediaStore();
    const pending = deferred<Page<MediaAsset>>();
    mockLoadAllSuccess();
    vi.mocked(api.listMediaAssets).mockReturnValue(pending.promise);

    const first = store.loadAll();
    const second = store.loadAll();
    expect(store.loading).toBe(true);
    expect(api.listMediaAssets).toHaveBeenCalledTimes(1);
    expect(api.listActivities).toHaveBeenCalledTimes(1);
    expect(api.getMediaStats).toHaveBeenCalledTimes(1);
    expect(api.listMediaRules).toHaveBeenCalledTimes(1);

    pending.resolve(page('novo'));
    await Promise.all([first, second]);
    expect(store.loading).toBe(false);
    expect(store.assets[0].id).toBe('novo');
  });

  it('aproveita três recursos bem-sucedidos quando um falha', async () => {
    const store = useMediaStore();
    mockLoadAllSuccess();
    store.activities = [activity('anterior')];
    vi.mocked(api.listActivities).mockRejectedValue(new Error('API indisponível'));

    await expect(store.loadAll()).rejects.toThrow('atividades');
    expect(store.assets[0].id).toBe('novo');
    expect(store.stats.total).toBe(1);
    expect(store.rules[0].id).toBe('nova');
    expect(store.activities[0].id).toBe('anterior');
    expect(store.error).toContain('API indisponível');
    expect(store.loading).toBe(false);
  });

  it('preserva os dados anteriores quando uma atualização falha por completo', async () => {
    const store = useMediaStore();
    store.assets = [asset('anterior')];
    store.assetTotal = 4;
    store.activities = [activity('anterior')];
    store.stats = stats(4);
    store.rules = [rule('anterior')];
    vi.mocked(api.listMediaAssets).mockRejectedValue(new Error('sem conexão'));
    vi.mocked(api.listActivities).mockRejectedValue(new Error('sem conexão'));
    vi.mocked(api.getMediaStats).mockRejectedValue(new Error('sem conexão'));
    vi.mocked(api.listMediaRules).mockRejectedValue(new Error('sem conexão'));

    await expect(store.loadAll()).rejects.toThrow('sem conexão');
    expect(store.assets[0].id).toBe('anterior');
    expect(store.assetTotal).toBe(4);
    expect(store.activities[0].id).toBe('anterior');
    expect(store.stats.total).toBe(4);
    expect(store.rules[0].id).toBe('anterior');
    expect(store.loading).toBe(false);
  });

  it('ignora uma resposta antiga que termina depois da carga forçada mais recente', async () => {
    const store = useMediaStore();
    const oldRequest = deferred<Page<MediaAsset>>();
    mockLoadAllSuccess();
    vi.mocked(api.listMediaAssets).mockReturnValueOnce(oldRequest.promise).mockResolvedValueOnce(page('recente'));

    const oldLoad = store.loadAll();
    await store.loadAll(true);
    expect(store.assets[0].id).toBe('recente');

    oldRequest.resolve(page('antigo'));
    await oldLoad;
    expect(store.assets[0].id).toBe('recente');
    expect(store.loading).toBe(false);
  });

  it('mantém loading enquanto a carga mais recente ainda está pendente', async () => {
    const store = useMediaStore();
    const oldRequest = deferred<Page<MediaAsset>>();
    const newRequest = deferred<Page<MediaAsset>>();
    mockLoadAllSuccess();
    vi.mocked(api.listMediaAssets).mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise);

    const oldLoad = store.loadAll();
    const newLoad = store.loadAll(true);
    oldRequest.resolve(page('antigo'));
    await oldLoad;
    expect(store.loading).toBe(true);
    expect(store.assets).toEqual([]);

    newRequest.resolve(page('recente'));
    await newLoad;
    expect(store.loading).toBe(false);
    expect(store.assets[0].id).toBe('recente');
  });
});

describe('atualização de ApplicationForms', () => {
  it('preserva formulários durante refresh com erro e permite tentar novamente', async () => {
    const store = useMediaStore();
    const pending = deferred<ApplicationForm[]>();
    store.applicationForms = [form('anterior')];
    store.applicationFormsLoaded = true;
    vi.mocked(api.listApplicationForms).mockReturnValueOnce(pending.promise).mockResolvedValueOnce([form('recente')]);

    const refresh = store.loadApplicationFormsForMap(true);
    expect(store.applicationFormsLoading).toBe(true);
    expect(store.applicationFormsLoaded).toBe(true);
    expect(store.applicationForms[0].asset_id).toBe('anterior');
    pending.reject(new Error('Falha na atualização'));
    await refresh;
    expect(store.applicationForms[0].asset_id).toBe('anterior');
    expect(store.applicationFormsLoaded).toBe(true);
    expect(store.applicationFormsError).toBe('Falha na atualização');
    expect(store.applicationFormsLoading).toBe(false);

    await store.loadApplicationFormsForMap();
    expect(api.listApplicationForms).toHaveBeenCalledTimes(2);
    expect(store.applicationForms[0].asset_id).toBe('recente');
    expect(store.applicationFormsError).toBeNull();
  });
});

describe('detalhes do ativo selecionado no mapa', () => {
  it('mantém o cadastro manual editável e atualiza o ativo selecionado no mapa', async () => {
    const store = useMediaStore();
    store.assets = [asset('manual')];
    const updatedAsset = { ...asset('manual'), address: 'Rua Nova, 20', official_process_code: '54321/2026' };
    vi.mocked(api.updateMediaAsset).mockResolvedValue(updatedAsset);
    vi.mocked(api.listActivities).mockResolvedValue({ items: [], total: 0, limit: 30, offset: 0 });
    vi.mocked(api.getMediaStats).mockResolvedValue({
      total: 1, new_processes: 1, pending: 0, approved: 0, rejected: 0,
      expiring_soon: 0, expired: 0, by_type: {},
    });
    store.selectAsset('manual');

    await store.updateAsset('manual', { address: 'Rua Nova, 20', official_process_code: '54321/2026' });

    expect(store.selectedAsset?.address).toBe('Rua Nova, 20');
    expect(store.selectedAsset?.official_process_code).toBe('54321/2026');
    expect(store.selectedApplicationForm).toBeNull();
  });

  it('atualiza formulário e veículo no mesmo store após salvar protocolo oficial', async () => {
    const store = useMediaStore();
    store.assets = [asset('forms')];
    store.applicationForms = [form('forms')];
    const updatedForm = form('forms', { company_responsible: 'Empresa Atualizada' });
    const updatedAsset = {
      ...asset('forms'), company_responsible: 'Empresa Atualizada',
      official_process_code: '12345/2026',
    };
    vi.mocked(api.updateLinkedApplicationForm).mockResolvedValue({ form: updatedForm, asset: updatedAsset });
    vi.mocked(api.listActivities).mockResolvedValue({ items: [], total: 0, limit: 30, offset: 0 });
    vi.mocked(api.getMediaStats).mockResolvedValue({
      total: 1, new_processes: 1, pending: 0, approved: 0, rejected: 0,
      expiring_soon: 0, expired: 0, by_type: {},
    });

    await store.updateLinkedAsset('forms', 'form-forms', {
      company_responsible: 'Empresa Atualizada',
    }, { official_process_code: '12345/2026' });

    expect(api.updateLinkedApplicationForm).toHaveBeenCalledWith('form-forms', {
      form: { company_responsible: 'Empresa Atualizada' },
      asset: { official_process_code: '12345/2026' },
    });
    expect(api.updateApplicationForm).not.toHaveBeenCalled();
    expect(api.updateMediaAsset).not.toHaveBeenCalled();
    expect(api.getMediaAsset).not.toHaveBeenCalled();
    expect(api.listActivities).toHaveBeenCalledTimes(1);
    expect(api.getMediaStats).toHaveBeenCalledTimes(1);
    expect(store.assets[0].process_code).toBe('PROC-forms');
    expect(store.assets[0].official_process_code).toBe('12345/2026');
    expect(store.applicationForms[0].company_responsible).toBe('Empresa Atualizada');
  });

  it('falha atômica mantém formulário e ativo locais e informa erro sem PATCH de recuperação', async () => {
    const store = useMediaStore();
    store.assets = [asset('forms')];
    store.applicationForms = [form('forms')];
    vi.mocked(api.updateLinkedApplicationForm).mockRejectedValue(new Error('Falha na gravação'));

    await expect(store.updateLinkedAsset('forms', 'form-forms', {
      company_responsible: 'Empresa Nova',
    }, { official_process_code: '12345/2026' })).rejects.toThrow('Falha na gravação');

    expect(store.assets[0].official_process_code).toBeUndefined();
    expect(store.applicationForms[0].company_responsible).toBe('Empresa Exemplo');
    expect(store.error).toBe('Falha na gravação');
    expect(store.saving).toBe(false);
    expect(api.updateApplicationForm).not.toHaveBeenCalled();
    expect(api.updateMediaAsset).not.toHaveBeenCalled();
    expect(api.getMediaAsset).not.toHaveBeenCalled();
    expect(api.listApplicationForms).not.toHaveBeenCalled();
  });

  it('salva com uma chamada e aceita refresh posterior', async () => {
    const store = useMediaStore();
    store.assets = [asset('forms')];
    store.applicationForms = [form('forms')];
    const savedAsset = { ...asset('forms'), official_process_code: '999/2026' };
    vi.mocked(api.updateLinkedApplicationForm).mockResolvedValue({ form: form('forms'), asset: savedAsset });
    vi.mocked(api.listActivities).mockResolvedValue({ items: [], total: 0, limit: 30, offset: 0 });
    vi.mocked(api.getMediaStats).mockResolvedValue(stats(1));
    vi.mocked(api.listMediaAssets).mockResolvedValue(page('forms'));
    vi.mocked(api.listMediaRules).mockResolvedValue([]);

    await store.updateLinkedAsset('forms', 'form-forms', {}, { official_process_code: '999/2026' });
    expect(store.assets[0].official_process_code).toBe('999/2026');
    await store.loadAll(true);
    expect(api.updateLinkedApplicationForm).toHaveBeenCalledTimes(1);
    expect(api.listMediaAssets).toHaveBeenCalledTimes(1);
    expect(store.loading).toBe(false);
    expect(store.saving).toBe(false);
  });

  it('associa o formulário e os anexos ao ativo vindo do FORMS GEO', async () => {
    const store = useMediaStore();
    store.assets = [asset('forms')];
    const attachment = {
      id: 'anexo-1', category: 'requerimentoPadrao', original_filename: 'requerimento.pdf',
      content_type: 'application/pdf', size_bytes: 1024, created_at: '2026-09-01T00:00:00Z',
    };
    vi.mocked(api.listApplicationForms).mockResolvedValue([form('forms', { attachments: [attachment] })]);

    store.selectAsset('forms');
    await store.loadApplicationFormsForMap();

    expect(store.selectedAsset?.id).toBe('forms');
    expect(store.selectedApplicationForm?.attachments).toEqual([attachment]);
  });

  it('aceita formulário sem campos opcionais e ativo manual sem formulário', async () => {
    const store = useMediaStore();
    store.assets = [asset('forms'), asset('manual')];
    vi.mocked(api.listApplicationForms).mockResolvedValue([
      form('forms', { company_cnpj: null, number_of_faces: null, attachments: [] }),
    ]);
    await store.loadApplicationFormsForMap();

    store.selectAsset('forms');
    expect(store.selectedApplicationForm?.company_cnpj).toBeNull();
    expect(store.selectedApplicationForm?.attachments).toEqual([]);

    store.selectAsset('manual');
    expect(store.selectedAsset?.id).toBe('manual');
    expect(store.selectedApplicationForm).toBeNull();
  });

  it('mantém o último marcador selecionado durante um carregamento pendente', async () => {
    const store = useMediaStore();
    store.assets = [asset('primeiro'), asset('segundo')];
    let resolveForms!: (forms: ApplicationForm[]) => void;
    vi.mocked(api.listApplicationForms).mockReturnValue(new Promise((resolve) => { resolveForms = resolve; }));

    store.selectAsset('primeiro');
    const loading = store.loadApplicationFormsForMap();
    store.selectAsset('segundo');
    resolveForms([form('primeiro'), form('segundo')]);
    await loading;

    expect(store.selectedAsset?.id).toBe('segundo');
    expect(store.selectedApplicationForm?.asset_id).toBe('segundo');
    expect(api.listApplicationForms).toHaveBeenCalledTimes(1);
  });

  it('usa a mesma seleção ao alternar entre Inventário e marcador e permite fechar', () => {
    const store = useMediaStore();
    store.assets = [asset('inventario'), asset('marcador')];

    store.selectAsset('inventario');
    expect(store.selectedAsset?.id).toBe('inventario');
    store.selectAsset('marcador');
    expect(store.selectedAsset?.id).toBe('marcador');
    store.selectAsset(null);
    expect(store.selectedAsset).toBeNull();
  });
});
