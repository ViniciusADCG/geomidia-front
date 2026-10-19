// Símbolo do GeoMídia: pino sobre três camadas de mapa, com o quarteirão sob o pino em destaque.
// Redesenho em vetor da logo original. Gera o SVG nas versões para fundo claro e para o menu azul.

export type MarkTone = 'onLight' | 'onDark';

interface Palette {
  pin: string;
  pinCenter: string;
  knock: string;
  middle: [string, string];
  bottom: [string, string];
}

const LIGHT: Palette = {
  pin: '#123a86',
  pinCenter: '#2fb1f0',
  knock: '#ffffff',
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

// Camada de cima: fundo claro (as ruas) com quarteirões; o do centro, sob o pino, em azul forte.
const STREETS_TOP: [string, string] = ['#e2f5fe', '#b9e6fc'];
const BLOCK = '#4fb6f2';
const LOT = '#1a5fc4';

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

function mapBlocks(): string {
  const rounded = (d: string, color: string) => (
    `<path d="${d}" fill="${color}" stroke="${color}" stroke-width=".8" stroke-linejoin="round"/>`
  );
  const isCenter = (row: number, col: number) => row === 1 && col === 1;
  return `${rounded(blocks(0.07, isCenter), BLOCK)}${rounded(blocks(0.07, (row, col) => !isCenter(row, col)), LOT)}`;
}

let uidCounter = 0;

export function geomidiaSymbolSvg(tone: MarkTone = 'onLight'): string {
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
      ${grad('top', STREETS_TOP)}${grad('middle', p.middle)}${grad('bottom', p.bottom)}
      <clipPath id="${uid}-clip"><path d="M50 37 76.5 50 50 63 23.5 50Z"/></clipPath>
    </defs>
    <g transform="translate(50 50) scale(1.55) translate(-50 -42.5)">
      ${layer(9, 'bottom')}
      ${layer(4.5, 'middle')}
      ${layer(0, 'top')}
      <g clip-path="url(#${uid}-clip)">${mapBlocks()}</g>
      <path d="M50 50 39.76 33.25A12 12 0 1 1 60.24 33.25Z" fill="${p.pin}" stroke="${p.knock}" stroke-width="2.5" stroke-linejoin="round" paint-order="stroke"/>
      <circle cx="50" cy="27" r="6.2" fill="${p.knock}"/>
      <circle cx="50" cy="27" r="3.6" fill="${p.pinCenter}"/>
    </g>
  </svg>`;
}
