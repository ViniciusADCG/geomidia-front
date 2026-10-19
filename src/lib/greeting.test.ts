import { describe, expect, it } from 'vitest';

import { dayPeriod, firstName, welcomeMessage } from './greeting';

const at = (hour: number, minute = 0) => new Date(2026, 9, 19, hour, minute);

describe('dayPeriod', () => {
  it('starts the morning at 5h and the afternoon at noon', () => {
    expect(dayPeriod(at(4, 59))).toBe('noite');
    expect(dayPeriod(at(5))).toBe('manha');
    expect(dayPeriod(at(11, 59))).toBe('manha');
    expect(dayPeriod(at(12))).toBe('tarde');
  });

  it('starts the night at 18h and keeps it past midnight', () => {
    expect(dayPeriod(at(17, 59))).toBe('tarde');
    expect(dayPeriod(at(18))).toBe('noite');
    expect(dayPeriod(at(0))).toBe('noite');
  });
});

describe('welcomeMessage', () => {
  it('greets by first name', () => {
    expect(welcomeMessage('Ana Paula Souza', at(9))).toBe('Bom dia, Ana');
    expect(welcomeMessage('Administrador GeoMídia', at(15))).toBe('Boa tarde, Administrador');
  });

  it('greets without a name when none is known', () => {
    expect(welcomeMessage(null, at(20))).toBe('Boa noite');
    expect(welcomeMessage('   ', at(20))).toBe('Boa noite');
    expect(firstName(undefined)).toBe('');
  });
});
