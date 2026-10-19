<template>
  <div class="flex min-w-0 items-center gap-3">
    <GeoMidiaMark :size="large ? 44 : 36" :tone="tone" />

    <div class="min-w-0 leading-tight">
      <p :class="[format.size, format.weight, format.tracking]">
        <span :class="tone === 'onDark' ? 'text-white' : 'text-[#123a86]'">Geo</span><span :class="midiaColor">Mídia</span>
      </p>
      <p
        v-if="subtitle"
        :class="[
          'flex items-center gap-1.5',
          format.caption,
          tone === 'onDark' ? 'text-sidebar-muted' : 'text-muted-foreground',
        ]"
      >
        <span v-if="selectedId === 'hierarquia'" class="brand-slant inline-block h-2.5 w-[3px] bg-brand-yellow" aria-hidden="true" />
        {{ subtitle }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import GeoMidiaMark from '@/components/brand/GeoMidiaMark.vue';
import { useWordmarkVariant } from '@/composables/useWordmarkVariant';

const props = withDefaults(defineProps<{
  tone?: 'onLight' | 'onDark';
  large?: boolean;
  subtitle?: string;
}>(), { tone: 'onLight', large: false, subtitle: undefined });

const { selectedId } = useWordmarkVariant();

// Cada formatação define tamanho, peso e espaçamento do nome e o tamanho da legenda.
const format = computed(() => {
  const big = props.large;
  switch (selectedId.value) {
    case 'forte':
      return { size: big ? 'text-2xl' : 'text-xl', weight: 'font-extrabold', tracking: 'tracking-[-0.03em]', caption: 'mt-0.5 text-xs' };
    case 'suave':
      return { size: big ? 'text-xl' : 'text-lg', weight: 'font-semibold', tracking: 'tracking-normal', caption: 'mt-1 text-xs' };
    case 'hierarquia':
      return { size: big ? 'text-2xl' : 'text-xl', weight: 'font-bold', tracking: 'tracking-tight', caption: 'mt-1 text-[0.6875rem]' };
    default:
      return { size: big ? 'text-xl' : 'text-lg', weight: 'font-bold', tracking: 'tracking-tight', caption: 'mt-1 text-xs' };
  }
});

const midiaColor = computed(() => {
  if (selectedId.value === 'ciano') return props.tone === 'onDark' ? 'text-[#2fb1f0]' : 'text-[#1593d6]';
  return props.tone === 'onDark' ? 'text-[#5cc3f7]' : 'text-[#1b8ae6]';
});
</script>
