<template>
  <main
    :class="[
      'relative flex min-h-dvh flex-col px-4 py-6 sm:px-8',
      leaving && 'login-leaving',
      arriving && 'login-arriving',
    ]"
  >
    <LoginBackground />
    <header class="login-chrome relative"><BrandLockup tone="onDark" :height="34" /></header>
    <div class="relative flex flex-1 items-center justify-center py-10">
      <div class="login-card w-full max-w-md rounded-xl bg-card p-8 shadow-2xl sm:p-10">
        <GeoMidiaLockup large />
        <LoginForm class="mt-8" />
      </div>
    </div>
    <p class="login-chrome relative text-center text-sm text-white/70">
      Secretaria Municipal de Meio Ambiente, Gestão Urbana e Desenvolvimento Econômico, Turístico e Sustentável
    </p>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import BrandLockup from '@/components/brand/BrandLockup.vue';
import GeoMidiaLockup from '@/components/brand/GeoMidiaLockup.vue';
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
/* Saída do login depois de entrar: marcas e rodapé somem e o cartão se achata numa linha amarela
   que encolhe até sumir. Dali sobem as camadas do símbolo nas boas-vindas. */
.login-leaving .login-chrome {
  transition: opacity 300ms ease-in;
  opacity: 0;
}

.login-leaving .login-card {
  pointer-events: none;
  animation: leave-flatten 650ms cubic-bezier(0.6, 0, 0.4, 1) forwards;
}

.login-leaving .login-card > * {
  transition: opacity 150ms ease-in;
  opacity: 0;
}

@keyframes leave-flatten {
  40% { transform: scaleY(0.012); background-color: var(--color-brand-yellow); opacity: 1; }
  100% { transform: scale(0, 0.012); background-color: var(--color-brand-yellow); opacity: 1; }
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
