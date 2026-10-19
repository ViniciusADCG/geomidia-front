<template>
  <div
    v-if="visible"
    role="status"
    aria-live="polite"
    :class="['welcome fixed inset-0 z-[3000] cursor-pointer overflow-hidden', reduceMotion && 'welcome-reduced']"
    @click="finish"
  >
    <div ref="backdrop" class="absolute inset-0 bg-[#141b55]">
      <LoginBackground />
    </div>

    <div class="absolute inset-0 grid place-items-center px-6 text-center text-white">
      <div class="flex flex-col items-center">
        <span ref="flyer" class="welcome-assemble block size-36 [&>svg]:size-full" aria-hidden="true" v-html="symbolSvg" />
        <p ref="text" class="welcome-text mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">{{ message }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { geomidiaSymbolSvg } from '@/components/brand/geomidia-marks';
import LoginBackground from '@/components/login/LoginBackground.vue';
import { useWelcome } from '@/composables/useWelcome';
import { welcomeMessage } from '@/lib/greeting';
import { useAuthStore } from '@/stores/auth';

// Boas-vindas depois do login, sobre o mesmo fundo animado: as camadas do símbolo surgem, o pino
// cai do alto com a saudação do horário e, no fim, voa até o logo da faixa enquanto as abas entram
// pela esquerda.
// Clique ou Esc pulam.
const welcome = useWelcome();
const auth = useAuthStore();

const backdrop = ref<HTMLElement | null>(null);
const flyer = ref<HTMLElement | null>(null);
const text = ref<HTMLElement | null>(null);

const now = ref(new Date());
const message = computed(() => welcomeMessage(auth.userName, now.value));
const visible = computed(() => welcome.phase.value === 'greeting' || welcome.phase.value === 'landing');
const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const symbolSvg = geomidiaSymbolSvg('onDark');

const GREETING_MS = 2300;
const LANDING_MS = 850;
const ROOT_CLASSES = ['welcome-hide-mark', 'welcome-nav-in'];

let timers: number[] = [];

function later(ms: number, fn: () => void) {
  timers.push(window.setTimeout(fn, ms));
}

function finish() {
  timers.forEach((id) => window.clearTimeout(id));
  timers = [];
  document.documentElement.classList.remove(...ROOT_CLASSES);
  window.removeEventListener('keydown', onKey);
  welcome.finish();
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') finish();
}

// O lugar do símbolo no painel: o logo da faixa, marcado com data-welcome-target. No celular não há alvo.
function landingTarget(): HTMLElement | null {
  const target = document.querySelector<HTMLElement>('[data-welcome-target] > div > span');
  const rect = target?.getBoundingClientRect();
  return target && rect && rect.width > 0 && rect.right > 0 ? target : null;
}

function land() {
  welcome.land();
  const element = flyer.value;
  const target = landingTarget();
  const ease = 'cubic-bezier(0.65, 0, 0.35, 1)';

  text.value?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' });
  document.documentElement.classList.add('welcome-nav-in');

  if (element && target) {
    const from = element.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    element.style.transformOrigin = 'top left';
    element.animate(
      [{ transform: 'none' }, { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width})` }],
      { duration: LANDING_MS - 100, easing: ease, fill: 'forwards' },
    );
  } else if (element) {
    element.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(0.4)' }], { duration: 450, easing: ease, fill: 'forwards' });
  }

  backdrop.value?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: LANDING_MS - 150, delay: 150, easing: 'ease-in-out', fill: 'forwards' });
}

watch(() => welcome.phase.value, async (phase, previous) => {
  if (phase !== 'greeting' || previous === 'greeting') return;
  timers.forEach((id) => window.clearTimeout(id));
  timers = [];
  now.value = new Date();
  window.addEventListener('keydown', onKey);
  document.documentElement.classList.add('welcome-hide-mark');
  await nextTick();

  if (reduceMotion) {
    later(1400, finish);
    return;
  }
  later(GREETING_MS, land);
  later(GREETING_MS + LANDING_MS + 50, finish);
});

onBeforeUnmount(finish);
</script>

<style scoped>
.welcome-text {
  animation: welcome-text-in 600ms ease-out 1000ms both;
}

@keyframes welcome-text-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}

/* As camadas sobem da linha em que o cartão se achatou; o pino cai do alto da tela e quica. */
.welcome-assemble :deep(svg > g > *) {
  transform-box: fill-box;
  animation: welcome-rise 420ms ease-out both;
}

.welcome-assemble :deep(svg > g > :nth-child(1)) { animation-delay: 100ms; }
.welcome-assemble :deep(svg > g > :nth-child(2)) { animation-delay: 300ms; }
.welcome-assemble :deep(svg > g > :nth-child(3)),
.welcome-assemble :deep(svg > g > :nth-child(4)) { animation-delay: 500ms; }

.welcome-assemble :deep(svg > g > :nth-child(n + 5)) {
  animation: welcome-pin-fall 700ms cubic-bezier(0.5, 0, 0.75, 0) 650ms both, welcome-pin-bounce 380ms ease-out 1350ms;
}

@keyframes welcome-rise {
  from { opacity: 0; transform: translateY(14px) scaleX(0.6); }
  to { opacity: 1; transform: none; }
}

@keyframes welcome-pin-fall {
  from { opacity: 1; transform: translateY(-60vh); }
  to { opacity: 1; transform: none; }
}

@keyframes welcome-pin-bounce {
  40% { transform: translateY(-10px); }
  70% { transform: translateY(0); }
  85% { transform: translateY(-3px); }
}

/* Movimento reduzido: só a saudação, sem deslocamentos. */
.welcome-reduced .welcome-text,
.welcome-reduced :deep(*) {
  animation: none !important;
}
</style>

<style>
/* Enquanto o símbolo voa, o lugar dele no menu fica vazio para ele pousar. */
html.welcome-hide-mark [data-welcome-target] > div > span:first-child {
  visibility: hidden;
}

/* As abas abaixo da faixa entram pela esquerda enquanto o símbolo pousa. */
html.welcome-nav-in [data-welcome-nav] > nav {
  animation: welcome-nav-in 600ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@keyframes welcome-nav-in {
  from { opacity: 0; transform: translateX(-40px); }
  to { opacity: 1; transform: none; }
}
</style>
