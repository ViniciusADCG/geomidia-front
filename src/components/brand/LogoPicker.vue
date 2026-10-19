<template>
  <div
    class="fixed right-4 bottom-4 z-[2000] w-72 rounded-lg border bg-card p-3 text-foreground shadow-lg"
    role="group"
    aria-label="Testar logo do GeoMídia"
  >
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm font-semibold">Testar logo</p>
      <button
        type="button"
        class="rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        @click="collapsed = !collapsed"
      >
        {{ collapsed ? 'Abrir' : 'Recolher' }}
      </button>
    </div>
    <template v-if="!collapsed">
      <div class="mt-3 grid grid-cols-3 gap-2">
        <button
          v-for="option in options"
          :key="option.id"
          type="button"
          :aria-pressed="selectedId === option.id"
          :title="option.name"
          :class="cn(
            'grid justify-items-center gap-1 rounded-md border p-2 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
            selectedId === option.id ? 'border-primary bg-secondary' : 'hover:bg-muted',
          )"
          @click="selectedId = option.id"
        >
          <span v-if="option.svg" class="size-8 [&>svg]:size-full" aria-hidden="true" v-html="option.svg" />
          <img v-else src="/Logocircular-arredondado.png" alt="" class="size-8 rounded-full" />
          <span class="truncate">{{ option.name }}</span>
        </button>
      </div>
      <p v-if="variant" class="mt-3 text-xs text-muted-foreground">{{ variant.idea }}</p>
      <p class="mt-2 text-xs text-muted-foreground">Só aparece em localhost. Muda o menu, o login e o ícone da aba.</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { useLogoVariant } from '@/composables/useLogoVariant';
import { cn } from '@/lib/utils';

const { selectedId, variant, variants, currentId } = useLogoVariant();
const collapsed = ref(false);

const options = computed(() => [
  { id: currentId, name: 'Atual', svg: null },
  ...variants.map((item, index) => ({ id: item.id, name: `${index + 1}. ${item.name}`, svg: item.svg('onLight') })),
]);
</script>
