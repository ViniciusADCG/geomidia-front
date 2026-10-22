<template>
  <div
    class="flex shrink-0 items-center"
    :style="{ gap: `${gap}px` }"
    role="img"
    aria-label="SEMADES — Prefeitura de Campo Grande"
  >
    <img
      :src="tone === 'onDark' ? '/brand/semades-branco.png' : '/brand/semades-azul.png'"
      alt=""
      :style="{ height: `${semadesHeight}px` }"
      class="w-auto"
    />
    <img
      :src="tone === 'onDark' ? '/brand/prefcg-branco.png' : '/brand/prefcg-original.png'"
      alt=""
      :style="{ height: `${height}px` }"
      class="w-auto"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// Manual PREFCG, meio digital: sigla da secretaria à esquerda da placa, centralizadas,
// separadas por X = metade da altura do "P" (~1/4 da altura da placa).
// A proporção SEMADES/placa (122/194) vem do arquivo oficial "MARCA e SLOGAN 2026".
const props = withDefaults(defineProps<{ height?: number; tone?: 'onLight' | 'onDark' }>(), {
  height: 32,
  tone: 'onLight',
});

const semadesHeight = computed(() => Math.round(props.height * (122 / 194)));
const gap = computed(() => Math.round(props.height / 4));
</script>
