<template>
  <div
    v-if="welcome.active.value"
    role="status"
    aria-live="polite"
    class="welcome fixed inset-0 z-[3000] cursor-pointer overflow-hidden bg-brand-night"
    :class="reduceMotion && 'welcome-reduced'"
    :style="{ '--welcome-total': `${duration}ms` }"
    @click="close"
  >
    <div class="absolute inset-0 grid place-items-center px-6 text-center text-white">
      <div class="flex flex-col items-center">
        <span class="welcome-assemble block size-36 [&>svg]:size-full" aria-hidden="true" v-html="symbolSvg" />
        <p class="welcome-text mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">{{ message }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { geomidiaSymbolSvg } from '@/components/brand/geomidia-marks';
import { useWelcome } from '@/composables/useWelcome';
import { welcomeMessage } from '@/lib/greeting';
import { useAuthStore } from '@/stores/auth';

// Boas-vindas depois do login: as camadas do símbolo caem uma a uma, o pino pousa e aparece
// a saudação do horário. Some sozinha em menos de 3 s; clique ou Esc pulam.
const welcome = useWelcome();
const auth = useAuthStore();

const now = ref(new Date());
const message = computed(() => welcomeMessage(auth.userName, now.value));
const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const duration = reduceMotion ? 1400 : 2900;
const symbolSvg = geomidiaSymbolSvg('onDark');

let timer = 0;
function close() {
  window.clearTimeout(timer);
  welcome.finish();
}
function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') close();
}

watch(() => welcome.active.value, (active) => {
  window.clearTimeout(timer);
  window.removeEventListener('keydown', onKey);
  if (!active) return;
  now.value = new Date();
  window.addEventListener('keydown', onKey);
  timer = window.setTimeout(close, duration);
});

onBeforeUnmount(() => {
  window.clearTimeout(timer);
  window.removeEventListener('keydown', onKey);
});
</script>

<style scoped>
.welcome {
  animation: welcome-out 500ms ease-in forwards;
  animation-delay: calc(var(--welcome-total) - 500ms);
}

@keyframes welcome-out {
  to { opacity: 0; }
}

.welcome-text {
  animation: welcome-text-in 600ms ease-out 1100ms both;
}

@keyframes welcome-text-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}

/* Camadas do símbolo caem uma a uma; o pino pousa por último. */
.welcome-assemble :deep(svg > g > *) {
  transform-box: fill-box;
  animation: welcome-drop 520ms cubic-bezier(0.3, 1.4, 0.5, 1) both;
}

.welcome-assemble :deep(svg > g > :nth-child(1)) { animation-delay: 100ms; }
.welcome-assemble :deep(svg > g > :nth-child(2)) { animation-delay: 300ms; }
.welcome-assemble :deep(svg > g > :nth-child(3)),
.welcome-assemble :deep(svg > g > :nth-child(4)) { animation-delay: 500ms; }
.welcome-assemble :deep(svg > g > :nth-child(n + 5)) { animation-delay: 800ms; }

@keyframes welcome-drop {
  from { opacity: 0; transform: translateY(-18px); }
  to { opacity: 1; transform: none; }
}

/* Movimento reduzido: só a saudação, sem deslocamentos. */
.welcome-reduced .welcome-text,
.welcome-reduced :deep(*) {
  animation: none !important;
}
</style>
