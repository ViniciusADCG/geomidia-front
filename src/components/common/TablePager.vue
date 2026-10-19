<template>
  <div class="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
    <p class="tabular" aria-live="polite">
      <template v-if="total > 0">{{ first }}–{{ last }} de {{ total }}</template>
      <template v-else>Nenhum resultado</template>
    </p>
    <div class="flex items-center gap-3">
      <slot />
      <div class="flex gap-1">
        <Button variant="outline" size="icon-sm" aria-label="Página anterior" :disabled="offset === 0 || loading" @click="emit('change', -1)">
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Próxima página" :disabled="offset + limit >= total || loading" @click="emit('change', 1)">
          <ChevronRight />
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import { computed } from 'vue';

import { Button } from '@/components/ui/button';

const props = defineProps<{
  offset: number;
  limit: number;
  total: number;
  count: number;
  loading?: boolean;
}>();

const emit = defineEmits<{ change: [direction: -1 | 1] }>();

const first = computed(() => props.offset + 1);
const last = computed(() => Math.min(props.offset + props.count, props.total));
</script>
