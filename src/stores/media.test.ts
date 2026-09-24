import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { api } from '../services/api';
import type { ApplicationForm, MediaAsset } from '../types';
import { useMediaStore } from './media';

vi.mock('../services/api', () => ({
  api: {
    listApplicationForms: vi.fn(),
    analyzeMediaAsset: vi.fn(),
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

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe('detalhes do ativo selecionado no mapa', () => {
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
