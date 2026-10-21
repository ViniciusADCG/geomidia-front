<template>
  <RouterLink
    to="/inventario"
    class="total-ring group flex flex-col gap-4 overflow-hidden rounded-lg p-6 text-white outline-none transition-[box-shadow,translate] hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-brand-yellow motion-reduce:hover:translate-y-0"
  >
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="flex items-center gap-2 font-medium text-white/85"><Layers class="size-5" aria-hidden="true" />Total de ativos</p>
        <p class="mt-2 flex items-baseline gap-2">
          <span class="tabular text-5xl leading-none font-semibold"><CountUp :value="total" /></span>
          <span class="text-sm text-white/65">no inventário municipal</span>
        </p>
      </div>
      <span class="flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-sm text-white/85 transition-colors group-hover:bg-white/20">
        Ver inventário <ChevronRight class="size-4" aria-hidden="true" />
      </span>
    </div>

    <div class="flex min-w-0 items-center gap-6">
      <DonutChart
        :segments="segments"
        :size="104"
        :thickness="13"
        track-color="rgb(255 255 255 / 0.12)"
        label="Andamento dos processos"
      />
      <ul class="grid min-w-0 flex-1 gap-1.5 text-sm">
        <li v-for="item in segments" :key="item.label" class="flex items-center gap-2">
          <span class="size-2.5 shrink-0 rounded-full" :style="{ backgroundColor: item.color }" aria-hidden="true" />
          <span class="flex-1 text-white/80">{{ item.label }}</span>
          <span class="tabular font-semibold">{{ item.value }}</span>
          <span class="tabular w-10 text-right text-white/60">{{ share(item.value) }}%</span>
        </li>
      </ul>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { ChevronRight, Layers } from '@lucide/vue';
import { RouterLink } from 'vue-router';

import CountUp from '@/components/common/CountUp.vue';
import DonutChart from '@/components/dashboard/DonutChart.vue';

// Caixa azul do total de ativos: o número em destaque e a rosca do andamento dos processos, com a
// quantidade e a porcentagem de cada situação ao lado.
const props = defineProps<{
  total: number;
  segments: { label: string; value: number; color: string }[];
}>();

function share(value: number) {
  return Math.round((value / Math.max(props.total, 1)) * 100);
}
</script>

<style scoped>
.total-ring {
  background: linear-gradient(180deg, var(--brand-navy), #222d78);
}
</style>
