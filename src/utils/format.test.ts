import { describe, expect, it } from 'vitest';

import { formatDate } from './format';

describe('formatação de datas', () => {
  it('formata vencimentos sem deslocamento de fuso horário', () => {
    expect(formatDate('2027-05-20')).toBe('20/05/2027');
  });

  it('exibe um marcador quando não há vencimento', () => {
    expect(formatDate(null)).toBe('—');
  });
});
