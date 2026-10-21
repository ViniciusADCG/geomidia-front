<template>
  <aside
    class="fixed right-4 bottom-4 z-[60] w-[19rem] rounded-lg border bg-card text-sm shadow-xl"
    aria-label="Testar variantes"
  >
    <button
      type="button"
      class="flex w-full items-center justify-between gap-2 rounded-lg px-4 py-3 font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <span class="flex items-center gap-2">
        <span class="brand-slant inline-block h-3 w-[3px] bg-brand-yellow" aria-hidden="true" />
        {{ title }}
      </span>
      <ChevronDown :class="cn('size-4 transition-transform', expanded && 'rotate-180')" aria-hidden="true" />
    </button>

    <div v-if="expanded" class="grid gap-4 border-t px-4 pt-3 pb-4">
      <fieldset v-for="group in groups" :key="group.key" class="grid gap-2">
        <legend class="mb-1 text-muted-foreground">{{ group.label }}</legend>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="option in group.options"
            :key="option.value"
            type="button"
            :title="option.hint"
            :aria-pressed="values[group.key].value === option.value"
            :class="cn(
              'rounded-md border px-2.5 py-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
              values[group.key].value === option.value ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
            )"
            @click="values[group.key].value = option.value"
          >
            {{ option.label }}
          </button>
        </div>
        <p class="text-xs text-muted-foreground">{{ currentHint(group) }}</p>
      </fieldset>
      <p v-if="note" class="text-xs text-muted-foreground">{{ note }}</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ChevronDown } from '@lucide/vue';
import { ref } from 'vue';

import { useVariant } from '@/composables/useVariant';
import { cn } from '@/lib/utils';

// Painel de teste (só em desenvolvimento) para trocar variantes ao vivo no próprio sistema.
export interface VariantGroup {
  key: string;
  label: string;
  fallback: string;
  options: { value: string; label: string; hint: string }[];
}

const props = defineProps<{ title: string; groups: VariantGroup[]; note?: string }>();

const expanded = ref(true);
const values = Object.fromEntries(props.groups.map((group) => [group.key, useVariant(group.key, group.fallback)]));

function currentHint(group: VariantGroup) {
  return group.options.find((option) => option.value === values[group.key].value)?.hint ?? '';
}
</script>
