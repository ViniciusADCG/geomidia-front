<template>
  <div v-if="welcome.active.value" role="status" aria-live="polite">
    <!-- 4. Aviso no painel: não cobre a tela. -->
    <div
      v-if="variant === 'aviso'"
      class="welcome-banner fixed top-20 left-1/2 z-[3000] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2"
    >
      <div class="flex items-center gap-4 rounded-xl border bg-card p-4 pr-3 shadow-xl">
        <span class="welcome-icon grid size-12 shrink-0 place-items-center rounded-full" :class="iconBackground">
          <component :is="periodIcon" class="size-6" aria-hidden="true" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-lg font-semibold">{{ message }}</p>
          <p class="text-sm text-muted-foreground">{{ summary }}</p>
        </div>
        <button
          type="button"
          class="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Fechar boas-vindas"
          @click="close"
        >
          <X class="size-4" />
        </button>
      </div>
    </div>

    <!-- As demais cobrem a tela por menos de 3 segundos. Clique ou Esc pula. -->
    <div
      v-else
      class="welcome-full fixed inset-0 z-[3000] cursor-pointer overflow-hidden"
      :class="[`welcome-${variant}`, reduceMotion && 'welcome-reduced']"
      :style="{ '--welcome-total': `${duration}ms` }"
      @click="close"
    >
      <template v-if="variant === 'cartao'">
        <div class="welcome-card-fill absolute inset-0 bg-brand-night" />
        <div class="welcome-text absolute inset-0 grid place-items-center px-6 text-center text-white">
          <div>
            <p class="text-4xl font-semibold tracking-tight sm:text-5xl">{{ message }}</p>
            <p class="mt-3 text-lg text-white/70">{{ dateLine }}</p>
          </div>
        </div>
      </template>

      <template v-else-if="variant === 'cortina'">
        <div class="welcome-curtain absolute inset-y-0 -left-[20%] w-[140%] border-l-[10px] border-brand-yellow bg-brand-night" />
        <div class="welcome-text absolute inset-0 grid place-items-center px-6 text-center text-white">
          <div>
            <p class="text-4xl font-semibold tracking-tight sm:text-5xl">{{ message }}</p>
            <span class="brand-slant mx-auto mt-4 block h-1.5 w-16 bg-brand-yellow" aria-hidden="true" />
          </div>
        </div>
      </template>

      <template v-else-if="variant === 'simbolo'">
        <div class="absolute inset-0 bg-brand-night" />
        <div class="absolute inset-0 grid place-items-center px-6 text-center text-white">
          <div class="flex flex-col items-center">
            <span class="welcome-assemble block size-36 [&>svg]:size-full" aria-hidden="true" v-html="symbolSvg" />
            <p class="welcome-text mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">{{ message }}</p>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="absolute inset-0" :class="`welcome-sky-${period}`" />
        <template v-if="period === 'noite'">
          <span
            v-for="star in stars"
            :key="star.id"
            class="welcome-star absolute size-1 rounded-full bg-white"
            :style="{ left: `${star.x}%`, top: `${star.y}%`, animationDelay: `${star.delay}s` }"
          />
          <span class="welcome-moon absolute top-[18%] right-[18%] size-20 rounded-full bg-[#f4f1ff]" />
        </template>
        <span v-else class="welcome-sun absolute left-[6%] size-28 rounded-full bg-brand-yellow" :class="`welcome-sun-${period}`" />
        <div class="welcome-text absolute inset-0 grid place-items-center px-6 text-center" :class="period === 'noite' ? 'text-white' : 'text-brand-night'">
          <div>
            <p class="text-4xl font-semibold tracking-tight sm:text-6xl">{{ message }}</p>
            <p class="mt-3 text-lg opacity-75">{{ dateLine }}</p>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Moon, Sun, Sunset, X } from '@lucide/vue';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { geomidiaSymbolSvg } from '@/components/brand/geomidia-marks';
import { useWelcome } from '@/composables/useWelcome';
import { dayPeriod, welcomeMessage } from '@/lib/greeting';
import { useAuthStore } from '@/stores/auth';
import { useMediaStore } from '@/stores/media';

const welcome = useWelcome();
const auth = useAuthStore();
const media = useMediaStore();

const variant = computed(() => welcome.selectedId.value);
// Horário lido quando a animação começa.
const now = ref(new Date());
const period = computed(() => dayPeriod(now.value));
const message = computed(() => welcomeMessage(auth.userName, now.value));
const dateLine = computed(() => new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now.value));
const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const symbolSvg = geomidiaSymbolSvg('onDark');

const duration = computed(() => {
  if (reduceMotion) return 1400;
  return { cartao: 2600, cortina: 2600, simbolo: 2900, aviso: 6500, ceu: 2900 }[variant.value];
});

const periodIcon = computed(() => ({ manha: Sun, tarde: Sunset, noite: Moon }[period.value]));
const iconBackground = computed(() => ({
  manha: 'bg-warning-soft text-warning',
  tarde: 'bg-[#ffe3cc] text-[#a34a00]',
  noite: 'bg-secondary text-primary',
}[period.value]));

