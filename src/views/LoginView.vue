<template>
  <main class="relative flex min-h-dvh flex-col px-4 py-6 sm:px-8">
    <LoginBackground />
    <header class="relative"><BrandLockup tone="onDark" :height="34" /></header>
    <div class="relative flex flex-1 items-center justify-center py-10">
      <div class="w-full max-w-md rounded-xl bg-card p-8 shadow-2xl sm:p-10">
        <GeoMidiaLockup large />
        <LoginForm class="mt-8" />
      </div>
    </div>
    <p class="relative text-center text-sm text-white/70">
      Secretaria Municipal de Meio Ambiente, Gestão Urbana e Desenvolvimento Econômico, Turístico e Sustentável
    </p>
  </main>
</template>

<script setup lang="ts">
import BrandLockup from '@/components/brand/BrandLockup.vue';
import GeoMidiaLockup from '@/components/brand/GeoMidiaLockup.vue';
import LoginBackground from '@/components/login/LoginBackground.vue';
import LoginForm from '@/components/login/LoginForm.vue';
</script>
