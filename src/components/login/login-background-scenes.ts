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
  panels?: PanelStyle;
}

export type PanelStyle = 'placa' | 'outdoor' | 'led' | 'isometrico' | 'raio';

// Desenha um painel de mídia exterior com a base no ponto (x, y). "light" vai de 0 a 1.
function drawPanel(ctx: CanvasRenderingContext2D, style: PanelStyle, x: number, y: number, light: number, t: number, seed: number) {
  const lit = (alpha: number) => `rgba(${YELLOW}, ${alpha})`;
  switch (style) {
    case 'placa':
      ctx.fillStyle = lit(0.25 + light * 0.6);
      ctx.fillRect(x - 5, y - 13, 10, 6);
      ctx.fillRect(x - 0.75, y - 7, 1.5, 7);
      return;
    case 'outdoor':
      ctx.fillStyle = lit(0.1 * light);
      ctx.fillRect(x - 16, y - 25, 32, 18);
      ctx.fillStyle = 'rgba(200, 210, 255, 0.55)';
      ctx.fillRect(x - 8, y - 9, 1.5, 9);
      ctx.fillRect(x + 6.5, y - 9, 1.5, 9);
      ctx.fillStyle = lit(0.3 + light * 0.6);
      ctx.fillRect(x - 12, y - 21, 24, 11);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 12.5, y - 21.5, 25, 12);
      return;
    case 'led': {
      const colors = [CYAN, YELLOW, '255, 255, 255'];
      const cycle = t / 2.5 + seed * 3;
      const current = colors[Math.floor(cycle) % 3];
      const fade = Math.min(1, (cycle % 1) * 4);
      ctx.fillStyle = 'rgba(200, 210, 255, 0.5)';
      ctx.fillRect(x - 0.75, y - 8, 1.5, 8);
      ctx.fillStyle = 'rgba(10, 14, 50, 0.9)';
      ctx.fillRect(x - 10, y - 21, 20, 13);
      ctx.fillStyle = `rgba(${current}, ${0.35 + fade * 0.55})`;
      ctx.fillRect(x - 9, y - 20, 18, 11);
      ctx.fillStyle = 'rgba(10, 14, 50, 0.35)';
      for (let line = 0; line < 3; line += 1) ctx.fillRect(x - 9, y - 18 + line * 3.5, 18, 1);
      return;
    }
    case 'isometrico': {
      const half = 13;
      const rise = half * SLOPE;
      ctx.fillStyle = 'rgba(200, 210, 255, 0.55)';
      ctx.fillRect(x - 0.75, y - 6, 1.5, 6);
      ctx.beginPath();
      ctx.moveTo(x - half, y - 6 + rise);
      ctx.lineTo(x + half, y - 6 - rise);
      ctx.lineTo(x + half, y - 18 - rise);
      ctx.lineTo(x - half, y - 18 + rise);
      ctx.closePath();
      ctx.fillStyle = lit(0.3 + light * 0.6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
      return;
    }
    case 'raio': {
      const ring = (t * 0.35 + seed) % 1;
      ctx.beginPath();
      ctx.ellipse(x, y, 40, 40 * SLOPE, 0, 0, Math.PI * 2);
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = lit(0.3);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.ellipse(x, y, 40 * ring, 40 * ring * SLOPE, 0, 0, Math.PI * 2);
      ctx.strokeStyle = lit(0.5 * (1 - ring));
      ctx.stroke();
      ctx.fillStyle = lit(0.35 + light * 0.55);
      ctx.fillRect(x - 5, y - 13, 10, 6);
      ctx.fillRect(x - 0.75, y - 7, 1.5, 7);
      return;
    }
  }
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

    if (options.panels) {
      // Painéis sobre algumas quadras, escolhidas de forma fixa para não piscarem de lugar.
      for (let k = first; k <= last; k += 1) {
        for (let m = first; m <= last; m += 1) {
          const seed = rand(k * 71.3 + m * 19.7);
          if (seed < 0.8) continue;
          const { x, y } = cross(k + 0.5, m + 0.5);
          if (x < 10 || x > w - 10 || y < 20 || y > h) continue;
          const light = Math.max(0, Math.sin(t * 0.9 + seed * 40));
          ctx.save();
          ctx.translate(x, y + 4);
          ctx.scale(1.35, 1.35);
          drawPanel(ctx, options.panels, 0, 0, light, t, seed);
          ctx.restore();
        }
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
  cars: 46, speed: [50, 120], length: [40, 100], gridAlpha: 0.12, yellowEvery: 7, glow: false, blocks: true,
};

export const SCENES: Record<string, Scene> = {
  placa: createAvenidas({ ...BASE, panels: 'placa' }),
  outdoor: createAvenidas({ ...BASE, panels: 'outdoor' }),
  led: createAvenidas({ ...BASE, panels: 'led' }),
  isometrico: createAvenidas({ ...BASE, panels: 'isometrico' }),
  raio: createAvenidas({ ...BASE, panels: 'raio' }),
};
