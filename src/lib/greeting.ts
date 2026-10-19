export type DayPeriod = 'manha' | 'tarde' | 'noite';

// Manhã das 5h às 11h59, tarde do meio-dia às 17h59, noite no resto do tempo.
export function dayPeriod(date: Date): DayPeriod {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'manha';
  if (hour >= 12 && hour < 18) return 'tarde';
  return 'noite';
}

const GREETINGS: Record<DayPeriod, string> = {
  manha: 'Bom dia',
  tarde: 'Boa tarde',
  noite: 'Boa noite',
};

export function greetingFor(period: DayPeriod): string {
  return GREETINGS[period];
}

export function firstName(fullName: string | null | undefined): string {
  return (fullName ?? '').trim().split(/\s+/)[0] ?? '';
}

export function welcomeMessage(fullName: string | null | undefined, date: Date): string {
  const greeting = greetingFor(dayPeriod(date));
  const name = firstName(fullName);
  return name ? `${greeting}, ${name}` : greeting;
}

// Despedida ao sair do painel.
export function farewellMessage(fullName: string | null | undefined): string {
  const name = firstName(fullName);
  return name ? `Até logo, ${name}` : 'Até logo';
}
