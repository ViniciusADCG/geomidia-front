<template>
  <div
    class="fixed right-4 bottom-4 z-[2000] w-72 rounded-lg border bg-card p-3 text-foreground shadow-lg"
    role="group"
    aria-label="Testar tela de login"
  >
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm font-semibold">Testar tela de login</p>
      <button
        type="button"
        class="rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        @click="collapsed = !collapsed"
      >
        {{ collapsed ? 'Abrir' : 'Recolher' }}
      </button>
    </div>
    <template v-if="!collapsed">
      <div class="mt-3 grid gap-1.5">
        <button
          v-for="(option, index) in variants"
          :key="option.id"
          type="button"
          :aria-pressed="selectedId === option.id"
          :class="cn(
            'rounded-md border px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
            selectedId === option.id ? 'border-primary bg-secondary text-foreground' : 'hover:bg-muted',
          )"
          @click="selectedId = option.id"
        >
          {{ index + 1 }}. {{ option.name }}
        </button>
      </div>
      <p class="mt-3 text-xs text-muted-foreground">{{ current?.idea }}</p>
      <p class="mt-2 text-xs text-muted-foreground">Só aparece em localhost. Saia do sistema para ver a tela de login.</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { useLoginVariant } from '@/composables/useLoginVariant';
import { cn } from '@/lib/utils';

const { selectedId, variants } = useLoginVariant();
const collapsed = ref(false);
const current = computed(() => variants.find((item) => item.id === selectedId.value));
</script>
