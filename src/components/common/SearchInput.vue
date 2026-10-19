<template>
  <div :class="cn('relative', props.class)">
    <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
    <Input
      :model-value="modelValue"
      type="search"
      :placeholder="placeholder"
      :aria-label="label ?? placeholder"
      class="pl-9"
      @update:model-value="emit('update:modelValue', String($event))"
      @keydown.enter="emit('submit')"
    />
  </div>
</template>

<script setup lang="ts">
import { Search } from '@lucide/vue';
import type { HTMLAttributes } from 'vue';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
  label?: string;
  class?: HTMLAttributes['class'];
}>();

const emit = defineEmits<{ 'update:modelValue': [value: string]; submit: [] }>();
</script>
