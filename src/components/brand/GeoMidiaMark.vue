<template>
  <span
    v-if="variant"
    :class="cn('inline-block shrink-0 [&>svg]:size-full', props.class)"
    :style="{ width: `${size}px`, height: `${size}px` }"
    aria-hidden="true"
    v-html="variant.svg(MARK_TONES[tone])"
  />
  <img
    v-else
    src="/Logocircular-arredondado.png"
    alt=""
    :width="size"
    :height="size"
    :class="cn('shrink-0 rounded-full', props.class)"
  />
</template>

<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

import { MARK_TONES } from '@/components/brand/geomidia-marks';
import { useLogoVariant } from '@/composables/useLogoVariant';
import { cn } from '@/lib/utils';

const props = withDefaults(defineProps<{
  size?: number;
  tone?: 'onLight' | 'onDark';
  class?: HTMLAttributes['class'];
}>(), { size: 36, tone: 'onLight' });

const { variant } = useLogoVariant();
</script>
