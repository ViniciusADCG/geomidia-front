<template>
  <component
    :is="to ? RouterLink : 'div'"
    :to="to"
    :aria-label="to ? `${label}: ${value}. Ver lista` : undefined"
    :class="cn(
      'group relative flex min-w-0 items-center gap-4 rounded-lg p-5 outline-none transition-[box-shadow,translate]',
      palette.soft,
      to && 'hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0',
    )"
  >
    <span :class="cn('grid size-12 shrink-0 place-items-center rounded-full bg-card shadow-xs', palette.text)" aria-hidden="true">
      <component :is="icon" class="size-6" />
    </span>
    <!-- Atalho: seta no canto e "Ver lista" ao passar o mouse; leva à página do indicador. -->
    <span
      v-if="to"
      :class="cn('absolute top-3 right-3 flex items-center gap-0.5 rounded-full bg-card px-2 py-0.5 text-xs font-medium shadow-xs', palette.text)"
      aria-hidden="true"
    >
      <span class="max-w-0 overflow-hidden whitespace-nowrap transition-[max-width] duration-300 group-hover:max-w-16 group-focus-visible:max-w-16">Ver lista</span>
      <ChevronRight class="size-3.5 transition-transform group-hover:translate-x-0.5" />
    </span>
    <div class="min-w-0">
      <p class="text-sm text-foreground/80">{{ label }}</p>
      <p :class="cn('tabular text-3xl leading-tight font-semibold', palette.text)"><CountUp :value="value" /></p>
      <p class="text-xs text-foreground/70">{{ caption }}</p>
    </div>
  </component>
</template>

<script setup lang="ts">
import { ChevronRight } from '@lucide/vue';
import type { Component } from 'vue';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import CountUp from '@/components/common/CountUp.vue';
import { cn } from '@/lib/utils';

// Bloco de indicador do Dashboard: fundo clarinho na cor do indicador, ícone e número na cor forte.
export type StatTone = 'sky' | 'amber' | 'emerald' | 'red' | 'orange' | 'rose';

const props = defineProps<{
  label: string;
  value: number;
  caption: string;
  icon: Component;
  tone: StatTone;
  to?: string;
}>();

const PALETTES: Record<StatTone, { text: string; soft: string }> = {
  sky: { text: 'text-sky-600', soft: 'bg-sky-500/10' },
  amber: { text: 'text-amber-600', soft: 'bg-amber-500/12' },
  emerald: { text: 'text-emerald-700', soft: 'bg-emerald-600/10' },
  red: { text: 'text-red-600', soft: 'bg-red-600/10' },
  orange: { text: 'text-orange-600', soft: 'bg-orange-500/12' },
  rose: { text: 'text-rose-700', soft: 'bg-rose-700/10' },
};

const palette = computed(() => PALETTES[props.tone]);
</script>
