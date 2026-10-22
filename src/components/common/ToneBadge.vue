<template>
  <span
    :class="cn(
      'inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-sm font-medium',
      toneBadgeClasses[tone],
      props.class,
    )"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';
import type { Tone } from '@/lib/tones';
import { toneBadgeClasses } from '@/lib/tones';

const props = withDefaults(defineProps<{ tone?: Tone; class?: HTMLAttributes['class'] }>(), { tone: 'neutral' });
</script>
