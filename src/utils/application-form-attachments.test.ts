import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '../services/api';
import { attachmentCategoryLabel, openApplicationFormAttachment } from './application-form-attachments';

vi.mock('../services/api', () => ({
  api: { getApplicationFormAttachmentDownload: vi.fn() },
}));

afterEach(() => vi.unstubAllGlobals());

describe('anexos privados do formulário', () => {
  it('solicita uma URL temporária para o formulário e anexo escolhidos', async () => {
    const opened = { opener: {}, location: { replace: vi.fn() }, close: vi.fn() };
    const open = vi.fn().mockReturnValue(opened);
    vi.stubGlobal('window', { open });
    vi.mocked(api.getApplicationFormAttachmentDownload).mockResolvedValue({ url: 'https://storage.example/signed?token=short' });

    await openApplicationFormAttachment('form-1', 'anexo-1');

    expect(api.getApplicationFormAttachmentDownload).toHaveBeenCalledWith('form-1', 'anexo-1');
    expect(open).toHaveBeenCalledWith('about:blank', '_blank');
    expect(opened.location.replace).toHaveBeenCalledWith('https://storage.example/signed?token=short');
    expect(opened.opener).toBeNull();
  });

  it('mostra a categoria conhecida ou a categoria recebida da API', () => {
    expect(attachmentCategoryLabel('artRrt')).toBe('ART/RRT');
    expect(attachmentCategoryLabel('fotoAdicional')).toBe('fotoAdicional');
  });

  it('fecha a aba vazia quando a API não libera o anexo', async () => {
    const opened = { opener: {}, location: { replace: vi.fn() }, close: vi.fn() };
    vi.stubGlobal('window', { open: vi.fn().mockReturnValue(opened) });
    vi.mocked(api.getApplicationFormAttachmentDownload).mockRejectedValue(new Error('Acesso negado'));

    await expect(openApplicationFormAttachment('form-1', 'anexo-1')).rejects.toThrow('Acesso negado');
    expect(opened.close).toHaveBeenCalledOnce();
    expect(opened.location.replace).not.toHaveBeenCalled();
  });
});
