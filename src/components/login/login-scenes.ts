// Fundo animado do login ("Cidade Morena"): uma avenida de Campo Grande com mídia exterior (triface,
// outdoor, front light, avião com faixa, dirigível), ipês e araras, que vira dia ou noite conforme o
// horário. No celular não roda: o login fica com a imagem clara. O que não se mexe é desenhado uma vez em camadas guardadas (de dia e de noite) e só misturado.

import { ref, type Ref } from 'vue';

import { useVariant } from '@/composables/useVariant';

export interface LoginScene {
  // Desenha o quadro do tempo t (segundos) na hora do dia `hour` (0 a 24). w e h em px de CSS.
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, hour: number): void;
}

export const LOGIN_HOUR_KEY = 'geomidia_login_hour';

export const LOGIN_HOUR_OPTIONS = [
  { value: 'agora', label: 'Agora', hint: 'Segue o relógio: amanhece e anoitece no horário real.' },
  { value: '6', label: '6h', hint: 'Amanhecer: o sol nasce no horizonte.' },
  { value: '10', label: '10h', hint: 'Manhã.' },
  { value: '13', label: '13h', hint: 'Começo da tarde, sol alto.' },
  { value: '17.8', label: '17h50', hint: 'Pôr do sol.' },
  { value: '21', label: '21h', hint: 'Noite: janelas acesas, faróis e mídias iluminadas.' },
  { value: 'ciclo', label: 'Ciclo', hint: 'Um dia inteiro em 30 segundos.' },
];

// No celular o login fica parado, com o fundo claro em imagem: sem a cidade animada.
export function isPhoneScreen() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
}

// Horário do fundo: em desenvolvimento, o escolhido no painel de teste; no sistema publicado, sempre o
// relógio de verdade.
export function useSceneHourSetting(): Ref<string> {
  return import.meta.env.DEV ? useVariant(LOGIN_HOUR_KEY, 'agora') : ref('agora');
}

// Hora do dia (0 a 24) para a opção escolhida. "ciclo" usa o relógio da página para todas as
// instâncias andarem juntas.
export function sceneHour(setting: string, now = new Date()): number {
  if (setting === 'ciclo') return ((performance.now() / 1000 / 30) * 24 + 5) % 24;
  const fixed = Number(setting);
  if (setting !== 'agora' && Number.isFinite(fixed)) return fixed;
  return now.getHours() + now.getMinutes() / 60;
}

const smooth = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

// 1 de dia, 0 de noite, com amanhecer das 5h20 às 7h e entardecer das 17h20 às 19h.
export function daylight(hour: number) {
  return smooth(5.3, 7, hour) * (1 - smooth(17.3, 19, hour));
}

export function isNightAt(hour: number) {
  return daylight(hour) < 0.45;
}

/* Cores --------------------------------------------------------------------------------------- */

const NAVY = '#283587';
const YELLOW = '#ffcc00';
const SKY_BLUE = '#1b8ae6';
const FONT = '"Onest Variable", ui-sans-serif, system-ui, sans-serif';

type RGB = [number, number, number];
// Aceita '#rrggbb' ou 'rgb(r,g,b)', para dar para misturar uma cor já misturada.
const rgb = (color: string): RGB => (color.startsWith('#')
  ? [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16))
  : color.slice(4, -1).split(',').map(Number)) as RGB;
