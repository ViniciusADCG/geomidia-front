<template>
  <div class="absolute inset-0 overflow-hidden bg-[#141b55]" aria-hidden="true">
    <canvas ref="canvas" class="absolute inset-0 size-full" />
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
