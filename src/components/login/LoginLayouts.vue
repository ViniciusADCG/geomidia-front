<template>
  <!-- 1. Dividida -->
  <main v-if="variant === 'dividida'" class="grid min-h-dvh bg-card lg:grid-cols-[minmax(0,1.1fr)_minmax(28rem,0.9fr)]">
    <section
      class="relative flex min-h-56 flex-col justify-between overflow-hidden bg-brand-night bg-cover bg-center p-6 text-white sm:p-10 lg:min-h-dvh lg:p-14"
      :style="cityPhoto"
    >
      <div class="absolute inset-0 bg-gradient-to-t from-brand-night via-brand-night/40 to-transparent" aria-hidden="true" />
      <BrandLockup tone="onDark" :height="40" class="relative" />
      <div class="relative mt-10 max-w-lg">
        <p class="text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-[2.75rem] sm:leading-[1.1]">{{ HEADLINE }}</p>
        <p class="mt-4 hidden max-w-md text-lg text-white/75 sm:block">{{ SECRETARIA }}</p>
      </div>
    </section>
    <section class="flex items-center justify-center px-6 py-10 sm:px-10">
      <div class="w-full max-w-sm">
        <GeoMidiaLockup large />
        <LoginForm class="mt-8" />
      </div>
    </section>
  </main>

  <!-- 2. Cartão sobre a cidade -->
  <main
    v-else-if="variant === 'cartao'"
    class="relative flex min-h-dvh flex-col bg-brand-night bg-cover bg-center px-4 py-6 sm:px-8"
    :style="cityPhoto"
  >
    <div class="absolute inset-0 bg-brand-night/70" aria-hidden="true" />
    <header class="relative"><BrandLockup tone="onDark" :height="34" /></header>
    <div class="relative flex flex-1 items-center justify-center py-10">
      <div class="w-full max-w-md rounded-xl bg-card p-8 shadow-2xl sm:p-10">
        <GeoMidiaLockup large />
        <LoginForm class="mt-8" />
      </div>
    </div>
    <p class="relative text-center text-sm text-white/70">{{ SECRETARIA }}</p>
  </main>

  <!-- 3. Faixa institucional -->
  <main v-else-if="variant === 'faixa'" class="flex min-h-dvh flex-col bg-background">
    <header class="bg-brand-night">
      <div class="mx-auto flex max-w-5xl items-center px-4 py-4 sm:px-8">
        <BrandLockup tone="onDark" :height="32" />
      </div>
      <div class="h-1 bg-brand-yellow" aria-hidden="true" />
    </header>
    <div class="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-4 py-12 sm:px-8 lg:grid-cols-2">
      <div>
        <GeoMidiaLockup large subtitle="Campo Grande, MS" />
        <p class="mt-8 text-3xl font-semibold tracking-tight text-balance text-[#123a86]">{{ HEADLINE }}</p>
        <p class="mt-4 max-w-md text-muted-foreground">
          Inventário, mapa e análise dos veículos de comunicação exterior licenciados pela prefeitura.
        </p>
      </div>
      <div class="rounded-xl border bg-card p-8 sm:p-10">
        <LoginForm />
      </div>
    </div>
    <footer class="border-t bg-card">
      <p class="mx-auto max-w-5xl px-4 py-4 text-sm text-muted-foreground sm:px-8">{{ SECRETARIA }}</p>
    </footer>
  </main>

  <!-- 4. Mapa -->
  <main v-else-if="variant === 'mapa'" class="relative flex min-h-dvh flex-col overflow-hidden" :style="mapPattern">
    <div class="absolute inset-0 bg-gradient-to-r from-white/95 via-white/60 to-white/20" aria-hidden="true" />
    <header class="relative px-4 py-6 sm:px-10"><BrandLockup :height="34" /></header>
    <div class="relative mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 pb-12 sm:px-10 lg:grid-cols-[1fr_26rem]">
      <div class="hidden lg:block">
        <GeoMidiaMark :size="140" />
        <p class="mt-6 max-w-lg text-[2.75rem] leading-[1.1] font-semibold tracking-tight text-balance text-[#123a86]">{{ HEADLINE }}</p>
        <p class="mt-4 max-w-md text-muted-foreground">{{ SECRETARIA }}</p>
      </div>
      <div class="rounded-xl border bg-card p-8 shadow-lg sm:p-10">
        <GeoMidiaLockup large />
        <LoginForm class="mt-8" />
      </div>
    </div>
  </main>

  <!-- 5. Painel escuro -->
  <main v-else-if="variant === 'painel'" class="grid min-h-dvh bg-brand-night lg:grid-cols-[30rem_minmax(0,1fr)]">
    <section class="flex flex-col justify-between gap-10 px-6 py-8 sm:px-12 sm:py-12">
      <GeoMidiaLockup tone="onDark" large subtitle="Campo Grande, MS" />
      <LoginForm dark class="w-full max-w-sm" />
      <BrandLockup tone="onDark" :height="30" />
    </section>
    <section class="relative hidden overflow-hidden bg-cover bg-center lg:block" :style="cityPhoto">
      <div class="absolute inset-0 bg-gradient-to-t from-brand-night/90 via-brand-night/20 to-transparent" aria-hidden="true" />
      <div class="absolute inset-x-12 bottom-12 max-w-xl text-white">
        <p class="text-[2.75rem] leading-[1.1] font-semibold tracking-tight text-balance">{{ HEADLINE }}</p>
        <p class="mt-4 text-lg text-white/75">{{ SECRETARIA }}</p>
      </div>
    </section>
  </main>

  <!-- 6. Minimalista -->
  <main v-else class="flex min-h-dvh flex-col items-center bg-background px-4 py-10">
    <div class="flex w-full max-w-sm flex-1 flex-col justify-center">
      <div class="flex flex-col items-center text-center">
        <GeoMidiaMark :size="76" />
        <p class="mt-3 text-3xl font-bold tracking-tight">
          <span class="text-[#123a86]">Geo</span><span class="text-[#1b8ae6]">Mídia</span>
        </p>
        <p class="mt-1 text-sm text-muted-foreground">Gestão de mídia exterior de Campo Grande</p>
      </div>
      <div class="mt-10 rounded-xl border bg-card p-8">
        <LoginForm />
      </div>
    </div>
    <footer class="mt-10 flex flex-col items-center gap-3 text-center">
      <BrandLockup :height="28" />
      <p class="max-w-md text-xs text-muted-foreground">{{ SECRETARIA }}</p>
    </footer>
  </main>
