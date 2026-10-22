<template>
  <span>{{ shown }}</span>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

// Número que conta até o valor ao aparecer e ao mudar. Com movimento reduzido mostra o valor direto.
const props = withDefaults(defineProps<{ value: number; duration?: number }>(), { duration: 700 });

const shown = ref(0);
let frame = 0;

function animateTo(target: number) {
  cancelAnimationFrame(frame);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    shown.value = target;
    return;
  }
  const from = shown.value;
  const startedAt = performance.now();
  const tick = (now: number) => {
    const progress = Math.min((now - startedAt) / props.duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    shown.value = Math.round(from + (target - from) * eased);
    if (progress < 1) frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
}

onMounted(() => animateTo(props.value));
watch(() => props.value, animateTo);
onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>
