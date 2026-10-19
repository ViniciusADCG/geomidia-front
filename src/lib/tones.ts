// Tons semânticos usados por selos e destaques. As chaves são os nomes que domain/rules.ts
// já devolve (herdados do Vuetify), para não mexer na lógica de domínio.
export type Tone = 'info' | 'success' | 'error' | 'warning' | 'primary' | 'neutral';

export const toneBadgeClasses: Record<Tone, string> = {
  info: 'bg-sky-100 text-sky-900',
  success: 'bg-success-soft text-success',
  error: 'bg-danger-soft text-destructive',
  warning: 'bg-warning-soft text-warning',
  primary: 'bg-secondary text-primary',
  neutral: 'bg-muted text-muted-foreground',
};

export const toneTextClasses: Record<Tone, string> = {
  info: 'text-sky-800',
  success: 'text-success',
  error: 'text-destructive',
  warning: 'text-warning',
  primary: 'text-primary',
  neutral: 'text-muted-foreground',
};

export function asTone(value: string): Tone {
  return value in toneBadgeClasses ? (value as Tone) : 'neutral';
}
