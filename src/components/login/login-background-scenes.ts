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

// Malha de ruas em perspectiva (mesmas proporções das camadas do símbolo).
const TILE_W = 120;
const TILE_H = 58;
const SLOPE = TILE_H / TILE_W;

// Avenidas e quadras: poucos carros; ao passar por uma rua, um carro faz surgir uma placa
// com o raio mínimo na quadra ao lado, que fica alguns segundos e some.
interface PassagemOptions {
  cars: number;
  speed: [number, number];
  length: [number, number];
  spawnChance: number;
  life: number;
  burst: boolean;
  glow: boolean;
  rise: boolean;
}

const easeOut = (p: number) => 1 - (1 - Math.min(1, Math.max(0, p))) ** 3;

function drawRaioPlaca(ctx: CanvasRenderingContext2D, x: number, y: number, age: number, life: number, t: number, seed: number, o: PassagemOptions) {
  const appear = easeOut(age / 0.7);
  const fade = Math.min(1, (life - age) / 1.2);
  const alpha = Math.max(0, Math.min(appear, fade));
  if (alpha <= 0) return;
  const lit = (a: number) => `rgba(${YELLOW}, ${a * alpha})`;
  const radius = 42 * (o.rise ? easeOut(age / 1.6) : appear);

  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius * SLOPE, 0, 0, Math.PI * 2);
  ctx.strokeStyle = lit(0.4);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);

  if (o.burst && age < 1.4) {
    const p = age / 1.4;
    const r = 42 + 60 * easeOut(p);
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * SLOPE, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${YELLOW}, ${(1 - p) * 0.7})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  const ring = (t * 0.35 + seed) % 1;
  ctx.beginPath();
  ctx.ellipse(x, y, 42 * ring, 42 * ring * SLOPE, 0, 0, Math.PI * 2);
  ctx.strokeStyle = lit(0.45 * (1 - ring));
  ctx.lineWidth = 1;
  ctx.stroke();

  const height = o.rise ? easeOut(age / 0.9) : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.35, 1.35 * height);
  ctx.fillStyle = lit(0.9);
  ctx.fillRect(-5, -13, 10, 6);
  ctx.fillRect(-0.75, -7, 1.5, 7);
  ctx.restore();
}

function createPassagem(o: PassagemOptions): Scene {
  return (ctx, w, h, t) => {
    paintBase(ctx, w, h);
    const span = h + w * SLOPE;
    const first = -Math.ceil((w * SLOPE) / TILE_H);
    const last = Math.ceil(span / TILE_H);
    const cross = (k: number, m: number) => {
      const x = (m * TILE_H + w * SLOPE - k * TILE_H) / (2 * SLOPE);
      return { x, y: k * TILE_H + x * SLOPE };
    };
    // Centro da quadra onde fica um ponto da tela.
    const blockAt = (x: number, y: number) => cross(
      Math.floor((y - x * SLOPE) / TILE_H) + 0.5,
      Math.floor((y + x * SLOPE - w * SLOPE) / TILE_H) + 0.5,
    );

    ctx.fillStyle = 'rgba(120, 150, 255, 0.09)';
    for (let k = first; k <= last; k += 1) {
      for (let m = first; m <= last; m += 1) {
        const { x, y } = cross(k + 0.5, m + 0.5);
        if (x < -TILE_W || x > w + TILE_W || y < -TILE_H || y > h + TILE_H) continue;
        diamond(ctx, x, y, TILE_W * 0.4, TILE_H * 0.4);
        ctx.fill();
      }
    }
    ctx.strokeStyle = 'rgba(140, 165, 255, 0.12)';
    ctx.lineWidth = 1;
    for (let k = first; k <= last; k += 1) {
      const b = k * TILE_H;
      ctx.beginPath(); ctx.moveTo(0, b); ctx.lineTo(w, b + w * SLOPE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, b + w * SLOPE); ctx.lineTo(w, b); ctx.stroke();
    }

    // Só ruas que cruzam a faixa central da tela, para os carros ficarem visíveis por mais tempo.
    const laneMin = Math.ceil((h * 0.12 - (w * SLOPE) / 2) / TILE_H);
    const laneMax = Math.floor((h * 0.88 - (w * SLOPE) / 2) / TILE_H);
    const cars: Array<{ x: number; y: number; dy: number; length: number }> = [];
    for (let i = 0; i < o.cars; i += 1) {
      const down = i % 2 === 0;
      const speed = o.speed[0] + rand(i * 9.1) * (o.speed[1] - o.speed[0]);
      const length = o.length[0] + rand(i * 2.3) * (o.length[1] - o.length[0]);
      const travel = w + length * 2;
      const period = travel / speed;
      const distance = rand(i * 5.3) * travel + t * speed;
      const generation = Math.floor(distance / travel);
      // Rua e ponto de surgimento mudam a cada passagem do carro.
      const pathOf = (gen: number) => {
        const lane = laneMin + Math.floor(rand(i * 3.7 + gen * 1.31) * (laneMax - laneMin + 1));
        const b = lane * TILE_H;
        return (px: number) => ({ x: px, y: down ? b + px * SLOPE : b + w * SLOPE - px * SLOPE });
      };

      const x = (distance % travel) - length;
      const head = pathOf(generation)(x);
      cars.push({ x, y: head.y, dy: down ? length * SLOPE : -length * SLOPE, length });

      for (const gen of [generation, generation - 1]) {
        if (rand(i * 7.7 + gen * 3.3) > o.spawnChance) continue;
        const at = 0.2 + rand(i * 1.9 + gen * 5.1) * 0.6;
        const spawnTime = (gen * travel - rand(i * 5.3) * travel) / speed + at * period;
        const age = t - spawnTime;
        if (age < 0 || age > o.life) continue;
        const point = pathOf(gen)(at * travel - length);
        const block = blockAt(point.x, point.y + (down ? -6 : 6));
        if (block.x < 20 || block.x > w - 20 || block.y < 30 || block.y > h - 10) continue;
        drawRaioPlaca(ctx, block.x, block.y + 4, age, o.life, t, rand(i + gen), o);
      }
    }

    if (o.glow) ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const car of cars) {
      const trail = ctx.createLinearGradient(car.x - car.length, car.y - car.dy, car.x, car.y);
      trail.addColorStop(0, `rgba(${CYAN}, 0)`);
      trail.addColorStop(1, `rgba(${CYAN}, 0.85)`);
      ctx.strokeStyle = trail;
      ctx.lineWidth = o.glow ? 3 : 2;
      ctx.beginPath(); ctx.moveTo(car.x - car.length, car.y - car.dy); ctx.lineTo(car.x, car.y); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  };
}

export const SCENES: Record<string, Scene> = {
  discreta: createPassagem({ cars: 8, speed: [60, 110], length: [50, 100], spawnChance: 0.5, life: 6, burst: false, glow: false, rise: false }),
  destaque: createPassagem({ cars: 6, speed: [60, 100], length: [50, 100], spawnChance: 1, life: 6, burst: true, glow: false, rise: false }),
  calma: createPassagem({ cars: 5, speed: [30, 50], length: [120, 190], spawnChance: 1, life: 10, burst: false, glow: true, rise: true }),
};