const summary = computed(() => {
  const fresh = media.stats.new_processes;
  const pending = media.stats.pending;
  if (fresh > 0) return `${fresh} ${fresh === 1 ? 'processo novo aguarda' : 'processos novos aguardam'} o início da análise.`;
  if (pending > 0) return `${pending} ${pending === 1 ? 'processo está' : 'processos estão'} em análise.`;
  return 'Nenhum processo novo aguardando análise.';
});

const stars = Array.from({ length: 40 }, (_, id) => {
  const r = (n: number) => { const x = Math.sin((id + 1) * n) * 10000; return x - Math.floor(x); };
  return { id, x: r(12.9) * 100, y: r(78.2) * 70, delay: r(39.4) * 2 };
});

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
  timer = window.setTimeout(close, duration.value);
});

onBeforeUnmount(() => {
  window.clearTimeout(timer);
  window.removeEventListener('keydown', onKey);
});
</script>

<style scoped>
/* Saída comum: todas as versões de tela cheia somem nos últimos 500 ms. */
.welcome-full {
  animation: welcome-out 500ms ease-in forwards;
  animation-delay: calc(var(--welcome-total) - 500ms);
}

@keyframes welcome-out {
  to { opacity: 0; }
}

.welcome-text {
  animation: welcome-text-in 600ms ease-out both;
  animation-delay: 450ms;
}

@keyframes welcome-text-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}

/* 1. O "cartão" (do tamanho do cartão de login) cresce até a tela inteira. */
.welcome-card-fill {
  animation: welcome-card 750ms cubic-bezier(0.7, 0, 0.2, 1) both;
}

@keyframes welcome-card {
  from { clip-path: inset(calc(50% - 210px) calc(50% - 224px) round 12px); background-color: #ffffff; }
  60% { background-color: #1b2463; }
  to { clip-path: inset(0 round 0); background-color: #1b2463; }
}

/* 2. Faixa inclinada entra pela direita, para e sai pela esquerda revelando o painel. */
.welcome-curtain {
  transform: skewX(-12deg) translateX(110%);
  animation: welcome-curtain var(--welcome-total) cubic-bezier(0.7, 0, 0.2, 1) both;
}

@keyframes welcome-curtain {
  0% { transform: skewX(-12deg) translateX(110%); }
  22%, 76% { transform: skewX(-12deg) translateX(0); }
  100% { transform: skewX(-12deg) translateX(-120%); }
}

.welcome-cortina .welcome-text {
  animation:
    welcome-text-in 500ms ease-out 450ms both,
    welcome-out 300ms ease-in calc(var(--welcome-total) * 0.72) forwards;
}

/* 3. Camadas do símbolo caem uma a uma; o pino pousa por último. */
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

.welcome-simbolo .welcome-text {
  animation-delay: 1100ms;
}

/* 4. Aviso desliza de cima; o ícone gira ao entrar. */
.welcome-banner {
  animation: welcome-banner 6500ms ease both;
}

@keyframes welcome-banner {
  0% { opacity: 0; transform: translate(-50%, -24px); }
  8%, 90% { opacity: 1; transform: translate(-50%, 0); }
  100% { opacity: 0; transform: translate(-50%, -12px); }
}

.welcome-icon {
  animation: welcome-spin 900ms cubic-bezier(0.3, 1.4, 0.5, 1) 200ms both;
}

@keyframes welcome-spin {
  from { transform: rotate(-120deg) scale(0.4); opacity: 0; }
  to { transform: none; opacity: 1; }
}

/* 5. Céu do horário. */
.welcome-sky-manha { background: linear-gradient(180deg, #9fd8fb 0%, #d9f0ff 55%, #ffe9a8 100%); }
.welcome-sky-tarde { background: linear-gradient(180deg, #3f7fd8 0%, #8fb8ef 50%, #ffb86b 100%); }
.welcome-sky-noite { background: linear-gradient(180deg, #0b1038 0%, #1b2463 70%, #283587 100%); }

.welcome-sun {
  box-shadow: 0 0 80px 30px rgb(255 204 0 / 0.45);
}

.welcome-sun-manha { animation: welcome-sunrise 2600ms ease-out both; }
.welcome-sun-tarde { animation: welcome-sunset 2600ms ease-in both; }

@keyframes welcome-sunrise {
  from { bottom: -8rem; }
  to { bottom: 62%; }
}

@keyframes welcome-sunset {
  from { bottom: 62%; }
  to { bottom: 4%; background-color: #ff9a3c; }
}

.welcome-moon {
  box-shadow: 0 0 60px 16px rgb(214 222 255 / 0.35), inset -14px -6px 0 0 #d6dcf7;
  animation: welcome-text-in 900ms ease-out both;
}

.welcome-star {
  animation: welcome-twinkle 1600ms ease-in-out infinite alternate;
}

@keyframes welcome-twinkle {
  from { opacity: 0.15; }
  to { opacity: 0.9; }
}

/* Movimento reduzido: só a saudação, sem deslocamentos. */
.welcome-reduced *,
.welcome-reduced :deep(*) {
  animation: none !important;
}

.welcome-reduced .welcome-curtain {
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .welcome-banner,
  .welcome-icon {
    animation: none;
  }

  .welcome-banner {
    transform: translateX(-50%);
  }
}
</style>
