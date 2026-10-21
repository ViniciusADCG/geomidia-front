<template>
  <main
    :class="[
      'relative flex min-h-dvh flex-col px-4 py-6 sm:px-8',
      leaving && 'login-leaving',
      arriving && 'login-arriving',
    ]"
  >
    <LoginBackground />
    <div class="relative flex flex-1 items-center justify-center py-10">
      <div class="login-card relative w-full max-w-[536px] overflow-hidden rounded-[23px] bg-card border border-[#d9e4ed] shadow-[0_26px_48px_rgb(19_48_76/0.25)]">
        <div class="login-hero relative isolate flex h-[225px] flex-col items-center justify-center text-white">
          <GeoMidiaMark tone="onDark" :size="96" class="drop-shadow-[0_3px_4px_rgb(0_19_48/0.35)]" />
          <p class="mt-2 text-[2.75rem] leading-none font-extrabold tracking-[-0.045em]">
            Geo<span class="text-[#5cc3f7]">Mídia</span>
          </p>
          <p class="mt-1.5 text-[0.6875rem] font-semibold tracking-[0.09em] text-[#eef7ff] uppercase">
            Gestão de Mídia Exterior e GIS · GeoMídia v1.0
          </p>
        </div>
        <LoginForm class="px-6 pt-6 pb-10 sm:px-[38px] sm:pb-11" />
      </div>
    </div>
    <footer class="login-chrome relative flex flex-col items-center gap-3 text-center text-sm text-[#405873]">
      <BrandLockup :height="30" />
      <p>Secretaria Municipal de Meio Ambiente, Gestão Urbana e Desenvolvimento Econômico, Turístico e Sustentável</p>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import BrandLockup from '@/components/brand/BrandLockup.vue';
import GeoMidiaMark from '@/components/brand/GeoMidiaMark.vue';
import LoginBackground from '@/components/login/LoginBackground.vue';
import LoginForm from '@/components/login/LoginForm.vue';
import { useFarewell } from '@/composables/useFarewell';
import { useWelcome } from '@/composables/useWelcome';

const welcome = useWelcome();
const farewell = useFarewell();
const leaving = computed(() => welcome.phase.value === 'leaving');
// Voltando do painel depois de sair: o cartão reaparece saindo do desfoque.
const arriving = computed(() => farewell.phase.value === 'arriving');
</script>

<style scoped>
/* Cabeçalho do cartão da versão anterior: foto da cidade tingida de azul, com a borda de baixo
   recortada em ondas. */
.login-hero {
  background:
    linear-gradient(180deg, rgb(27 36 99 / 0.25), rgb(27 36 99 / 0.45)),
    url('/login/cidade.jpg') center 65% / cover no-repeat;
}

.login-hero::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 14px;
  background: var(--card);
  clip-path: polygon(0 70%, 15% 12%, 45% 37%, 68% 0, 86% 12%, 100% 70%, 100% 100%, 0 100%);
}

/* Saída do login depois de entrar: marcas e rodapé somem e o cartão se achata numa linha amarela
   que encolhe até sumir. Dali sobem as camadas do símbolo nas boas-vindas.
   Só transform e opacidade mudam: o cartão é desenhado uma vez e o navegador só o escala, e o
   amarelo é uma película por cima que aparece, sem repintar a foto e a sombra a cada quadro. */
.login-leaving .login-chrome {
  transition: opacity 300ms ease-in;
  opacity: 0;
}

.login-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--color-brand-yellow);
  opacity: 0;
  pointer-events: none;
}

.login-leaving .login-card {
  pointer-events: none;
  will-change: transform;
  animation: leave-flatten 650ms cubic-bezier(0.6, 0, 0.4, 1) forwards;
}

.login-leaving .login-card::after {
  animation: leave-yellow 650ms cubic-bezier(0.6, 0, 0.4, 1) forwards;
}

.login-leaving .login-card > * {
  transition: opacity 150ms ease-in;
  opacity: 0;
}

@keyframes leave-flatten {
  40% { transform: scaleY(0.012); }
  100% { transform: scale(0, 0.012); }
}

@keyframes leave-yellow {
  40%, 100% { opacity: 1; }
}

/* Volta ao login depois de sair: marcas e rodapé reaparecem e o cartão volta. */
.login-arriving .login-chrome {
  animation: arrive-fade 400ms ease-out both;
}

@keyframes arrive-fade {
  from { opacity: 0; }
}

/* O cartão aparece saindo do desfoque, depois que a cidade cobriu o painel. */
.login-arriving .login-card {
  animation: arrive-blur 550ms ease-out both;
}

@keyframes arrive-blur {
  from { opacity: 0; filter: blur(12px); transform: scale(0.94); }
}

@media (prefers-reduced-motion: reduce) {
  .login-leaving .login-card {
    animation: none;
    opacity: 0;
  }
}
</style>
