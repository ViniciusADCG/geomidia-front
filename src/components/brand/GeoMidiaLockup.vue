<template>
  <div class="flex min-w-0 items-center gap-3">
    <GeoMidiaMark :size="large ? 44 : 36" :tone="tone" />

    <div v-if="selectedId === 'empilhado'" :class="['font-bold tracking-tight', large ? 'text-2xl leading-[1.05]' : 'text-xl leading-[1.05]', nameColor]">
      <span class="block">Geo</span>
      <span class="block">Mídia</span>
    </div>

    <div v-else class="min-w-0 leading-tight">
      <span
        v-if="selectedId === 'placa'"
        :class="['inline-block border-2 border-brand-yellow bg-brand-navy px-2.5 py-0.5 brand-slant rounded-[3px]', large ? 'text-xl' : 'text-lg']"
      >
        <span class="inline-block skew-x-12 font-bold tracking-tight text-white">GeoMídia</span>
      </span>
      <p v-else :class="['tracking-tight', large ? 'text-xl' : 'text-lg']">
        <template v-if="selectedId === 'duas-cores'">
          <span :class="['font-bold', nameColor]">Geo</span><span :class="['font-bold', accentColor]">Mídia</span>
        </template>
        <template v-else-if="selectedId === 'peso'">
          <span :class="['font-bold', nameColor]">Geo</span><span :class="['font-normal', nameColor]">Mídia</span>
        </template>
        <span v-else :class="['font-bold', nameColor]">GeoMídia</span>
      </p>

      <p v-if="caption" :class="['mt-1 text-xs', tone === 'onDark' ? 'text-sidebar-muted' : 'text-muted-foreground']">{{ caption }}</p>
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

const nameColor = computed(() => (props.tone === 'onDark' ? 'text-white' : 'text-[#123a86]'));
const accentColor = computed(() => (props.tone === 'onDark' ? 'text-[#5cc3f7]' : 'text-[#1b8ae6]'));
// "Com descritor" troca a legenda pela descrição do sistema.
const caption = computed(() => (selectedId.value === 'descritor' ? 'Gestão de mídia exterior' : props.subtitle));
</script>
