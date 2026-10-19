<template>
  <div class="absolute inset-0 overflow-hidden bg-[#141b55]" aria-hidden="true">
    <template v-if="variant === 'cidade'">
      <div class="login-bg-kenburns absolute -inset-[6%] bg-cover bg-center" style="background-image: url('/login-hero-city.jpg')" />
      <div class="absolute inset-0 bg-brand-night/70" />
      <span
        v-for="light in cityLights"
        :key="light.id"
        class="login-bg-twinkle absolute size-1 rounded-full bg-brand-yellow"
        :style="{ left: `${light.x}%`, top: `${light.y}%`, animationDelay: `${light.delay}s`, animationDuration: `${light.duration}s` }"
      />
    </template>

    <template v-else-if="variant === 'ondas'">
      <div class="login-bg-waves absolute -inset-1/2" />
      <div class="login-bg-slants absolute -inset-1/4" />
    </template>

    <canvas v-else ref="canvas" class="absolute inset-0 size-full" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { SCENES } from '@/components/login/login-background-scenes';
import type { LoginBackgroundId } from '@/composables/useLoginBackground';

const props = defineProps<{ variant: LoginBackgroundId }>();

const canvas = ref<HTMLCanvasElement | null>(null);
let frame = 0;
let resizeObserver: ResizeObserver | null = null;

// Luzes da cidade com posição e ritmo fixos, para não mudarem a cada renderização.
const cityLights = Array.from({ length: 28 }, (_, id) => {
  const r = (n: number) => { const x = Math.sin((id + 1) * n) * 10000; return x - Math.floor(x); };
  return { id, x: 4 + r(12.9) * 92, y: 35 + r(78.2) * 60, delay: r(39.4) * 6, duration: 2.5 + r(51.7) * 3.5 };
});

function stop() {
  cancelAnimationFrame(frame);
  frame = 0;
  resizeObserver?.disconnect();
  resizeObserver = null;
}

function start() {
  stop();
  const scene = SCENES[props.variant];
  const element = canvas.value;
  const ctx = element?.getContext('2d');
  if (!scene || !element || !ctx) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0;
  let height = 0;
  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = element.clientWidth;
    height = element.clientHeight;
    element.width = Math.round(width * ratio);
    element.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (reduceMotion) scene(ctx, width, height, 8);
  };
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(element);
  resize();
  if (reduceMotion) return;

  const startedAt = performance.now();
  const tick = (now: number) => {
    scene(ctx, width, height, (now - startedAt) / 1000 + 4);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
}

onMounted(start);
watch(() => props.variant, () => requestAnimationFrame(start));
onBeforeUnmount(stop);
</script>

<style scoped>
.login-bg-kenburns {
  animation: login-kenburns 40s ease-in-out infinite alternate;
}

@keyframes login-kenburns {
  from { transform: scale(1) translate(0, 0); }
  to { transform: scale(1.12) translate(-2%, -1.5%); }
}

.login-bg-twinkle {
  opacity: 0;
  box-shadow: 0 0 8px 2px rgb(255 204 0 / 0.6);
  animation: login-twinkle ease-in-out infinite;
}

@keyframes login-twinkle {
  0%, 100% { opacity: 0; }
  50% { opacity: 0.9; }
}

.login-bg-waves {
  background:
    radial-gradient(40% 35% at 30% 30%, rgb(47 177 240 / 0.35), transparent 70%),
    radial-gradient(35% 40% at 70% 60%, rgb(40 53 135 / 0.9), transparent 70%),
    radial-gradient(30% 30% at 50% 85%, rgb(26 95 196 / 0.55), transparent 70%),
    #141b55;
  animation: login-waves 26s ease-in-out infinite alternate;
}

@keyframes login-waves {
  from { transform: translate(0, 0) rotate(0deg); }
  to { transform: translate(6%, -4%) rotate(8deg); }
}

.login-bg-slants {
  background: repeating-linear-gradient(-78deg, transparent 0 46px, rgb(255 204 0 / 0.13) 46px 48px, transparent 47px 140px);
  animation: login-slants 30s linear infinite;
}

@keyframes login-slants {
  from { transform: translateX(0); }
  to { transform: translateX(143.1px); }
}

@media (prefers-reduced-motion: reduce) {
  .login-bg-kenburns,
  .login-bg-twinkle,
  .login-bg-waves,
  .login-bg-slants {
    animation: none;
  }

  .login-bg-twinkle {
    opacity: 0.6;
  }
}
</style>
