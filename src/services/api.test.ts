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
