<template>
  <component
    :is="to ? RouterLink : 'div'"
    :to="to"
    :aria-label="to ? `${label}: ${value}. Ver lista` : undefined"
    :class="cn(
      'group flex min-w-0 items-center gap-4 rounded-lg p-5 outline-none transition-[box-shadow,translate]',
      palette.soft,
      to && 'hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0',
    )"
  >
    <span :class="cn('grid size-12 shrink-0 place-items-center rounded-full bg-card shadow-xs', palette.text)" aria-hidden="true">
      <component :is="icon" class="size-6" />
    </span>
    <div class="min-w-0 flex-1">
      <p class="text-sm text-foreground/80">{{ label }}</p>
      <p :class="cn('tabular text-3xl leading-tight font-semibold', palette.text)"><CountUp :value="value" /></p>
      <p class="text-xs text-foreground/70">{{ caption }}</p>
      <!-- Atalho para a lista do indicador, embaixo da legenda. -->
      <p v-if="to" :class="cn('mt-2 flex items-center gap-1 text-xs font-semibold underline-offset-4 group-hover:underline', palette.text)">
        Ver lista <ChevronRight class="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </p>
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
