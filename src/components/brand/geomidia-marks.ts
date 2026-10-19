// Variações da logo atual do GeoMídia (selo com pino sobre camadas de mapa), redesenhadas em vetor.
// Todas mantêm a mesma composição; mudam acabamento, paleta e presença do selo e do nome.

export type MarkTone = 'onLight' | 'onDark';

export interface MarkVariant {
  id: string;
  name: string;
  idea: string;
  svg: (tone?: MarkTone) => string;
}

interface Palette {
  ring: [string, string];
  pin: string;
  pinCenter: string;
  top: [string, string];
  middle: [string, string];
  bottom: [string, string];
  geo: string;
  midia: string;
}

const ORIGINAL: Palette = {
  ring: ['#2a7be0', '#0e3a8c'],
  pin: '#123a86',
  pinCenter: '#2fb1f0',
  top: ['#8fd8fb', '#45b4f2'],
  middle: ['#2f86e6', '#1a63c9'],
  bottom: ['#163f8f', '#0d2b66'],
  geo: '#123a86',
  midia: '#1b8ae6',
};

const PREFEITURA: Palette = {
  ring: ['#283587', '#283587'],
  pin: '#283587',
  pinCenter: '#ffcc00',
  top: ['#c3cbf3', '#9ba7e6'],
  middle: ['#4f5fc0', '#3a4aa8'],
  bottom: ['#1b2463', '#1b2463'],
  geo: '#283587',
  midia: '#4f5fc0',
};

// Versão sobre o azul do menu, para a variação sem selo branco.
const ON_DARK: Palette = {
  ...ORIGINAL,
  pin: '#ffffff',
  bottom: ['#5b7fd6', '#3f63bd'],
};

interface Options {
  palette: Palette;
  gradient: boolean;
  badge: boolean;
  wordmark: boolean;
}

let uidCounter = 0;

function build({ palette, gradient, badge, wordmark }: Options, tone: MarkTone): string {
  const p = !badge && tone === 'onDark' ? ON_DARK : palette;
  const uid = `gm${(uidCounter += 1)}`;
  const fill = (name: string, [a, b]: [string, string]) => (gradient && a !== b ? `url(#${uid}-${name})` : a);
  const grad = (name: string, [a, b]: [string, string]) => (
    gradient && a !== b
      ? `<linearGradient id="${uid}-${name}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
      : ''
  );
  // Cor dos recortes do pino: o branco do selo, ou o fundo quando não há selo.
  const knock = badge || tone === 'onLight' ? '#ffffff' : '#1b2463';

  const layer = (dy: number, color: string) => (
    `<path d="M50 ${38.5 + dy} 74 ${50 + dy} 50 ${61.5 + dy} 26 ${50 + dy}Z" fill="${color}" stroke="${color}" stroke-width="3.5" stroke-linejoin="round"/>`
  );

  const symbol = `
    ${layer(9, fill('bottom', p.bottom))}
    ${layer(4.5, fill('middle', p.middle))}
    ${layer(0, fill('top', p.top))}
    <g clip-path="url(#${uid}-clip)" stroke="#ffffff" stroke-linecap="round" fill="none" opacity=".92">
      <path d="M24 52.5C33 50 39 46 50 46.5s17 4.5 26 2" stroke-width="2"/>
      <path d="M33 43.5 57 55" stroke-width="1.2"/>
      <path d="M45 40.5 66 50.5" stroke-width="1.2"/>
    </g>
    <path d="M50 50 39.76 33.25A12 12 0 1 1 60.24 33.25Z" fill="${p.pin}" stroke="${knock}" stroke-width="2.5" stroke-linejoin="round" paint-order="stroke"/>
    <circle cx="50" cy="27" r="6.2" fill="${knock}"/>
    <circle cx="50" cy="27" r="3.6" fill="${p.pinCenter}"/>`;

  const defs = `<defs>
    ${grad('ring', p.ring)}${grad('top', p.top)}${grad('middle', p.middle)}${grad('bottom', p.bottom)}
    <clipPath id="${uid}-clip"><path d="M50 38.5 74 50 50 61.5 26 50Z"/></clipPath>
  </defs>`;

  let body: string;
  if (badge) {
    const ring = `<circle cx="50" cy="50" r="46" fill="#ffffff" stroke="${fill('ring', p.ring)}" stroke-width="5"/>`;
    body = wordmark
      ? `${ring}<g transform="translate(50 39.5) scale(.9) translate(-50 -42.5)">${symbol}</g>
         <text x="50" y="81" text-anchor="middle" textLength="50" lengthAdjust="spacingAndGlyphs" font-family="Onest Variable, Onest, ui-sans-serif, system-ui, sans-serif" font-size="13.5" font-weight="700"><tspan fill="${p.geo}">Geo</tspan><tspan fill="${p.midia}">Mídia</tspan></text>`
      : `${ring}<g transform="translate(50 52) scale(1.22) translate(-50 -42.5)">${symbol}</g>`;
  } else {
    body = `<g transform="translate(50 50) scale(1.55) translate(-50 -42.5)">${symbol}</g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${defs}${body}</svg>`;
}

export const MARK_VARIANTS: MarkVariant[] = [
  {
    id: 'degrade',
    name: 'Degradê refinado',
    idea: 'A mais próxima da atual: mesmo selo, degradês e nome, redesenhados em vetor com camadas alinhadas e ruas limpas.',
    svg: (tone = 'onLight') => build({ palette: ORIGINAL, gradient: true, badge: true, wordmark: true }, tone),
  },
  {
    id: 'chapada',
    name: 'Cores chapadas',
    idea: 'O mesmo desenho sem degradês. Fica mais nítida em tamanho pequeno e em impressão.',
    svg: (tone = 'onLight') => build({ palette: ORIGINAL, gradient: false, badge: true, wordmark: true }, tone),
  },
  {
    id: 'prefeitura',
    name: 'Cores da prefeitura',
    idea: 'O mesmo desenho com o azul e o amarelo do manual PREFCG; o miolo amarelo do pino conversa com a placa da prefeitura.',
    svg: (tone = 'onLight') => build({ palette: PREFEITURA, gradient: false, badge: true, wordmark: true }, tone),
  },
  {
    id: 'selo',
    name: 'Selo sem texto',
    idea: 'O selo com pino e camadas maiores, sem o nome dentro. Feito para o menu e o ícone da aba, onde o nome já aparece ao lado.',
    svg: (tone = 'onLight') => build({ palette: ORIGINAL, gradient: true, badge: true, wordmark: false }, tone),
  },
  {
    id: 'simbolo',
    name: 'Só o símbolo',
    idea: 'Pino e camadas sem o selo. Ocupa todo o espaço e se adapta ao fundo azul do menu.',
    svg: (tone = 'onLight') => build({ palette: ORIGINAL, gradient: true, badge: false, wordmark: false }, tone),
  },
];

export function markDataUrl(variant: MarkVariant, tone: MarkTone = 'onLight'): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(variant.svg(tone).trim())}`;
}
