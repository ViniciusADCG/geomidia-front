<template>
  <div class="flex min-w-0 items-center gap-3">
    <GeoMidiaMark :size="large ? 44 : 36" :tone="tone" />

    <div class="min-w-0 leading-tight">
      <p :class="['font-bold tracking-tight', large ? 'text-2xl' : 'text-xl']">
        <span :class="tone === 'onDark' ? 'text-white' : 'text-[#123a86]'">Geo</span><span :class="tone === 'onDark' ? 'text-[#5cc3f7]' : 'text-[#1b8ae6]'">Mídia</span>
      </p>
      <p
        v-if="subtitle"
        :class="['mt-1 flex items-center gap-1.5 text-[0.6875rem]', tone === 'onDark' ? 'text-sidebar-muted' : 'text-muted-foreground']"
      >
        <span class="brand-slant inline-block h-2.5 w-[3px] bg-brand-yellow" aria-hidden="true" />
        {{ subtitle }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import GeoMidiaMark from '@/components/brand/GeoMidiaMark.vue';

// Símbolo + nome em duas cores. A legenda leva o traço amarelo inclinado da identidade.
withDefaults(defineProps<{
  tone?: 'onLight' | 'onDark';
  large?: boolean;
  subtitle?: string;
}>(), { tone: 'onLight', large: false, subtitle: undefined });
</script>
