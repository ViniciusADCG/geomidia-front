import { describe, expect, it } from 'vitest';

import { calendarDayDifference, formatDate } from './format';

describe('formatação de datas', () => {
  it('formata vencimentos sem deslocamento de fuso horário', () => {
    expect(formatDate('2027-05-20')).toBe('20/05/2027');
  });

  it('exibe um marcador quando não há vencimento', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('calcula dias corridos sem interferência do fuso horário', () => {
    expect(calendarDayDifference('2026-08-20', '2026-11-18')).toBe(90);
    expect(calendarDayDifference('2026-08-20', '2026-08-19')).toBe(-1);
  });
});
