import type { MediaStatus, MediaType } from '../types';

export const MEDIA_TYPE_OPTIONS: Array<{ title: string; value: MediaType }> = [
  { title: 'Outdoor', value: 'outdoor' },
  { title: 'Front Light', value: 'front light' },
  { title: 'Triface', value: 'triface' },
  { title: 'Painel de LED', value: 'painel de led' },
  { title: 'Empena', value: 'empena' },
  { title: 'Empena de LED', value: 'empena de led' },
];

export const STATUS_OPTIONS: Array<{ title: string; value: MediaStatus }> = [
  { title: 'Pendente', value: 'Pendente' },
  { title: 'Aprovado', value: 'Aprovado' },
  { title: 'Reprovado', value: 'Reprovado' },
];

export const DISTRICT_OPTIONS = [
  'Centro',
  'Vila Nasser',
  'Monte Castelo',
  'Lago do Amor',
  'Aero Rancho',
  'Santa Fé',
  'Coophafé',
  'Coronel Antonino',
  'Vila Alba',
];

export function getRequiredRadius(mediaType: MediaType, areaM2: number): number {
  if (mediaType === 'painel de led') return areaM2 > 5 ? 1000 : 250;
  if (mediaType === 'empena de led') return 1000;
  return 80;
}

export function mediaTypeLabel(mediaType: MediaType): string {
  return MEDIA_TYPE_OPTIONS.find((item) => item.value === mediaType)?.title ?? mediaType;
}

export function mediaTypeColor(mediaType: MediaType): string {
  const colors: Record<MediaType, string> = {
    outdoor: '#2f80ed',
    'front light': '#219653',
    triface: '#7b61ff',
    'painel de led': '#f2994a',
    empena: '#d9468f',
    'empena de led': '#0e9f9a',
  };
  return colors[mediaType];
}

export function statusColor(status: MediaStatus): string {
  if (status === 'Aprovado') return 'success';
  if (status === 'Reprovado') return 'error';
  return 'warning';
}
