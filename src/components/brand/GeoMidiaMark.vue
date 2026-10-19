<template>
  <span
    :class="cn('inline-block shrink-0 [&>svg]:size-full', props.class)"
    :style="{ width: `${size}px`, height: `${size}px` }"
    aria-hidden="true"
    v-html="svg"
  />
</template>

<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { computed } from 'vue';

import { geomidiaSymbolSvg } from '@/components/brand/geomidia-marks';
import { cn } from '@/lib/utils';

const props = withDefaults(defineProps<{
  size?: number;
  tone?: 'onLight' | 'onDark';
  class?: HTMLAttributes['class'];
}>(), { size: 36, tone: 'onLight' });

const svg = computed(() => geomidiaSymbolSvg(props.tone));
</script>
