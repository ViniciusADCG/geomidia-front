<template>
  <section>
    <PageHeader title="Dashboard">
      <template #description>
        <span class="tabular">{{ media.stats.total }}</span> {{ media.stats.total === 1 ? 'ativo cadastrado' : 'ativos cadastrados' }} no inventário municipal de mídia exterior.
      </template>
      <template v-if="auth.canWrite" #actions>
        <Button variant="outline" :disabled="exportLoading" @click="exportJson">
          <LoaderCircle v-if="exportLoading" class="animate-spin" />
          <Download v-else />
          Exportar JSON
        </Button>
        <Button @click="$emit('navigate', 'inventory')">
          <Plus />
          Novo cadastro
        </Button>
      </template>
    </PageHeader>

    <div class="grid gap-4">
      <div class="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,2.4fr)]">
        <TotalRing :total="media.stats.total" :segments="statusSegments" />
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatBlock v-for="kpi in kpis" :key="kpi.label" v-bind="kpi" />
        </div>
      </div>
      <div class="grid gap-4 xl:grid-cols-3">
        <TypeChart class="xl:col-span-2" />
        <RecentActivity :limit="5" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { BadgeCheck, CalendarClock, CalendarX, CircleAlert, Download, Inbox, LoaderCircle, Plus, Search } from '@lucide/vue';
import type { Component } from 'vue';
import { computed, ref } from 'vue';

import RecentActivity from '@/components/dashboard/RecentActivity.vue';
import StatBlock, { type StatTone } from '@/components/dashboard/StatBlock.vue';
import TotalRing from '@/components/dashboard/TotalRing.vue';
import TypeChart from '@/components/dashboard/TypeChart.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { Button } from '@/components/ui/button';

import { api } from '../services/api';
import { useMediaStore } from '../stores/media';
import { useAuthStore } from '../stores/auth';

defineEmits<{ navigate: ['dashboard' | 'map' | 'inventory' | 'expirations'] }>();

const media = useMediaStore();
const auth = useAuthStore();
const exportLoading = ref(false);

interface Kpi { label: string; value: number; caption: string; icon: Component; tone: StatTone; to?: string }

// Indicadores em blocos ao lado da caixa azul do total (pedido do dono do sistema).
const kpis = computed<Kpi[]>(() => [
  { label: 'Novos processos', value: media.stats.new_processes, caption: 'Aguardando início da análise', icon: Inbox, tone: 'sky' },
  { label: 'Em análise', value: media.stats.pending, caption: 'Processos em análise técnica', icon: Search, tone: 'amber' },
  { label: 'Autorizados', value: media.stats.approved, caption: 'Ativos aprovados', icon: BadgeCheck, tone: 'emerald' },
  { label: 'Irregulares', value: media.stats.rejected, caption: 'Solicitações irregulares', icon: CircleAlert, tone: 'red' },
  { label: 'Próximos ao vencimento', value: media.stats.expiring_soon, caption: 'Vencem nos próximos 90 dias', icon: CalendarClock, tone: 'orange', to: '/vencimentos#proximos' },
  { label: 'Vencidos', value: media.stats.expired, caption: 'Autorizações já vencidas', icon: CalendarX, tone: 'rose', to: '/vencimentos#vencidos' },
]);
// Andamento na rosca da caixa azul, nas cores dos blocos de cada situação.
const statusSegments = computed(() => [
  { label: 'Novos', value: media.stats.new_processes, color: '#38bdf8' },
  { label: 'Em análise', value: media.stats.pending, color: '#fbbf24' },
  { label: 'Autorizados', value: media.stats.approved, color: '#34d399' },
  { label: 'Irregulares', value: media.stats.rejected, color: '#f87171' },
]);

async function exportJson() {
  if (exportLoading.value) return;
  exportLoading.value = true;
  try {
    const items = [];
    let offset = 0;
    let total = 0;
    do {
      const page = await api.listMediaAssets({ limit: 500, offset });
      items.push(...page.items);
      total = page.total;
      offset += page.items.length;
      if (page.items.length === 0) break;
    } while (offset < total);
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'inventario-geomidia.json';
    link.click();
    URL.revokeObjectURL(href);
  } catch (error) {
    media.error = error instanceof Error ? error.message : 'Falha ao exportar o inventário.';
  } finally {
    exportLoading.value = false;
  }
}
</script>
