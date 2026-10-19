// Propostas de símbolo do GeoMídia, em avaliação. Cada uma é um SVG 64x64 que recebe as cores
// por parâmetro para funcionar sobre fundo claro e sobre o azul do menu.
// fg = forma principal, knock = recortes (cor do fundo), accent = amarelo PREFCG.

export interface MarkColors {
  fg: string;
  knock: string;
  accent: string;
}

export interface MarkVariant {
  id: string;
  name: string;
  idea: string;
  svg: (c: MarkColors) => string;
}

export const MARK_TONES: Record<'onLight' | 'onDark', MarkColors> = {
  onLight: { fg: '#283587', knock: '#ffffff', accent: '#ffcc00' },
  onDark: { fg: '#ffffff', knock: '#1b2463', accent: '#ffcc00' },
};

const wrap = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">${body}</svg>`;

export const MARK_VARIANTS: MarkVariant[] = [
  {
    id: 'raio',
    name: 'Pino com raio',
    idea: 'O pino do mapa carrega, dentro dele, o círculo do raio mínimo que o sistema calcula para cada veículo.',
    svg: (c) => wrap(`
      <path d="M32 3C18.7 3 8 13.5 8 26.6 8 44 32 61 32 61s24-17 24-34.4C56 13.5 45.3 3 32 3Z" fill="${c.fg}"/>
      <circle cx="32" cy="26" r="14" fill="${c.knock}"/>
      <circle cx="32" cy="26" r="9" stroke="${c.fg}" stroke-width="2" stroke-dasharray="3.2 2.6"/>
      <circle cx="32" cy="26" r="4" fill="${c.accent}"/>`),
  },
  {
    id: 'placa',
    name: 'Placa inclinada',
    idea: 'Um outdoor visto de frente, com o painel na mesma inclinação da placa PREFCG e um ponto de localização.',
    svg: (c) => wrap(`
      <path d="M17 8h42l-6.5 30H10.5L17 8Z" fill="${c.fg}" stroke="${c.accent}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M33.5 15c-4.4 0-8 3.4-8 7.6 0 5.6 8 11.4 8 11.4s8-5.8 8-11.4c0-4.2-3.6-7.6-8-7.6Z" fill="${c.knock}"/>
      <circle cx="33.5" cy="22.6" r="2.8" fill="${c.fg}"/>
      <rect x="29" y="38" width="6" height="17" fill="${c.fg}"/>
      <rect x="18" y="55" width="28" height="4" rx="2" fill="${c.fg}"/>`),
  },
  {
    id: 'monograma',
    name: 'Monograma G',
    idea: 'Um G geométrico dentro do bloco inclinado da marca da prefeitura; o ponto amarelo marca o local no mapa.',
    svg: (c) => wrap(`
      <path d="M14 6h46l-10 52H4L14 6Z" fill="${c.fg}"/>
      <path d="M43 20.5a13 13 0 1 0 2.4 13.5H33.5" stroke="${c.knock}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" transform="translate(-1 0) skewX(-6)"/>
      <circle cx="44.5" cy="17" r="4.5" fill="${c.accent}"/>`),
  },
  {
    id: 'quadra',
    name: 'Quadra no mapa',
    idea: 'Um recorte da malha urbana: uma quadra ocupada por um veículo, cercada pelo raio que protege a vizinhança.',
    svg: (c) => wrap(`
      <rect x="4" y="4" width="56" height="56" rx="10" fill="${c.fg}"/>
      <path d="M4 23h56M4 41h56M23 4v56M41 4v56" stroke="${c.knock}" stroke-width="3" opacity=".35"/>
      <circle cx="32" cy="32" r="17" stroke="${c.accent}" stroke-width="2.5" stroke-dasharray="4 3"/>
      <rect x="25.5" y="25.5" width="13" height="13" rx="1.5" fill="${c.knock}"/>`),
  },
  {
    id: 'medida',
    name: 'Medida do raio',
    idea: 'O instrumento de medição: o centro do veículo, o limite do raio e a régua amarela entre os dois.',
    svg: (c) => wrap(`
      <circle cx="32" cy="32" r="28" fill="${c.fg}"/>
      <circle cx="32" cy="32" r="19" stroke="${c.knock}" stroke-width="2.5" stroke-dasharray="3.5 3"/>
      <path d="M32 32 45.5 18.5" stroke="${c.accent}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="45.5" cy="18.5" r="4" fill="${c.accent}"/>
      <circle cx="32" cy="32" r="5" fill="${c.knock}"/>`),
  },
];

export function markDataUrl(variant: MarkVariant, tone: keyof typeof MARK_TONES = 'onLight'): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(variant.svg(MARK_TONES[tone]).trim())}`;
}
