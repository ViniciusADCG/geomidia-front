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

// Malha de ruas em perspectiva com rastros de luz percorrendo as vias.
// Um gerador com opções, para testar variações do mesmo fundo.
const TILE_W = 120;
const TILE_H = 58;
const SLOPE = TILE_H / TILE_W;

interface AvenidasOptions {
  cars: number;
  speed: [number, number];
  length: [number, number];
  gridAlpha: number;
  yellowEvery: number;
  glow: boolean;
  blocks: boolean;
  billboards: boolean;
}

function createAvenidas(options: AvenidasOptions): Scene {
  return (ctx, w, h, t) => {
    paintBase(ctx, w, h);
    const span = h + w * SLOPE;
    const first = -Math.ceil((w * SLOPE) / TILE_H);
    const last = Math.ceil(span / TILE_H);
    // Interseção entre a rua "descendo" k e a rua "subindo" m (podem ser meias posições).
    const cross = (k: number, m: number) => {
      const x = (m * TILE_H + w * SLOPE - k * TILE_H) / (2 * SLOPE);
      return { x, y: k * TILE_H + x * SLOPE };
    };

    if (options.blocks) {
      ctx.fillStyle = 'rgba(120, 150, 255, 0.09)';
      for (let k = first; k <= last; k += 1) {
        for (let m = first; m <= last; m += 1) {
          const { x, y } = cross(k + 0.5, m + 0.5);
          if (x < -TILE_W || x > w + TILE_W || y < -TILE_H || y > h + TILE_H) continue;
          diamond(ctx, x, y, TILE_W * 0.4, TILE_H * 0.4);
          ctx.fill();
        }
      }
    }

    ctx.strokeStyle = `rgba(140, 165, 255, ${options.gridAlpha})`;
    ctx.lineWidth = 1;
    for (let k = first; k <= last; k += 1) {
      const b = k * TILE_H;
      ctx.beginPath(); ctx.moveTo(0, b); ctx.lineTo(w, b + w * SLOPE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, b + w * SLOPE); ctx.lineTo(w, b); ctx.stroke();
    }

    if (options.billboards) {
      for (let i = 0; i < 90; i += 1) {
        const k = first + Math.floor(rand(i * 4.1) * (last - first));
        const m = first + Math.floor(rand(i * 8.3) * (last - first));
        const { x, y } = cross(k, m);
        if (x < 0 || x > w || y < 0 || y > h) continue;
        const pulse = 0.35 + 0.65 * Math.max(0, Math.sin(t * 0.9 + rand(i * 2.9) * 6.28));
        ctx.fillStyle = `rgba(${YELLOW}, ${0.25 + pulse * 0.6})`;
        ctx.fillRect(x - 5, y - 13, 10, 6);
        ctx.fillRect(x - 0.75, y - 7, 1.5, 7);
      }
    }

    const lanes = last - first + 2;
    if (options.glow) ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 0; i < options.cars; i += 1) {
      const down = i % 2 === 0;
      const lane = first + Math.floor(rand(i * 3.7) * lanes);
      const speed = options.speed[0] + rand(i * 9.1) * (options.speed[1] - options.speed[0]);
      const length = options.length[0] + rand(i * 2.3) * (options.length[1] - options.length[0]);
      const travel = w + length * 2;
      const x = ((rand(i * 5.3) * travel + t * speed) % travel) - length;
      const b = lane * TILE_H;
      const y = down ? b + x * SLOPE : b + w * SLOPE - x * SLOPE;
      const dy = down ? length * SLOPE : -length * SLOPE;
      const color = i % options.yellowEvery === 0 ? YELLOW : CYAN;
      const trail = ctx.createLinearGradient(x - length, y - dy, x, y);
      trail.addColorStop(0, `rgba(${color}, 0)`);
      trail.addColorStop(1, `rgba(${color}, 0.85)`);
      ctx.strokeStyle = trail;
      ctx.lineWidth = options.glow ? 3 : 2;
      ctx.beginPath(); ctx.moveTo(x - length, y - dy); ctx.lineTo(x, y); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  };
}

const BASE: AvenidasOptions = {
  cars: 46, speed: [50, 120], length: [40, 100], gridAlpha: 0.16, yellowEvery: 7, glow: false, blocks: false, billboards: false,
};

export const SCENES: Record<string, Scene> = {
  avenidas: createAvenidas(BASE),
  rush: createAvenidas({ ...BASE, cars: 150, speed: [90, 190], length: [30, 80], gridAlpha: 0.22, yellowEvery: 3 }),
  noite: createAvenidas({ ...BASE, cars: 22, speed: [25, 55], length: [110, 200], gridAlpha: 0.1, glow: true }),
  paineis: createAvenidas({ ...BASE, billboards: true }),
  quadras: createAvenidas({ ...BASE, blocks: true, gridAlpha: 0.12 }),
};
