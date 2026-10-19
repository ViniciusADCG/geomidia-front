<template>
  <div :class="cn('grid gap-1.5', props.class)">
    <Label v-if="label" :for="id" class="text-sm font-medium">
      {{ label }}<span v-if="required" class="text-destructive" aria-hidden="true"> *</span>
    </Label>
    <slot :id="id" :invalid="Boolean(error)" :described-by="describedBy" />
    <p v-if="error" :id="`${id}-error`" class="text-sm text-destructive">{{ error }}</p>
    <p v-else-if="hint" :id="`${id}-hint`" class="text-sm text-muted-foreground">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { computed, useId } from 'vue';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const props = defineProps<{
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  class?: HTMLAttributes['class'];
}>();

const id = useId();
const describedBy = computed(() => {
  if (props.error) return `${id}-error`;
  if (props.hint) return `${id}-hint`;
  return undefined;
});
</script>
