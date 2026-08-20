import { describe, expect, it } from 'vitest';

import {
  DECISION_STATUS_OPTIONS,
  MEDIA_TYPE_OPTIONS,
  STATUS_OPTIONS,
  getRequiredRadius,
  mediaTypeLabel,
  mediaTypeOptionsFromRules,
  statusLabel,
} from './rules';
import type { MediaRule } from '../types';

describe('regras territoriais apresentadas no frontend', () => {
  it('calcula os limites do painel eletrônico modular de pequeno porte', () => {
    expect(getRequiredRadius('painel de led', 5)).toBe(250);
    expect(getRequiredRadius('painel de led', 5.01)).toBe(1000);
  });

  it('aplica raio fixo ao painel eletrônico modular', () => {
    expect(getRequiredRadius('painel eletronico modular', 1)).toBe(1000);
    expect(getRequiredRadius('painel eletronico modular', 100)).toBe(1000);
  });

  it('mantém os rótulos de todos os tipos', () => {
    expect(mediaTypeLabel('front light')).toBe('Painel Iluminado - Front Light');
    expect(mediaTypeLabel('triface')).toBe('Painel Iluminado - Triface');
    expect(mediaTypeLabel('painel de led')).toBe('Painel Eletrônico Modular - Pequeno Porte');
    expect(mediaTypeLabel('painel eletronico modular')).toBe('Painel Eletrônico Modular');
    expect(mediaTypeLabel('empena de led')).toBe('Empena Eletrônica');
  });

  it('usa as regras ativas nos campos de novo cadastro', () => {
    const rules = MEDIA_TYPE_OPTIONS.map((option, index) => ({
      id: String(index),
      media_type: option.value,
      name: option.title,
      base_radius_meters: 80,
      is_active: option.value !== 'empena',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    })) satisfies MediaRule[];

    expect(mediaTypeOptionsFromRules(rules)).toEqual(
      MEDIA_TYPE_OPTIONS.filter((option) => option.value !== 'empena'),
    );
  });

  it('apresenta Novos Processos apenas como status inicial', () => {
    expect(STATUS_OPTIONS[0]).toEqual({ title: 'Novos Processos', value: 'novos processos' });
    expect(DECISION_STATUS_OPTIONS.some((option) => option.value === 'novos processos')).toBe(false);
    expect(statusLabel('novos processos')).toBe('Novos Processos');
  });
});
