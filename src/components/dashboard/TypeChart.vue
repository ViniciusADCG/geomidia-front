<template>
  <section class="rounded-lg border bg-card p-5" aria-labelledby="types-title">
    <div class="flex items-center justify-between gap-4">
      <h2 id="types-title" class="font-semibold">Ativos por tipo de veículo</h2>
      <Button variant="link" class="h-auto px-0" as-child>
        <RouterLink to="/mapa">Abrir no mapa</RouterLink>
      </Button>
    </div>
    <EmptyState
      v-if="media.stats.total === 0"
      :icon="FolderOpen"
      title="Nenhum ativo cadastrado"
      description="Os veículos aparecem aqui assim que forem cadastrados no inventário."
    />

    <!-- Um cartão por tipo, com quantidade, parte do total e uma barra fina. -->
    <ul v-else class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <li v-for="item in items" :key="item.type" class="rounded-md border p-3" :title="tip(item)">
        <p class="flex items-start gap-2 text-sm leading-snug">
          <span class="mt-1 size-2.5 shrink-0 rounded-sm" :style="{ backgroundColor: item.color }" aria-hidden="true" />
          {{ item.label }}
        </p>
        <p class="mt-2 flex items-baseline justify-between gap-2">
          <span class="tabular text-2xl font-semibold"><CountUp :value="item.count" /></span>
          <span class="tabular text-sm text-muted-foreground">{{ item.share }}%</span>
        </p>
        <div class="mt-2 h-1.5 rounded-full bg-muted">
          <div class="motion-bar h-full rounded-full" :style="{ width: `${item.share}%`, backgroundColor: item.color }" />
        </div>
      </li>
    </ul>

  </section>
</template>

<script setup lang="ts">
import { FolderOpen } from '@lucide/vue';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import CountUp from '@/components/common/CountUp.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { Button } from '@/components/ui/button';
import { MEDIA_TYPE_OPTIONS, mediaTypeColor, mediaTypeLabel } from '@/domain/rules';
import { useMediaStore } from '@/stores/media';

// Quantidade de ativos de cada tipo de veículo, um cartão por tipo. A cor segue o tipo, a mesma do mapa.
const media = useMediaStore();

const items = computed(() => {
  const total = Math.max(media.stats.total, 1);
  return MEDIA_TYPE_OPTIONS.map(({ value }) => {
    const count = media.stats.by_type[value] ?? 0;
    const label = mediaTypeLabel(value);
    return {
      type: value,
      label,
      count,
      color: mediaTypeColor(value),
      share: Math.round((count / total) * 100),
    };
  });
});

function tip(item: { label: string; count: number; share: number }) {
  return `${item.label}: ${item.count} ${item.count === 1 ? 'ativo' : 'ativos'} (${item.share}% do total)`;
}
</script>
