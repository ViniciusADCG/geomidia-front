import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../services/api';
import type { ApplicationForm, Page } from '../types';
import { useApplicationFormList } from './application-form-list';

vi.mock('../services/api', () => ({ api: { listApplicationForms: vi.fn() } }));

const form = (id: string) => ({ id, asset_id: `asset-${id}`, attachments: [] }) as unknown as ApplicationForm;
const result = (ids: string[], total = ids.length): Page<ApplicationForm> => ({
  items: ids.map(form), total, limit: 50, offset: 0,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
  vi.mocked(api.listApplicationForms).mockResolvedValue(result(['primeiro'], 101));
});

describe('Solicitações Recebidas paginadas', () => {
  it('carrega primeira e segunda páginas usando total do servidor', async () => {
    const list = useApplicationFormList();
    await list.load();
    expect(api.listApplicationForms).toHaveBeenCalledWith({ search: '', limit: 50, offset: 0 });
    expect(list.pageCount.value).toBe(3);
    list.changePage(2);
    await vi.waitFor(() => expect(api.listApplicationForms).toHaveBeenLastCalledWith({ search: '', limit: 50, offset: 50 }));
    expect(list.page.value).toBe(2);
  });

  it('usa 25, 50 e 100 e volta à primeira página ao mudar tamanho', async () => {
    const list = useApplicationFormList();
    await list.load();
    list.changePage(2);
    list.changePageSize(25);
    expect(api.listApplicationForms).toHaveBeenLastCalledWith({ search: '', limit: 25, offset: 0 });
    expect(list.page.value).toBe(1);
    list.changePageSize(100);
    expect(api.listApplicationForms).toHaveBeenLastCalledWith({ search: '', limit: 100, offset: 0 });
    expect(list.pageSize.value).toBe(100);
  });

  it('envia busca ao backend, aplica debounce e reinicia a página', async () => {
    vi.useFakeTimers();
    const list = useApplicationFormList();
    list.page.value = 3;
    list.scheduleSearch('Emp');
    list.scheduleSearch('Empresa');
    await vi.advanceTimersByTimeAsync(349);
    expect(api.listApplicationForms).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(api.listApplicationForms).toHaveBeenCalledTimes(1);
    expect(api.listApplicationForms).toHaveBeenCalledWith({ search: 'Empresa', limit: 50, offset: 0 });
    expect(list.page.value).toBe(1);
  });

  it('mantém dados durante refresh e ignora resposta antiga', async () => {
    const list = useApplicationFormList();
    await list.load();
    const old = deferred<Page<ApplicationForm>>();
    const newer = deferred<Page<ApplicationForm>>();
    vi.mocked(api.listApplicationForms).mockReturnValueOnce(old.promise).mockReturnValueOnce(newer.promise);
    const firstRefresh = list.load();
    expect(list.items.value[0].id).toBe('primeiro');
    const secondRefresh = list.load();
    newer.resolve(result(['novo'], 2));
    await secondRefresh;
    old.resolve(result(['antigo'], 2));
    await firstRefresh;
    expect(list.items.value[0].id).toBe('novo');
    expect(list.loading.value).toBe(false);
  });

  it('mantém página e busca no refresh; após mutação recarrega só a página atual', async () => {
    const list = useApplicationFormList();
    await list.load();
    list.page.value = 2;
    list.search.value = 'Empresa';
    await list.load();
    vi.mocked(api.listApplicationForms).mockClear();
    await list.load();
    expect(api.listApplicationForms).toHaveBeenCalledTimes(1);
    expect(api.listApplicationForms).toHaveBeenCalledWith({ search: 'Empresa', limit: 50, offset: 50 });
  });

  it('recua após exclusão do último item da última página', async () => {
    const list = useApplicationFormList();
    await list.load();
    list.page.value = 3;
    vi.mocked(api.listApplicationForms)
      .mockResolvedValueOnce(result([], 100))
      .mockResolvedValueOnce(result(['anterior'], 100));
    await list.load();
    expect(list.page.value).toBe(2);
    expect(list.items.value[0].id).toBe('anterior');
    expect(api.listApplicationForms).toHaveBeenLastCalledWith({ search: '', limit: 50, offset: 50 });
  });

  it('distingue lista vazia e erro, sem apagar dados anteriores na falha', async () => {
    const list = useApplicationFormList();
    vi.mocked(api.listApplicationForms).mockResolvedValueOnce(result([]));
    await list.load();
    expect(list.loaded.value).toBe(true);
    expect(list.total.value).toBe(0);
    vi.mocked(api.listApplicationForms).mockResolvedValueOnce(result(['preservado']));
    await list.load();
    vi.mocked(api.listApplicationForms).mockRejectedValueOnce(new Error('Falha de rede'));
    await list.load();
    expect(list.error.value).toBe('Falha de rede');
    expect(list.items.value[0].id).toBe('preservado');
  });
});