const mix = (a: string, b: string, k: number) => {
  const [x, y] = [rgb(a), rgb(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',')})`;
};

// Céu ao longo do dia: [hora, topo, horizonte].
const SKY: [number, string, string][] = [
  [0, '#060a24', '#151c52'],
  [4.8, '#0b1240', '#26306e'],
  [5.8, '#2f3f86', '#e89a77'],
  [6.8, '#6f9fdc', '#f7cf9f'],
  [8.5, '#86bff0', '#e2f0fb'],
  [12, '#74b4ee', '#dcecfa'],
  [16, '#83baee', '#efe6d2'],
  [17.6, '#4d68b3', '#f39a5a'],
  [18.5, '#26306f', '#b45a76'],
  [19.6, '#0d1442', '#23296a'],
  [24, '#060a24', '#151c52'],
];

function skyAt(hour: number): [string, string] {
  for (let i = 1; i < SKY.length; i += 1) {
    if (hour <= SKY[i][0]) {
      const [h0, top0, bottom0] = SKY[i - 1];
      const [h1, top1, bottom1] = SKY[i];
      const k = (hour - h0) / (h1 - h0);
      return [mix(top0, top1, k), mix(bottom0, bottom1, k)];
    }
  }
  return [SKY[0][1], SKY[0][2]];
}

/* Utilidades ---------------------------------------------------------------------------------- */

// Sorteio com semente: a mesma cidade em todas as instâncias (login, boas-vindas, saída).
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const RATIO = () => Math.min(window.devicePixelRatio || 1, 2);

function layer(w: number, h: number) {
  const ratio = RATIO();
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * ratio));
  canvas.height = Math.max(1, Math.round(h * ratio));
  const ctx = canvas.getContext('2d')!;
  ctx.scale(ratio, ratio);
  return { canvas, ctx };
}

const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const lap = (t: number, speed: number, offset: number, span: number) => ((t * speed + offset * span) % span + span) % span;

/* Peças de mídia: o conteúdo ----------------------------------------------------------------- */

type Face = 'geomidia' | 'prefcg' | 'semades' | 'morena' | 'feira' | 'bioparque' | 'parque' | 'ipes';

// Conteúdo das mídias, desenhado uma vez por tamanho e guardado.
const faceCache = new Map<string, HTMLCanvasElement>();

function face(kind: Face, w: number, h: number, led = false): HTMLCanvasElement {
  const key = `${kind}|${Math.round(w)}|${Math.round(h)}|${led}`;
  const cached = faceCache.get(key);
  if (cached) return cached;
  if (faceCache.size > 80) faceCache.clear();
  const { canvas, ctx } = layer(w, h);
  const fit = (text: string, weight: string, max: number) => {
    let size = max;
    ctx.font = `${weight} ${size}px ${FONT}`;
    const width = ctx.measureText(text).width;
    if (width > w * 0.82) size *= (w * 0.82) / width;
    ctx.font = `${weight} ${size}px ${FONT}`;
    return size;
  };
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  // Título e linha de apoio, centralizados na área que sobra à direita de um ícone (inset).
  const twoLines = (title: string, subtitle: string, titleColor: string, subtitleColor: string, inset = 0) => {
    const area = w - inset;
    const cx = inset + area / 2;
    let size = h * 0.3;
    ctx.font = `800 ${size}px ${FONT}`;
    const tw = ctx.measureText(title).width;
    if (tw > area * 0.86) size *= (area * 0.86) / tw;
    ctx.font = `800 ${size}px ${FONT}`;
    ctx.fillStyle = titleColor;
    ctx.fillText(title, cx, h * 0.4);
    let small = Math.min(h * 0.17, size * 0.62);
    ctx.font = `600 ${small}px ${FONT}`;
    const sw = ctx.measureText(subtitle).width;
    if (sw > area * 0.86) small *= (area * 0.86) / sw;
    ctx.font = `600 ${small}px ${FONT}`;
    ctx.fillStyle = subtitleColor;
    ctx.fillText(subtitle, cx, h * 0.71);
  };
  const gradient = (top: string, bottom: string) => {
    const fill = ctx.createLinearGradient(0, 0, 0, h);
    fill.addColorStop(0, top);
    fill.addColorStop(1, bottom);
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, w, h);
  };
  switch (kind) {
    case 'morena': {
      // Cidade Morena: a terra vermelha de Campo Grande, com o sol se pondo.
      gradient('#c4562a', '#6e2812');
      ctx.fillStyle = 'rgba(255, 204, 0, 0.85)';
      ctx.beginPath();
      ctx.arc(w * 0.86, h * 0.95, h * 0.42, Math.PI, 0);
      ctx.fill();
      twoLines('Cidade Morena', 'Campo Grande, MS', '#ffffff', YELLOW);
      break;
    }
    case 'feira': {
      gradient('#13236b', '#0a1440');
      // Tigela de sobá com hashis.
      const bx = h * 0.62;
      const by = h * 0.52;
      const r = h * 0.3;
      ctx.strokeStyle = '#e7c48a';
      ctx.lineWidth = Math.max(1.5, h * 0.04);
      ctx.beginPath();
      ctx.moveTo(bx - r * 0.2, by - r * 1.15);
      ctx.lineTo(bx + r * 0.7, by - r * 0.05);
      ctx.moveTo(bx + r * 0.15, by - r * 1.2);
      ctx.lineTo(bx + r * 0.95, by - r * 0.1);
      ctx.stroke();
      ctx.fillStyle = '#f5f5f5';
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#d84a4a';
      ctx.fillRect(bx - r, by - h * 0.02, r * 2, h * 0.06);
      twoLines('Feira Central', 'o sobá de Campo Grande', '#ffffff', YELLOW, h * 1.15);
      break;
    }
    case 'bioparque': {
      gradient('#0b7ea3', '#073a66');
      ctx.fillStyle = 'rgba(159, 227, 255, 0.55)';
      for (const [fx, fy, fs] of [[0.12, 0.3, 1], [0.2, 0.7, 0.8], [0.88, 0.25, 0.7], [0.9, 0.75, 0.9]] as const) {
        const x = w * fx;
        const y = h * fy;
        const size = h * 0.1 * fs;
        ctx.beginPath();
        ctx.ellipse(x, y, size * 1.6, size, 0, 0, Math.PI * 2);
        ctx.moveTo(x + size * 1.4, y);
        ctx.lineTo(x + size * 2.4, y - size * 0.8);
        ctx.lineTo(x + size * 2.4, y + size * 0.8);
        ctx.fill();
      }
      twoLines('Bioparque Pantanal', 'Campo Grande, MS', '#ffffff', '#9fe3ff');
      break;
    }
    case 'parque': {
      gradient('#2f8a55', '#174a2d');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      for (let i = 0; i < 6; i += 1) {
        ctx.beginPath();
        ctx.arc(w * (0.05 + i * 0.19), h * 1.02, h * (0.28 + (i % 3) * 0.07), Math.PI, 0);
        ctx.fill();
      }
      // Capivara pastando no canto, como no lago do parque.
      const cs = h / 100;
      const cx = 40 * cs;
      const cy = h * 0.86;
      ctx.fillStyle = '#8a5a35';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 15 * cs, 22 * cs, 13 * cs, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(cx - 34 * cs, cy - 30 * cs, 18 * cs, 13 * cs, 5 * cs);
      ctx.fill();
      ctx.fillRect(cx - 18 * cs, cy - 6 * cs, 5 * cs, 8 * cs);
      ctx.fillRect(cx + 9 * cs, cy - 6 * cs, 5 * cs, 8 * cs);
      ctx.fillStyle = '#6e4529';
      ctx.beginPath();
      ctx.ellipse(cx - 20 * cs, cy - 31 * cs, 3 * cs, 2.4 * cs, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a1a10';
      ctx.beginPath();
      ctx.arc(cx - 26 * cs, cy - 26 * cs, 1.4 * cs, 0, Math.PI * 2);
      ctx.arc(cx - 33 * cs, cy - 22 * cs, 1.1 * cs, 0, Math.PI * 2);
      ctx.fill();
      twoLines('Parque das Nações', 'Indígenas', '#ffffff', YELLOW, 72 * cs);
      break;
    }
    case 'ipes': {
      gradient('#ffd23f', '#f2a81d');
      ctx.fillStyle = '#e56ca8';
      for (const [px, py, pr] of [[0.9, 0.3, 0.16], [0.83, 0.5, 0.12], [0.95, 0.6, 0.1], [0.08, 0.75, 0.1]] as const) {
        ctx.beginPath();
        ctx.arc(w * px, h * py, h * pr, 0, Math.PI * 2);
        ctx.fill();
      }
      twoLines('Tempo de ipês', 'Campo Grande floresce', NAVY, '#7a2f12');
      break;
    }
    case 'geomidia': {
      ctx.fillStyle = led ? '#071033' : '#ffffff';
      ctx.fillRect(0, 0, w, h);
      const size = fit('GeoMídia', '800', h * 0.5);
      const geo = ctx.measureText('Geo').width;
      const total = geo + ctx.measureText('Mídia').width;
      const start = (w - total) / 2 + size * 0.2;
      ctx.textAlign = 'left';
      ctx.fillStyle = led ? '#ffffff' : NAVY;
      ctx.fillText('Geo', start, h / 2 + size * 0.04);
      ctx.fillStyle = led ? '#5cc3f7' : SKY_BLUE;
      ctx.fillText('Mídia', start + geo, h / 2 + size * 0.04);
      ctx.save();
      ctx.translate(start - size * 0.42, h / 2);
      ctx.transform(1, 0, -0.21, 1, 0, 0);
      ctx.fillStyle = YELLOW;
      ctx.fillRect(-size * 0.07, -size * 0.5, size * 0.14, size);
      ctx.restore();
      break;
    }
    case 'prefcg': {
      ctx.fillStyle = NAVY;
      ctx.fillRect(0, 0, w, h);
      fit('PREFCG', 'italic 800', h * 0.5);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('PREFCG', w / 2, h * 0.46);
      ctx.fillStyle = YELLOW;
      ctx.fillRect(0, h * 0.84, w, h * 0.16);
      break;
    }
    case 'semades': {
      ctx.fillStyle = YELLOW;
      ctx.fillRect(0, 0, w, h);
      fit('SEMADES', '800', h * 0.46);
      ctx.fillStyle = NAVY;
      ctx.fillText('SEMADES', w / 2, h / 2);
      break;
    }
  }
  if (led) {
    // Grade de pontos do LED.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    for (let x = 0; x < w; x += 3) ctx.fillRect(x, 0, 1, h);
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  }
  faceCache.set(key, canvas);
  return canvas;
}

// Qual face mostrar agora numa sequência que troca a cada `every` segundos.
function cycle(faces: Face[], t: number, every: number, phase: number) {
  const step = (t + phase) / every;
  const index = Math.floor(step);
  return { current: faces[index % faces.length], next: faces[(index + 1) % faces.length], into: (step - index) * every };
}

/* Peças de mídia: as estruturas -------------------------------------------------------------- */

interface Light { dk: number } // 0 de dia, 1 de noite

// Outdoor ou front light: placa sobre postes, girando de face; à noite os refletores acendem.
function board(ctx: CanvasRenderingContext2D, x: number, base: number, w: number, h: number, pole: number, faces: Face[], t: number, phase: number, light: Light, poles = 2, slide = false) {
  const { current, next, into } = cycle(faces, t, 7, phase);
  const turn = !slide && into > 6.4 ? (into - 6.4) / 0.6 : 0;
  const squash = turn ? Math.abs(Math.cos(ease(turn) * Math.PI)) : 1;
  const showing = turn > 0.5 ? next : current;
  const top = base - pole - h;
  const left = x - w / 2;

  ctx.fillStyle = mix('#5d6f96', '#0d1238', light.dk);
  if (poles === 2) {
    ctx.fillRect(x - w * 0.28 - 2, base - pole, 4, pole);
    ctx.fillRect(x + w * 0.28 - 2, base - pole, 4, pole);
  } else {
    ctx.fillRect(x - 3, base - pole, 6, pole);
  }
  // Moldura e passarela.
  ctx.fillRect(left - 3, top + h, w + 6, 3);

  ctx.save();
  ctx.translate(x, top + h / 2);
  ctx.scale(1, Math.max(squash, 0.02));
  if (light.dk > 0.3) {
    ctx.shadowColor = 'rgba(255, 236, 170, 0.6)';
    ctx.shadowBlur = h * 0.5 * light.dk;
  }
  if (slide && into > 6.1) {
    // A lona nova entra pela direita empurrando a antiga.
    const k = ease((into - 6.1) / 0.9);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.shadowBlur = 0;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-w / 2, -h / 2, w, h);
    ctx.clip();
    ctx.drawImage(face(current, w, h), -w / 2 - k * w, -h / 2, w, h);
    ctx.drawImage(face(next, w, h), w / 2 - k * w, -h / 2, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(face(showing, w, h), -w / 2, -h / 2, w, h);
  }
  ctx.shadowBlur = 0;
  ctx.strokeStyle = mix('#c9d3e6', '#2a3266', light.dk);
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.restore();

  // Refletores no topo: de noite, cone de luz sobre a placa.
  const lamps = Math.max(2, Math.round(w / 60));
  for (let i = 0; i < lamps; i += 1) {
    const lx = left + (w / lamps) * (i + 0.5);
    ctx.fillStyle = mix('#7d8bab', '#1a2050', light.dk);
    ctx.fillRect(lx - 1, top - 9, 2, 9);
    ctx.fillRect(lx - 4, top - 11, 8, 3);
    if (light.dk > 0.05) {
      const cone = ctx.createLinearGradient(0, top - 8, 0, top + h);
      cone.addColorStop(0, `rgba(255, 240, 190, ${0.45 * light.dk})`);
      cone.addColorStop(1, 'rgba(255, 240, 190, 0)');
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(lx - 3, top - 8);
      ctx.lineTo(lx + 3, top - 8);
      ctx.lineTo(lx + w / lamps * 0.6, top + h);
      ctx.lineTo(lx - w / lamps * 0.6, top + h);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// Triface: lâminas verticais que giram uma a uma entre três faces.
function triface(ctx: CanvasRenderingContext2D, x: number, base: number, w: number, h: number, pole: number, faces: Face[], t: number, phase: number, light: Light) {
  const top = base - pole - h;
  const left = x - w / 2;
  ctx.fillStyle = mix('#5d6f96', '#0d1238', light.dk);
  ctx.fillRect(x - 4, base - pole, 8, pole);
  ctx.fillRect(left - 4, top - 4, w + 8, h + 8);

  const every = 5;
  const step = (t + phase) / every;
  const index = Math.floor(step);
  const into = (step - index) * every;
  const from = face(faces[index % faces.length], w, h);
  const to = face(faces[(index + 1) % faces.length], w, h);
  const slats = Math.max(6, Math.round(w / 14));
  const sw = w / slats;
  const ratio = RATIO();
  for (let i = 0; i < slats; i += 1) {
    const p = Math.min(1, Math.max(0, (into - (every - 1.2) - i * 0.05) / 0.5));
    const scale = Math.abs(Math.cos(p * Math.PI));
    const src = p < 0.5 ? from : to;
    const cx = left + sw * (i + 0.5);
    const width = Math.max(0.5, sw * scale);
    ctx.drawImage(src, i * sw * ratio, 0, sw * ratio, h * ratio, cx - width / 2, top, width, h);
    if (scale < 0.98) {
      ctx.fillStyle = `rgba(10, 14, 50, ${0.35 * (1 - scale)})`;
      ctx.fillRect(cx - width / 2, top, width, h);
    }
  }
  if (light.dk > 0.3) {
    ctx.fillStyle = `rgba(255, 240, 190, ${0.12 * light.dk})`;
    ctx.fillRect(left, top, w, h);
  }
}

function tree(ctx: CanvasRenderingContext2D, x: number, base: number, u: number, crown: string, light: Light, blossom = false, t = 0) {
  ctx.fillStyle = mix('#7a5a46', '#1d1830', light.dk);
  ctx.fillRect(x - 2.5 * u, base - 34 * u, 5 * u, 34 * u);
  const color = mix(crown, '#2a2850', light.dk * 0.75);
  const blobs: [number, number, number][] = [[0, -44, 20], [-15, -36, 14], [15, -37, 15], [-6, -56, 13], [9, -54, 12]];
  ctx.fillStyle = color;
  // A copa balança com o vento; mais no alto, mais balanço.
  for (const [dx, dy, r] of blobs) {
    const sway = Math.sin(t * 1.4 + x * 0.013) * (-dy / 56) * 2.2 * u;
    ctx.beginPath();
    ctx.arc(x + dx * u + sway, base + dy * u, r * u, 0, Math.PI * 2);
    ctx.fill();
  }
  if (blossom) {
    // Flores caindo devagar (ipê).
    ctx.fillStyle = mix(crown, '#ffffff', 0.35);
    for (let i = 0; i < 6; i += 1) {
      const p = (t * 0.12 + i / 6 + x * 0.001) % 1;
      ctx.globalAlpha = (1 - p) * (1 - light.dk * 0.7);
      ctx.beginPath();
      ctx.arc(x + Math.sin(p * 9 + i) * 18 * u, base - 30 * u + p * 34 * u, 1.6 * u, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function lamp(ctx: CanvasRenderingContext2D, x: number, base: number, road: number, u: number, light: Light) {
  ctx.fillStyle = mix('#7d8bab', '#1a2050', light.dk);
  ctx.fillRect(x - 1.5 * u, base - 86 * u, 3 * u, 86 * u);
  ctx.fillRect(x, base - 86 * u, 22 * u, 2.5 * u);
  ctx.fillStyle = light.dk > 0.3 ? '#fff4c8' : mix('#c9d3e6', '#3a4170', light.dk);
  ctx.fillRect(x + 16 * u, base - 84 * u, 10 * u, 3 * u);
  if (light.dk > 0.05) {
    const pool = ctx.createRadialGradient(x + 21 * u, road, 0, x + 21 * u, road, 70 * u);
    pool.addColorStop(0, `rgba(255, 236, 170, ${0.28 * light.dk})`);
    pool.addColorStop(1, 'rgba(255, 236, 170, 0)');
    ctx.fillStyle = pool;
    ctx.fillRect(x - 60 * u, base - 90 * u, 160 * u, road - base + 160 * u);
  }
}

/* Veículos ------------------------------------------------------------------------------------ */

const CAR_COLORS = [NAVY, '#3f63bd', '#e9eef7', YELLOW, '#5b7fd6', '#d84a4a', '#ffffff', '#9aa6bf'];

function headlight(ctx: CanvasRenderingContext2D, from: number, y: number, reach: number, dk: number) {
  const beam = ctx.createLinearGradient(from, 0, from + reach, 0);
  beam.addColorStop(0, `rgba(255, 244, 200, ${0.55 * dk})`);
  beam.addColorStop(1, 'rgba(255, 244, 200, 0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(from, y - 1);
  ctx.lineTo(from + reach, y - 8);
  ctx.lineTo(from + reach, y + 7);
  ctx.closePath();
  ctx.fill();
}

// Carro de lado com as rodas em (x, y), andando para a direita (dir 1) ou esquerda (-1).
function car(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, dir: 1 | -1, light: Light) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * s, s);
  if (light.dk > 0.05) headlight(ctx, 16, -8, 60, light.dk);
  ctx.fillStyle = mix(color, '#11163d', light.dk * 0.6);
  ctx.beginPath();
  ctx.roundRect(-17, -11, 34, 8, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-9, -11);
  ctx.lineTo(-5, -17);
  ctx.lineTo(7, -17);
  ctx.lineTo(11, -11);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = light.dk > 0.5 ? 'rgba(255, 236, 170, 0.6)' : 'rgba(225, 240, 255, 0.95)';
  ctx.fillRect(-4.5, -15.5, 5, 4);
  ctx.fillRect(1.5, -15.5, 5, 4);
  ctx.fillStyle = light.dk > 0.3 ? '#ff5a5a' : '#c8d2e6';
  ctx.fillRect(-17, -9, 2, 3);
  ctx.fillStyle = light.dk > 0.3 ? '#fff7d6' : '#ffe27a';
  ctx.fillRect(15, -9, 2, 3);
  ctx.fillStyle = '#1b2033';
  ctx.beginPath();
  ctx.arc(-9, -3, 3.2, 0, Math.PI * 2);
  ctx.arc(9, -3, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Ônibus com propaganda na lateral.
function bus(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, dir: 1 | -1, ad: Face, light: Light) {
  const len = 130 * u;
  const hgt = 36 * u;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  if (light.dk > 0.05) headlight(ctx, len / 2, -10 * u, 90 * u, light.dk);
  ctx.fillStyle = mix('#f4f6fb', '#2a3168', light.dk * 0.7);
  ctx.beginPath();
  ctx.roundRect(-len / 2, -hgt - 5 * u, len, hgt, 5 * u);
  ctx.fill();
  ctx.fillStyle = NAVY;
  ctx.fillRect(-len / 2, -12 * u, len, 4 * u);
  // Janelas.
  ctx.fillStyle = light.dk > 0.4 ? 'rgba(255, 236, 170, 0.75)' : 'rgba(140, 175, 220, 0.9)';
  for (let i = 0; i < 7; i += 1) ctx.fillRect(-len / 2 + 6 * u + i * 17 * u, -hgt, 13 * u, 10 * u);
  ctx.restore();
  // Propaganda (desenhada sem espelhar o texto).
  const adW = 70 * u;
  const adH = 13 * u;
  ctx.drawImage(face(ad, adW, adH), x - adW / 2 - dir * 12 * u, y - hgt + 9 * u, adW, adH);
  ctx.fillStyle = '#1b2033';
  ctx.beginPath();
  ctx.arc(x - 40 * u, y - 4 * u, 6 * u, 0, Math.PI * 2);
  ctx.arc(x + 40 * u, y - 4 * u, 6 * u, 0, Math.PI * 2);
  ctx.fill();
}

// Avião puxando faixa: atravessa o céu da direita para a esquerda.
function plane(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, banner: Face, t: number, light: Light) {
  const bw = 200 * u;
  const bh = 32 * u;
  const gap = 46 * u;
  // Corda.
  ctx.strokeStyle = mix('#5d6f96', '#8892c0', light.dk);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 18 * u, y);
  ctx.lineTo(x + gap, y - bh * 0.3);
  ctx.moveTo(x + 18 * u, y);
  ctx.lineTo(x + gap, y + bh * 0.3);
  ctx.stroke();
  // Faixa ondulando, em fatias.
  const src = face(banner, bw, bh);
  const ratio = RATIO();
  const slices = 24;
  const sw = bw / slices;
  for (let i = 0; i < slices; i += 1) {
    const wave = Math.sin(t * 7 - i * 0.55) * 3 * u * (i / slices);
    ctx.drawImage(src, i * sw * ratio, 0, sw * ratio + 1, bh * ratio, x + gap + i * sw, y - bh / 2 + wave, sw + 0.6, bh);
  }
  if (light.dk > 0) {
    ctx.fillStyle = `rgba(8, 12, 40, ${0.45 * light.dk})`;
    ctx.fillRect(x + gap, y - bh / 2 - 4 * u, bw, bh + 8 * u);
  }
  // Avião.
  ctx.fillStyle = mix('#ffffff', '#c3c9e6', light.dk);
  ctx.beginPath();
  ctx.ellipse(x, y, 20 * u, 5 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = NAVY;
  ctx.beginPath();
  ctx.moveTo(x - 2 * u, y);
  ctx.lineTo(x + 8 * u, y - 13 * u);
  ctx.lineTo(x + 12 * u, y - 13 * u);
  ctx.lineTo(x + 8 * u, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x + 13 * u, y - 10 * u, 4 * u, 10 * u);
  ctx.fillStyle = YELLOW;
  ctx.fillRect(x - 19 * u, y - 1.5 * u, 6 * u, 3 * u);
  if (light.dk > 0.3 && Math.sin(t * 6) > 0.6) {
    ctx.fillStyle = '#ff4d4d';
    ctx.beginPath();
    ctx.arc(x + 15 * u, y - 11 * u, 2 * u, 0, Math.PI * 2);
    ctx.fill();
  }
}

function blimp(ctx: CanvasRenderingContext2D, cx: number, cy: number, u: number, banner: Face, light: Light, t = 0) {
  const w = 190 * u;
  const h = 56 * u;
  // Balança de leve e inclina no vento.
  ctx.save();
  ctx.translate(cx, cy + Math.sin(t * 0.7) * 4 * u);
  ctx.rotate(Math.sin(t * 0.45) * 0.03);
  const x = 0;
  const y = 0;
  const body = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  body.addColorStop(0, mix('#f3f5fb', '#3a4278', light.dk));
  body.addColorStop(1, mix('#b9c4dc', '#1a2050', light.dk));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = NAVY;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.42, y);
  ctx.lineTo(x + w * 0.56, y - h * 0.42);
  ctx.lineTo(x + w * 0.56, y + h * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - 14 * u, y + h / 2 - 2 * u, 28 * u, 9 * u);
  if (light.dk > 0.2) {
    ctx.shadowColor = 'rgba(92, 195, 247, 0.8)';
    ctx.shadowBlur = 20 * light.dk;
  }
  const pw = w * 0.6;
  const ph = h * 0.46;
  ctx.drawImage(face(banner, pw, ph, light.dk > 0.4), x - pw / 2 - w * 0.04, y - ph / 2, pw, ph);
  ctx.shadowBlur = 0;
  // Luzes de navegação que correm pela barriga à noite.
  if (light.dk > 0.3) {
    for (let i = 0; i < 9; i += 1) {
      const on = (Math.floor(t * 6) % 9) === i;
      ctx.fillStyle = on ? '#fff3b0' : 'rgba(255, 243, 176, 0.25)';
      ctx.beginPath();
      ctx.arc(x - w * 0.32 + i * w * 0.08, y + h * 0.36, 1.8 * u, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Araras voando para a esquerda, vistas de lado: arara-azul (toda azul, anel amarelo no olho) e
// arara-vermelha (vermelha, cara branca, asa com faixa amarela e penas azuis). A asa bate em duas
// partes: a ponta atrasa um pouco em relação ao ombro, e de vez em quando a arara plana.
type AraraKind = 'azul' | 'vermelha';

const ARARA_COLORS: Record<AraraKind, { body: string; tail: [string, string]; wing: [string, string, string]; beak: string; face: string }> = {
  azul: { body: '#1d3f9e', tail: ['#1d3f9e', '#2a56c4'], wing: ['#2147a8', '#2a56c4', '#163285'], beak: '#1b1b1b', face: '#ffcc00' },
  vermelha: { body: '#d2332a', tail: ['#d2332a', '#2f6fd6'], wing: ['#d2332a', '#f2c230', '#2f6fd6'], beak: '#efe6d4', face: '#f7f2ea' },
};

function arara(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: number, seed: number, kind: AraraKind) {
  const colors = ARARA_COLORS[kind];
  const glide = Math.sin(t * 0.45 + seed) > 0.6;
  const beat = t * 7.5 + seed;
  const inner = glide ? 0.25 : Math.sin(beat);
  const outer = glide ? 0.2 : Math.sin(beat - 0.7);

  // Asa vista de lado: raiz no ombro, cotovelo e quatro penas na ponta. A altura acompanha a batida.
  const wing = (shade: number) => {
    const elbowY = -12 * inner;
    const tipY = elbowY - 15 * outer;
    const [cover, band, feathers] = colors.wing;
    ctx.save();
    ctx.translate(-1, -2);
    ctx.fillStyle = mix(feathers, '#0b1440', shade);
    ctx.beginPath();
    ctx.moveTo(-2, elbowY);
    ctx.lineTo(-6, tipY);
    ctx.lineTo(-2, tipY + 2 * outer);
    ctx.lineTo(1, tipY - 1 * outer);
    ctx.lineTo(4, tipY + 3 * outer);
    ctx.lineTo(7, tipY + 1 * outer);
    ctx.lineTo(10, elbowY + 3 * inner);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = mix(band, '#0b1440', shade);
    ctx.beginPath();
    ctx.moveTo(-3, elbowY * 0.7);
    ctx.lineTo(-2, elbowY);
    ctx.lineTo(10, elbowY + 3 * inner);
    ctx.lineTo(9, elbowY * 0.7 + 2 * inner);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = mix(cover, '#0b1440', shade);
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.quadraticCurveTo(-5, elbowY * 0.5, -3, elbowY * 0.72);
    ctx.lineTo(9, elbowY * 0.72 + 2 * inner);
    ctx.quadraticCurveTo(9, elbowY * 0.3, 7, 1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  ctx.save();
  ctx.translate(x, y - inner * 1.5 * u);
  ctx.scale(u, u);
  ctx.rotate(-0.06);
  wing(0.35);
  // Cauda longa em duas penas.
  ctx.fillStyle = colors.tail[0];
  ctx.beginPath();
  ctx.moveTo(7, -1.5);
  ctx.quadraticCurveTo(24, 1, 40, 5);
  ctx.lineTo(8, 2.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = colors.tail[1];
  ctx.beginPath();
  ctx.moveTo(8, 0.5);
  ctx.quadraticCurveTo(22, 4, 36, 9);
  ctx.lineTo(7, 3);
  ctx.closePath();
  ctx.fill();
  // Corpo e cabeça.
  ctx.fillStyle = colors.body;
  ctx.beginPath();
  ctx.moveTo(-12, -4);
  ctx.quadraticCurveTo(-2, -6, 9, -1.5);
  ctx.quadraticCurveTo(10, 1, 8, 3);
  ctx.quadraticCurveTo(-4, 5, -12, 2.5);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-13, -1.5, 4.6, 0, Math.PI * 2);
  ctx.fill();
  // Cara: branca na vermelha; anel amarelo no olho e na base do bico na azul.
  ctx.fillStyle = colors.face;
  ctx.beginPath();
  if (kind === 'vermelha') ctx.ellipse(-14.5, -1, 2.8, 2.2, 0, 0, Math.PI * 2);
  else ctx.arc(-14, -2.5, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(-14, -2.5, 0.9, 0, Math.PI * 2);
  ctx.fill();
  // Bico curvo.
  ctx.fillStyle = colors.beak;
  ctx.beginPath();
  ctx.moveTo(-16.5, -3.5);
  ctx.quadraticCurveTo(-22, -3, -20.5, 2.5);
  ctx.quadraticCurveTo(-19, 0, -16.5, 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1b1b1b';
  ctx.beginPath();
  ctx.moveTo(-17, 0.5);
  ctx.quadraticCurveTo(-19.5, 1.5, -18.5, 3);
  ctx.lineTo(-16, 2);
  ctx.closePath();
  ctx.fill();
  if (kind === 'azul') {
    ctx.fillStyle = colors.face;
    ctx.fillRect(-17.5, 1.2, 2.2, 1);
  }
  wing(0);
  ctx.restore();
}

/* Cidade -------------------------------------------------------------------------------------- */

// Front light no telhado de um prédio colocado nesse ponto da tela.
type Slot = { x: number; w: number; h: number; faces: Face[]; phase: number };

type GroundProp =
  | { kind: 'outdoor' | 'triface'; x: number; faces: Face[]; phase: number; slide?: boolean }
  | { kind: 'ipe' | 'ipe-rosa' | 'arvore' | 'poste'; x: number };

type SkyProp =
  | { kind: 'plane'; banner: Face; y: number; period: number; phase: number }
  | { kind: 'blimp'; banner: Face; y: number; period: number; phase: number }
  | { kind: 'araras'; pair: [AraraKind, AraraKind]; y: number; period: number; phase: number };

interface CityConfig {
  seed: number;
  slots: Slot[];
  ground: GroundProp[];
  sky: SkyProp[];
  bus?: Face;
  cars: number;
}

interface Building { x: number; w: number; h: number; slot?: Slot }

const DAY_LAYERS = ['#d2dcef', '#b2c3e1', '#8aa2cc'];
const NIGHT_LAYERS = ['#20296a', '#19205c', '#11174c'];

function sceneCity(config: CityConfig): LoginScene {
  let cache: {
    w: number; h: number; u: number; ground: number;
    far: { day: HTMLCanvasElement; night: HTMLCanvasElement; width: number }[];
    near: { day: HTMLCanvasElement; night: HTMLCanvasElement; buildings: Building[] };
    flicker: { x: number; y: number; phase: number }[];
    beacons: { x: number; y: number; phase: number }[];
  } | null = null;

  const stars = Array.from({ length: 110 }, (_, index) => {
    const rand = random(500 + index);
    return { x: rand(), y: rand() * 0.6, r: 0.5 + rand() * 1.2, phase: rand() * 6 };
  });
  // Trânsito: cada faixa anda numa velocidade só e os veículos ocupam vagas fixas, com folga entre
  // eles; assim ninguém passa por dentro de ninguém. O ônibus ocupa a primeira vaga da faixa de cima.
  const LANE_SPEED = [62, 88];
  const perLane = Math.ceil(config.cars / 2);
  const traffic = Array.from({ length: perLane * 2 }, (_, index) => {
    const rand = random(config.seed * 31 + index);
    const lane = index < perLane ? 0 : 1;
    const slot = index % perLane;
    return {
      lane,
      bus: lane === 0 && slot === 0 && Boolean(config.bus),
      offset: (slot + rand() * 0.2) / perLane,
      color: CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)],
      size: 0.9 + rand() * 0.3,
    };
  });

  function paintBuilding(ctx: CanvasRenderingContext2D, b: Building, ground: number, color: string, night: boolean, rand: () => number, windows: boolean) {
    const top = ground - b.h;
    ctx.fillStyle = color;
    ctx.fillRect(b.x, top, b.w, b.h);
    // Detalhe do topo.
    ctx.fillStyle = night ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.35)';
    ctx.fillRect(b.x, top, b.w, 3);
    if (!windows) return;
    const cols = Math.floor((b.w - 8) / 12);
    const rows = Math.floor((b.h - 10) / 16);
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const lit = rand();
        if (night) {
          if (lit > 0.32) continue;
          ctx.fillStyle = `rgba(255, ${200 + Math.floor(lit * 120)}, 120, ${0.55 + lit})`;
        } else {
          if (lit > 0.8) continue;
          ctx.fillStyle = 'rgba(238, 244, 252, 0.6)';
        }
        ctx.fillRect(b.x + 6 + c * 12, top + 9 + r * 16, 6, 8);
      }
    }
  }

  function build(w: number, h: number) {
    // Escala das peças pela menor das medidas: no celular, outdoors e carros ficam menores.
    const u = Math.max(0.55, Math.min(1.3, h / 900, w / 1000));
    const ground = h * 0.8;
    // Camadas do fundo: uma cópia de dia e uma de noite.
    const far = [
      { min: h * 0.26, max: h * 0.5, gap: 6 },
      { min: h * 0.16, max: h * 0.34, gap: 10 },
    ].map((spec, index) => {
      const rand = random(config.seed * 7 + index);
      const list: Building[] = [];
      let x = 0;
      while (x < w + 220) {
        const bw = 40 + rand() * 70;
        list.push({ x, w: bw, h: spec.min + rand() * (spec.max - spec.min) });
        x += bw + spec.gap * rand();
      }
      const day = layer(x, h);
      const night = layer(x, h);
      const dayRand = random(config.seed + index * 3);
      const nightRand = random(config.seed + index * 3);
      for (const b of list) {
        paintBuilding(day.ctx, b, ground, DAY_LAYERS[index], false, dayRand, index > 0);
        paintBuilding(night.ctx, b, ground, NIGHT_LAYERS[index], true, nightRand, index > 0);
      }
      return { day: day.canvas, night: night.canvas, width: x };
    });

    // Primeiro plano parado, com os prédios das mídias nos lugares combinados.
    const rand = random(config.seed * 13);
    // Em tela estreita o front light do telhado encavalaria no outdoor da calçada: fica de fora.
    const slots = w < 700 ? [] : config.slots;
    const fixed: Building[] = slots.map((slot) => ({ x: slot.x * w - (slot.w * u) / 2, w: slot.w * u, h: slot.h * u, slot }));
    const buildings: Building[] = [...fixed];
    let x = -20;
    while (x < w + 20) {
      const bw = 46 + rand() * 60;
      const clash = fixed.some((f) => x < f.x + f.w + 6 && x + bw > f.x - 6);
      if (!clash) buildings.push({ x, w: bw, h: h * (0.07 + rand() * 0.13) });
      x += clash ? 12 : bw + 4 + rand() * 18;
    }
    buildings.sort((a, b) => a.x - b.x);
    const day = layer(w, h);
    const night = layer(w, h);
    const dayRand = random(config.seed * 17);
    const nightRand = random(config.seed * 17);
    for (const b of buildings) {
      paintBuilding(day.ctx, b, ground, DAY_LAYERS[2], false, dayRand, true);
      paintBuilding(night.ctx, b, ground, NIGHT_LAYERS[2], true, nightRand, true);
    }
    // À noite, algumas janelas acendem e apagam, e os prédios altos têm luz de aviso no topo.
    const extra = random(config.seed * 19);
    const flicker: { x: number; y: number; phase: number }[] = [];
    const beacons: { x: number; y: number; phase: number }[] = [];
    for (const b of buildings) {
      const top = ground - b.h;
      if (b.h > h * 0.16) beacons.push({ x: b.x + b.w - 6, y: top - 3, phase: extra() * 6 });
      if (b.slot) continue;
      const cols = Math.floor((b.w - 8) / 12);
      const rows = Math.floor((b.h - 10) / 16);
      for (let i = 0; i < 3 && cols > 0 && rows > 0; i += 1) {
        flicker.push({ x: b.x + 6 + Math.floor(extra() * cols) * 12, y: top + 9 + Math.floor(extra() * rows) * 16, phase: extra() * 20 });
      }
    }
    cache = { w, h, u, ground, far, near: { day: day.canvas, night: night.canvas, buildings }, flicker, beacons };
  }

  return {
    draw(ctx, w, h, t, hour) {
      if (!cache || cache.w !== w || cache.h !== h) build(w, h);
      const { u, ground, far, near, flicker, beacons } = cache!;
      const day = daylight(hour);
      const light: Light = { dk: 1 - day };

      // Céu.
      const [top, bottom] = skyAt(hour);
      const sky = ctx.createLinearGradient(0, 0, 0, ground);
      sky.addColorStop(0, top);
      sky.addColorStop(1, bottom);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Estrelas somem com o dia.
      if (light.dk > 0.05) {
        ctx.fillStyle = '#ffffff';
        for (const star of stars) {
          ctx.globalAlpha = light.dk * (0.35 + 0.65 * Math.abs(Math.sin(t * 0.8 + star.phase)));
          ctx.beginPath();
          ctx.arc(star.x * w, star.y * h, star.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Sol das 5h40 às 18h40 e lua na noite, grandes, pelo alto da tela: sobem rápido pela esquerda,
      // cruzam bem no topo (acima do cartão do login) e descem pela direita.
      const radius = 46 * u;
      const arc = (k: number) => {
        const lift = Math.max(0, 1 - Math.sin(Math.PI * Math.min(1, Math.max(0, k)))) ** 2.5;
        return [w * (0.03 + 0.94 * k), 16 * u + (ground - 16 * u) * lift] as const;
      };
      const sunK = (hour - 5.7) / 13;
      if (sunK > -0.03 && sunK < 1.03) {
        const [sx, sy] = arc(sunK);
        const low = 1 - Math.sin(Math.PI * Math.min(1, Math.max(0, sunK)));
        const color = mix('#fff3b8', '#ff9a45', low);
        const reach = 260 * u;
        const glow = ctx.createRadialGradient(sx, sy, radius * 0.6, sx, sy, reach);
        glow.addColorStop(0, color.replace('rgb', 'rgba').replace(')', ', 0.6)'));
        glow.addColorStop(0.35, color.replace('rgb', 'rgba').replace(')', ', 0.18)'));
        glow.addColorStop(1, 'rgba(255, 220, 150, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(sx - reach, sy - reach, reach * 2, reach * 2);
        // Raios girando devagar.
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(t * 0.05);
        ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', ', 0.22)');
        for (let i = 0; i < 12; i += 1) {
          ctx.rotate(Math.PI / 6);
          ctx.beginPath();
          ctx.moveTo(-radius * 0.18, -radius * 1.15);
          ctx.lineTo(0, -radius * 1.75 - Math.sin(t * 1.5 + i) * 6 * u);
          ctx.lineTo(radius * 0.18, -radius * 1.15);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      const moonK = (((hour - 18.8) + 24) % 24) / 11;
      if (moonK < 1.02 && light.dk > 0.05) {
        const [mx, my] = arc(moonK);
        const alpha = Math.min(1, light.dk * 1.4);
        const halo = ctx.createRadialGradient(mx, my, radius * 0.8, mx, my, radius * 3);
        halo.addColorStop(0, `rgba(200, 215, 255, ${0.28 * alpha})`);
        halo.addColorStop(1, 'rgba(200, 215, 255, 0)');
        ctx.fillStyle = halo;
        ctx.fillRect(mx - radius * 3, my - radius * 3, radius * 6, radius * 6);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#eef2ff';
        ctx.beginPath();
        ctx.arc(mx, my, radius * 0.85, 0, Math.PI * 2);
        ctx.fill();
        // Crateras.
        ctx.fillStyle = 'rgba(170, 182, 220, 0.55)';
        for (const [cx, cy, cr] of [[-0.3, -0.2, 0.18], [0.25, 0.15, 0.22], [-0.05, 0.4, 0.12], [0.35, -0.35, 0.1]] as const) {
          ctx.beginPath();
          ctx.arc(mx + cx * radius, my + cy * radius, cr * radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Estrela cadente de vez em quando, só na noite fechada.
      if (light.dk > 0.7) {
        const p = (t % 13) / 0.9;
        if (p < 1) {
          const sx = w * (0.12 + p * 0.22);
          const sy = h * (0.06 + p * 0.09);
          const tail = ctx.createLinearGradient(sx, sy, sx - 90 * u, sy - 36 * u);
          tail.addColorStop(0, `rgba(255, 255, 255, ${0.9 * (1 - p)})`);
          tail.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.strokeStyle = tail;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx - 90 * u, sy - 36 * u);
          ctx.stroke();
        }
      }

      // Nuvens: brancas de dia, alaranjadas no pôr do sol, azuladas à noite.
      const cloud = mix(mix('#ffffff', '#ffd2b0', Math.max(0, 1 - Math.abs(hour - 17.9) / 1.2) * 0.8), '#2a3170', light.dk);
      for (let i = 0; i < 5; i += 1) {
        const cx = lap(t, 5 + i * 2, i * 0.21, w + 320) - 160;
        const cy = h * (0.1 + i * 0.065);
        ctx.fillStyle = cloud;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.ellipse(cx, cy, (70 + i * 10) * u, 13 * u, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 40 * u, cy - 8 * u, 40 * u, 13 * u, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Camadas do fundo, paradas: noite por baixo, dia por cima com a transparência da luz do dia.
      for (const item of far) {
        for (const [src, alpha] of [[item.night, 1], [item.day, day]] as const) {
          if (alpha <= 0.01) continue;
          ctx.globalAlpha = alpha;
          ctx.drawImage(src, 0, 0, item.width, h);
        }
        ctx.globalAlpha = 1;
      }

      // Céu: avião, dirigível, araras.
      for (const prop of config.sky) {
        const span = w + 700 * u;
        const p = ((t + prop.phase) % prop.period) / prop.period;
        const x = w + 250 * u - p * span;
        const y = h * prop.y + Math.sin(t * 0.6 + prop.phase) * 6 * u;
        if (prop.kind === 'plane') plane(ctx, x, y, u, prop.banner, t, light);
        else if (prop.kind === 'blimp') blimp(ctx, w - x, y, u, prop.banner, light, t);
        else if (day > 0.25) {
          ctx.globalAlpha = Math.min(1, day * 1.5);
          // Dupla de araras, bem separadas para uma não cruzar a asa da outra.
          prop.pair.forEach((kind, i) => {
            const fx = x + i * 70 * u + Math.sin(t * 0.9 + i) * 4 * u;
            const fy = y + i * 26 * u + Math.sin(t * 1.3 + i * 2) * 4 * u;
            arara(ctx, fx, fy, u * 1.45, t, i * 2.3 + prop.phase, kind);
          });
          ctx.globalAlpha = 1;
        }
      }

      // Primeiro plano.
      ctx.drawImage(near.night, 0, 0, w, h);
      if (day > 0.01) {
        ctx.globalAlpha = day;
        ctx.drawImage(near.day, 0, 0, w, h);
        ctx.globalAlpha = 1;
      }
      if (light.dk > 0.2) {
        for (const item of flicker) {
          const on = Math.sin(t * 0.22 + item.phase) > 0.1;
          ctx.fillStyle = on ? `rgba(255, 214, 120, ${light.dk})` : `rgba(17, 23, 76, ${light.dk})`;
          ctx.fillRect(item.x, item.y, 6, 8);
        }
        for (const item of beacons) {
          const glow = Math.max(0, Math.sin(t * 2.6 + item.phase)) * light.dk;
          if (glow < 0.05) continue;
          ctx.fillStyle = `rgba(255, 70, 70, ${glow})`;
          ctx.shadowColor = 'rgba(255, 70, 70, 0.9)';
          ctx.shadowBlur = 10 * glow;
          ctx.beginPath();
          ctx.arc(item.x, item.y, 2.4 * u, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      for (const b of near.buildings) {
        const slot = b.slot;
        if (!slot) continue;
        board(ctx, b.x + b.w / 2, ground - b.h, b.w * 0.95, 40 * u, 16 * u, slot.faces, t, slot.phase, light);
      }

      // Calçada e o que fica nela.
      const curb = ground + 12 * u;
      const roadBottom = h;
      ctx.fillStyle = mix('#c3cde0', '#151b48', light.dk);
      ctx.fillRect(0, ground, w, curb - ground);
      const road = mix('#5d6c8f', '#0b0e2c', light.dk);
      for (const prop of config.ground) {
        const x = prop.x * w;
        switch (prop.kind) {
          case 'outdoor': board(ctx, x, ground, 190 * u, 64 * u, 70 * u, prop.faces, t, prop.phase, light, 2, prop.slide); break;
          case 'triface': triface(ctx, x, ground, 160 * u, 54 * u, 62 * u, prop.faces, t, prop.phase, light); break;
          case 'ipe': tree(ctx, x, ground + 4 * u, u, '#f2c230', light, true, t); break;
          case 'ipe-rosa': tree(ctx, x, ground + 4 * u, u, '#e56ca8', light, true, t); break;
          case 'arvore': tree(ctx, x, ground + 4 * u, u, '#7fb98a', light, false, t); break;
          case 'poste': lamp(ctx, x, ground + 4 * u, curb + (roadBottom - curb) * 0.5, u, light); break;
        }
      }

      // Avenida: dois sentidos, faixa amarela tracejada, ônibus e carros.
      ctx.fillStyle = road;
      ctx.fillRect(0, curb, w, roadBottom - curb);
      const middle = curb + (roadBottom - curb) * 0.48;
      ctx.strokeStyle = YELLOW;
      ctx.lineWidth = 2;
      ctx.setLineDash([18, 14]);
      ctx.beginPath();
      ctx.moveTo(0, middle);
      ctx.lineTo(w, middle);
      ctx.stroke();
      ctx.setLineDash([]);
      const span = w + 400 * u;
      for (const item of traffic) {
        const x = lap(t, LANE_SPEED[item.lane] * u, item.offset, span) - 200 * u;
        if (item.bus && config.bus) bus(ctx, x, middle - 5 * u, u, 1, config.bus, light);
        else if (item.lane === 0) car(ctx, x, middle - 6 * u, 1.05 * item.size * u, item.color, 1, light);
        else car(ctx, w - x, roadBottom - 8 * u, 1.2 * item.size * u, item.color, -1, light);
      }
    },
  };
}

/* A cena ------------------------------------------------------------------------------------ */

// Mídias nas laterais (o cartão do login cobre o meio da tela).
const CIDADE_MORENA: CityConfig = {
  seed: 27,
  slots: [{ x: 0.93, w: 130, h: 175, faces: ['ipes', 'semades', 'geomidia'], phase: 3 }],
  ground: [
    { kind: 'triface', x: 0.22, faces: ['geomidia', 'morena', 'prefcg'], phase: 1 },
    { kind: 'ipe', x: 0.3 },
    { kind: 'poste', x: 0.017 },
    { kind: 'ipe-rosa', x: 0.69 },
    { kind: 'outdoor', x: 0.8, faces: ['feira', 'bioparque', 'geomidia', 'parque'], phase: 2, slide: true },
    { kind: 'poste', x: 0.885 },
    { kind: 'ipe', x: 0.985 },
  ],
  sky: [
    // O avião passa acima do cartão; os tempos fazem tudo aparecer logo que a tela abre.
    { kind: 'plane', banner: 'morena', y: 0.045, period: 34, phase: 31 },
    { kind: 'blimp', banner: 'geomidia', y: 0.26, period: 80, phase: 52 },
    // Duas duplas de araras, uma de cada vez (meio período de distância).
    { kind: 'araras', pair: ['azul', 'vermelha'], y: 0.17, period: 24, phase: 19 },
    { kind: 'araras', pair: ['vermelha', 'azul'], y: 0.21, period: 24, phase: 7 },
  ],
  bus: 'feira',
  cars: 10,
};

export function createLoginScene(): LoginScene {
  return sceneCity(CIDADE_MORENA);
}
