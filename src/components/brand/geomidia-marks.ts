// Símbolo do GeoMídia (pino sobre camadas de mapa), redesenhado em vetor a partir da logo atual.
// As variações em avaliação mudam só o desenho da camada de cima, para que ela pareça um mapa.

export type MarkTone = 'onLight' | 'onDark';

export interface MarkVariant {
  id: string;
  name: string;
  idea: string;
  svg: (tone?: MarkTone) => string;
}

type TopStyle = 'malha' | 'quadras' | 'corrego' | 'lote' | 'relevo';

interface Palette {
  pin: string;
  pinCenter: string;
  knock: string;
  top: [string, string];
  middle: [string, string];
  bottom: [string, string];
}

const LIGHT: Palette = {
  pin: '#123a86',
  pinCenter: '#2fb1f0',
  knock: '#ffffff',
  top: ['#8fd8fb', '#45b4f2'],
  middle: ['#2f86e6', '#1a63c9'],
  bottom: ['#163f8f', '#0d2b66'],
};

// Sobre o azul do menu: pino branco e camada de baixo mais clara para não sumir no fundo.
const DARK: Palette = {
  ...LIGHT,
  pin: '#ffffff',
  knock: '#1b2463',
  bottom: ['#5b7fd6', '#3f63bd'],
};

// Cores do "mapa" na camada de cima. Nos estilos com quadras, o fundo da camada fica claro e vira as ruas.
const STREETS_TOP: [string, string] = ['#e2f5fe', '#b9e6fc'];
const BLOCK = '#4fb6f2';
const RIVER = '#2a7fe0';
const LOT = '#1a5fc4';
const ROAD = '#eaf8ff';
const usesStreetsTop = (style: TopStyle) => style === 'quadras' || style === 'corrego' || style === 'lote';

// Coordenadas da camada de cima em perspectiva: (u, v) de 0 a 1 viram um ponto do losango.
const iso = (u: number, v: number) => `${(50 + 24 * (u - v)).toFixed(2)} ${(38.5 + 11.5 * (u + v)).toFixed(2)}`;
const quad = (u0: number, v0: number, u1: number, v1: number) => (
  `M${iso(u0, v0)} L${iso(u1, v0)} L${iso(u1, v1)} L${iso(u0, v1)}Z`
);

function blocks(gap: number, skip: (row: number, col: number) => boolean = () => false): string {
  const size = (1 - gap * 4) / 3;
  const parts: string[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      if (skip(row, col)) continue;
      const u0 = gap + col * (size + gap);
      const v0 = gap + row * (size + gap);
      parts.push(quad(u0, v0, u0 + size, v0 + size));
    }
  }
  return parts.join(' ');
}

function curve(points: Array<[number, number]>): string {
  return points.map(([u, v], index) => `${index ? 'L' : 'M'}${iso(u, v)}`).join(' ');
}

function ellipse(cu: number, cv: number, ru: number, rv: number): string {
  const steps = 36;
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = (i / steps) * Math.PI * 2;
    points.push([cu + ru * Math.cos(a), cv + rv * Math.sin(a)]);
  }
  return `${curve(points)}Z`;
}

function topDetail(style: TopStyle): string {
  const rounded = (d: string, color: string) => (
    `<path d="${d}" fill="${color}" stroke="${color}" stroke-width=".8" stroke-linejoin="round"/>`
  );
  switch (style) {
    case 'malha':
      return `<g stroke="${ROAD}" stroke-width="1.6" stroke-linecap="round">
        <path d="M${iso(1 / 3, 0)} L${iso(1 / 3, 1)} M${iso(2 / 3, 0)} L${iso(2 / 3, 1)} M${iso(0, 1 / 3)} L${iso(1, 1 / 3)} M${iso(0, 2 / 3)} L${iso(1, 2 / 3)}"/>
      </g>`;
    case 'quadras':
      return rounded(blocks(0.07), BLOCK);
    case 'corrego': {
      const river = curve([[0, 0.62], [0.2, 0.55], [0.38, 0.62], [0.55, 0.5], [0.72, 0.42], [0.88, 0.47], [1, 0.4]]);
      return `${rounded(blocks(0.07), BLOCK)}
        <path d="${river}" stroke="${RIVER}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    }
    case 'lote':
      return `${rounded(blocks(0.07, (row, col) => row === 1 && col === 1), BLOCK)}
        ${rounded(blocks(0.07, (row, col) => !(row === 1 && col === 1)), LOT)}`;
    case 'relevo':
      return `<g stroke="${ROAD}" stroke-width="1.1" fill="none">
        <path d="${ellipse(0.66, 0.62, 0.12, 0.1)}"/>
        <path d="${ellipse(0.62, 0.6, 0.24, 0.21)}"/>
        <path d="${ellipse(0.57, 0.57, 0.37, 0.33)}"/>
      </g>`;
  }
}

let uidCounter = 0;

function build(style: TopStyle, tone: MarkTone): string {
  const p = tone === 'onDark' ? DARK : LIGHT;
  const uid = `gm${(uidCounter += 1)}`;
  const grad = (name: string, [a, b]: [string, string]) => (
    `<linearGradient id="${uid}-${name}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
  );
  const layer = (dy: number, name: string) => (
    `<path d="M50 ${38.5 + dy} 74 ${50 + dy} 50 ${61.5 + dy} 26 ${50 + dy}Z" fill="url(#${uid}-${name})" stroke="url(#${uid}-${name})" stroke-width="3.5" stroke-linejoin="round"/>`
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs>
      ${grad('top', usesStreetsTop(style) ? STREETS_TOP : p.top)}${grad('middle', p.middle)}${grad('bottom', p.bottom)}
      <clipPath id="${uid}-clip"><path d="M50 37 76.5 50 50 63 23.5 50Z"/></clipPath>
    </defs>
    <g transform="translate(50 50) scale(1.55) translate(-50 -42.5)">
      ${layer(9, 'bottom')}
      ${layer(4.5, 'middle')}
      ${layer(0, 'top')}
      <g clip-path="url(#${uid}-clip)">${topDetail(style)}</g>
      <path d="M50 50 39.76 33.25A12 12 0 1 1 60.24 33.25Z" fill="${p.pin}" stroke="${p.knock}" stroke-width="2.5" stroke-linejoin="round" paint-order="stroke"/>
      <circle cx="50" cy="27" r="6.2" fill="${p.knock}"/>
      <circle cx="50" cy="27" r="3.6" fill="${p.pinCenter}"/>
    </g>
  </svg>`;
}

const variant = (id: TopStyle, name: string, idea: string): MarkVariant => ({
  id, name, idea, svg: (tone = 'onLight') => build(id, tone),
});

export const MARK_VARIANTS: MarkVariant[] = [
  variant('malha', 'Malha de ruas', 'Ruas finas em grade, seguindo a perspectiva da camada, como um bairro visto de cima.'),
  variant('quadras', 'Quadras', 'Quarteirões preenchidos em azul; o espaço entre eles forma as ruas. Sem traços brancos.'),
  variant('corrego', 'Córrego', 'Quadras cortadas por um córrego curvo, como os que atravessam Campo Grande.'),
  variant('lote', 'Lote marcado', 'Quadras com o quarteirão sob o pino em azul mais forte: o ponto onde está o veículo.'),
  variant('relevo', 'Curvas de nível', 'Linhas de relevo como num mapa topográfico, reforçando o lado GIS do sistema.'),
];

export function markDataUrl(item: MarkVariant, tone: MarkTone = 'onLight'): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(item.svg(tone).replace(/\s+/g, ' ').trim())}`;
}
