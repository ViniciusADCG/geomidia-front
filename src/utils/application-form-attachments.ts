import { api } from '../services/api';

const categoryLabels: Record<string, string> = {
  alvaraLocalizacao: 'Alvará de localização',
  requerimentoPadrao: 'Requerimento padrão',
  autorizacaoProprietario: 'Autorização do proprietário',
  documentoProprietario: 'Documento do proprietário',
  projetoEstrutural: 'Projeto estrutural',
  projetoImplantacao: 'Projeto de implantação',
  artRrt: 'ART/RRT',
};

export function attachmentCategoryLabel(category: string): string {
  return categoryLabels[category] ?? category;
}

export async function openApplicationFormAttachment(formId: string, attachmentId: string): Promise<void> {
  const opened = window.open('about:blank', '_blank');
  if (!opened) throw new Error('Permita abrir novas abas para visualizar o anexo.');
  opened.opener = null;
  try {
    const { url } = await api.getApplicationFormAttachmentDownload(formId, attachmentId);
    opened.location.replace(url);
  } catch (error) {
    opened.close();
    throw error;
  }
}
