<template>
  <div class="absolute inset-0 overflow-hidden bg-[#141b55]" aria-hidden="true">
    <canvas ref="canvas" class="absolute inset-0 size-full" />
  </div>
</template>

<script lang="ts">
// Relógio comum a todas as instâncias: o fundo das boas-vindas continua a cena do login sem pular.
const CLOCK_START = performance.now();
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

import { loginScene } from '@/components/login/login-background-scenes';

const canvas = ref<HTMLCanvasElement | null>(null);
let frame = 0;
let resizeObserver: ResizeObserver | null = null;

function stop() {
  cancelAnimationFrame(frame);
  frame = 0;
  resizeObserver?.disconnect();
  resizeObserver = null;
}

function start() {
  stop();
  const scene = loginScene;
  const element = canvas.value;
  const ctx = element?.getContext('2d');
  if (!element || !ctx) return;

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

  const tick = (now: number) => {
    scene(ctx, width, height, (now - CLOCK_START) / 1000 + 4);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
}

onMounted(start);
onBeforeUnmount(stop);
</script>