</template>

<script setup lang="ts">
import BrandLockup from '@/components/brand/BrandLockup.vue';
import GeoMidiaLockup from '@/components/brand/GeoMidiaLockup.vue';
import GeoMidiaMark from '@/components/brand/GeoMidiaMark.vue';
import LoginForm from '@/components/login/LoginForm.vue';
import type { LoginVariantId } from '@/composables/useLoginVariant';

defineProps<{ variant: LoginVariantId }>();

const HEADLINE = 'Mídia exterior de Campo Grande, no mapa e em dia.';
const SECRETARIA = 'Secretaria Municipal de Meio Ambiente, Gestão Urbana e Desenvolvimento Econômico, Turístico e Sustentável';

const cityPhoto = { backgroundImage: "url('/login-hero-city.jpg')" };

// Malha de quadras em perspectiva (as mesmas proporções da camada do símbolo), repetida como fundo.
const block = (cx: number, cy: number, fill: string) => (
  `<path d="M${cx} ${cy - 18} ${cx + 38} ${cy} ${cx} ${cy + 18} ${cx - 38} ${cy}Z" fill="${fill}" stroke="${fill}" stroke-width="2" stroke-linejoin="round"/>`
);
const MAP_TILE = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="46" viewBox="0 0 96 46">
  <rect width="96" height="46" fill="#f1faff"/>
  ${block(48, 23, '#bfe6fb')}
  ${[[0, 0], [96, 0], [0, 46], [96, 46]].map(([x, y]) => block(x, y, '#9dd7f8')).join('')}
</svg>`;
const mapPattern = {
  backgroundColor: '#f1faff',
  backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(MAP_TILE)}")`,
  backgroundSize: '96px 46px',
};
</script>
