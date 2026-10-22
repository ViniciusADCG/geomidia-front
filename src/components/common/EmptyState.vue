<template>
  <div :class="cn('flex flex-col items-center justify-center px-6 py-10 text-center', props.class)">
    <component :is="icon" v-if="icon" class="size-8 text-muted-foreground/70" aria-hidden="true" />
    <p class="mt-3 font-medium">{{ title }}</p>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-muted-foreground">{{ description }}</p>
    <div v-if="$slots.default" class="mt-4"><slot /></div>
  </div>
</template>

<script setup lang="ts">
import type { Component, HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<{
  title: string;
  description?: string;
  icon?: Component;
  class?: HTMLAttributes['class'];
}>();
</script>
