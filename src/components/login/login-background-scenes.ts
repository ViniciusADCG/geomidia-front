// Cenas animadas em canvas para o fundo do login. Cada cena desenha um quadro a partir do tempo
// (em segundos), então o mesmo código serve para animar e para o quadro parado de movimento reduzido.

export type Scene = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;

const NAVY_TOP = '#1b2463';
const NAVY_BOTTOM = '#0f1645';
const CYAN = '47, 177, 240';
const YELLOW = '255, 204, 0';

function paintBase(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const gradient = ctx.createLinearGradient(0, 0, w * 0.4, h);
  gradient.addColorStop(0, NAVY_TOP);
  gradient.addColorStop(1, NAVY_BOTTOM);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

// Pseudoaleatório determinístico: o mesmo índice sempre gera o mesmo valor.
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function diamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, hw: number, hh: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - hh);
  ctx.lineTo(cx + hw, cy);
  ctx.lineTo(cx, cy + hh);
  ctx.lineTo(cx - hw, cy);
  ctx.closePath();
}

// 1. Quarteirões em perspectiva deslizando, com lotes que acendem e apagam.
const TILE_W = 120;
const TILE_H = 58;
export const mapaScene: Scene = (ctx, w, h, t) => {
  paintBase(ctx, w, h);
  const ox = -t * 9;
  const oy = -t * 4.35;
  const rowStart = Math.floor(-oy / (TILE_H / 2)) - 2;
  const rows = Math.ceil(h / (TILE_H / 2)) + 4;
  const colStart = Math.floor(-ox / TILE_W) - 2;
  const cols = Math.ceil(w / TILE_W) + 4;
  for (let r = rowStart; r < rowStart + rows; r += 1) {
    for (let c = colStart; c < colStart + cols; c += 1) {
      const cx = ox + c * TILE_W + (r % 2 === 0 ? 0 : TILE_W / 2);
      const cy = oy + r * (TILE_H / 2);
      // Cada lote acende numa fase própria, num ciclo de 9 segundos.
      const phase = rand(r * 977 + c * 131) * 9;
      const cycle = ((t + phase) % 9) / 9;
      const lit = rand(r * 37 + c * 17) > 0.86 && cycle < 0.35 ? Math.sin((cycle / 0.35) * Math.PI) : 0;
      diamond(ctx, cx, cy, TILE_W * 0.42, TILE_H * 0.42);
      ctx.fillStyle = lit > 0 ? `rgba(${CYAN}, ${0.1 + lit * 0.4})` : 'rgba(120, 150, 255, 0.09)';
      ctx.fill();
      if (lit > 0.05) {
        ctx.beginPath();
        ctx.arc(cx, cy - 4, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${lit * 0.9})`;
        ctx.fill();
      }
    }
  }
};

// 2. Pontos fixos emitindo círculos de raio, em fases desencontradas, sobre uma grade de pontos.
export const raiosScene: Scene = (ctx, w, h, t) => {
  paintBase(ctx, w, h);
  ctx.fillStyle = 'rgba(160, 180, 255, 0.12)';
  for (let x = 14; x < w; x += 28) {
    for (let y = 14; y < h; y += 28) ctx.fillRect(x, y, 1.5, 1.5);
  }
  const PERIOD = 4.5;
  for (let i = 0; i < 9; i += 1) {
    const generation = Math.floor((t + i * 0.5) / (PERIOD * 3));
    const px = rand(i * 13 + generation * 7) * w;
    const py = rand(i * 29 + generation * 11) * h;
    const maxRadius = 90 + rand(i * 5) * 140;
    const accent = i % 4 === 0 ? YELLOW : CYAN;
    for (let k = 0; k < 2; k += 1) {
      const p = (((t + i * 0.5 + k * PERIOD / 2) % PERIOD) / PERIOD);
      ctx.beginPath();
      ctx.arc(px, py, p * maxRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${accent}, ${(1 - p) * 0.45})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${accent}, 0.9)`;
    ctx.fill();
  }
};

// 4. Malha de ruas em perspectiva com rastros de luz percorrendo as vias.
const SLOPE = TILE_H / TILE_W;
export const avenidasScene: Scene = (ctx, w, h, t) => {
  paintBase(ctx, w, h);
  const span = h + w * SLOPE;
  ctx.strokeStyle = 'rgba(140, 165, 255, 0.16)';
  ctx.lineWidth = 1;
  for (let k = -Math.ceil(w * SLOPE / TILE_H); k * TILE_H < span; k += 1) {
    const b = k * TILE_H;
    ctx.beginPath(); ctx.moveTo(0, b); ctx.lineTo(w, b + w * SLOPE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, b + w * SLOPE); ctx.lineTo(w, b); ctx.stroke();
  }
  const lanes = Math.ceil(span / TILE_H) + 2;
  for (let i = 0; i < 46; i += 1) {
    const down = i % 2 === 0;
    const lane = Math.floor(rand(i * 3.7) * lanes) - Math.ceil(w * SLOPE / TILE_H);
    const speed = 50 + rand(i * 9.1) * 70;
    const length = 40 + rand(i * 2.3) * 60;
    const travel = w + length * 2;
    const x = ((rand(i * 5.3) * travel + t * speed) % travel) - length;
    const b = lane * TILE_H;
    const y = down ? b + x * SLOPE : b + w * SLOPE - x * SLOPE;
    const dy = down ? length * SLOPE : -length * SLOPE;
    const color = i % 7 === 0 ? YELLOW : CYAN;
    const trail = ctx.createLinearGradient(x - length, y - dy, x, y);
    trail.addColorStop(0, `rgba(${color}, 0)`);
    trail.addColorStop(1, `rgba(${color}, 0.85)`);
    ctx.strokeStyle = trail;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - length, y - dy); ctx.lineTo(x, y); ctx.stroke();
  }
};

export const SCENES: Record<string, Scene> = {
  mapa: mapaScene,
  raios: raiosScene,
  avenidas: avenidasScene,
};
