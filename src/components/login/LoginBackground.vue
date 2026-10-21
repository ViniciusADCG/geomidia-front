<template>
  <div class="login-background fixed inset-0 overflow-hidden" aria-hidden="true">
    <canvas ref="canvas" class="absolute inset-0 size-full" />
  </div>
</template>

<script lang="ts">
// Relógio comum a todas as instâncias: o fundo das boas-vindas e da saída continua a cena do login sem pular.
const CLOCK_START = performance.now();
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { createLoginScene, sceneHour, useSceneHourSetting } from '@/components/login/login-scenes';

// Fundo do login, das boas-vindas e da saída, preso à tela: a "Cidade Morena" de login-scenes.ts, de
// dia ou de noite conforme o horário. Em desenvolvimento dá para fixar um horário no painel de teste.
const hourSetting = useSceneHourSetting();
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
  const element = canvas.value;
  const ctx = element?.getContext('2d');
  if (!element || !ctx) return;
  const painter = createLoginScene();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0;
  let height = 0;
  const paint = (now: number) => painter.draw(ctx, width, height, (now - CLOCK_START) / 1000 + 6, sceneHour(hourSetting.value));
  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = element.clientWidth;
    height = element.clientHeight;
    element.width = Math.round(width * ratio);
    element.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (reduceMotion) paint(CLOCK_START);
  };
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(element);
  resize();
  if (reduceMotion) return;
  const tick = (now: number) => {
    paint(now);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
}

// Com movimento reduzido a cena fica parada; redesenha ao trocar o horário.
watch(hourSetting, () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) start();
});

onMounted(() => {
  // O texto dos outdoors usa a Onest; espera a fonte para não desenhar com a de reserva.
  void document.fonts.load('800 16px "Onest Variable"').finally(start);
});
onBeforeUnmount(stop);
</script>

<style scoped>
/* Camada própria: o que se anima por cima não obriga a redesenhar o resto. */
.login-background {
  background: #edf5fa;
  will-change: transform;
}
</style>
