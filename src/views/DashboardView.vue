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

    <div class="grid gap-4 xl:grid-cols-3">
      <section class="rounded-lg border bg-card p-5 xl:col-span-2" aria-labelledby="pipeline-title">
        <h2 id="pipeline-title" class="font-semibold">Andamento dos processos</h2>
        <div class="mt-4 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div
            v-for="step in pipeline"
            :key="step.label"
            :class="['motion-bar', step.bar]"
            :style="{ width: `${step.share}%` }"
          />
        </div>
        <ol class="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
          <li v-for="step in pipeline" :key="step.label" class="min-w-0 sm:border-l sm:pl-4 sm:first:border-l-0 sm:first:pl-0">
            <p class="flex items-center gap-2 text-sm text-muted-foreground">
              <span :class="['size-2 rounded-full', step.bar]" aria-hidden="true" />
              {{ step.label }}
            </p>
            <p class="tabular mt-1 text-3xl font-semibold"><CountUp :value="step.value" /></p>
            <p class="mt-0.5 text-sm text-muted-foreground">{{ step.caption }}</p>
          </li>
        </ol>
      </section>

      <RouterLink
        to="/vencimentos"
        class="group flex flex-col rounded-lg border bg-card p-5 outline-none transition-[border-color,box-shadow,translate] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0"
        aria-labelledby="expiry-title"
      >
        <div class="flex items-center justify-between">
          <h2 id="expiry-title" class="font-semibold">Vencimentos</h2>
          <ChevronRight class="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </div>
        <dl class="mt-4 grid flex-1 grid-cols-2 gap-4">
          <div :class="['rounded-md p-4', media.stats.expired ? 'bg-danger-soft' : 'bg-muted']">
            <dt class="text-sm text-muted-foreground">Vencidos</dt>
            <dd :class="['tabular mt-1 text-3xl font-semibold', media.stats.expired && 'text-destructive']"><CountUp :value="media.stats.expired" /></dd>
          </div>
          <div :class="['rounded-md p-4', media.stats.expiring_soon ? 'bg-warning-soft' : 'bg-muted']">
            <dt class="text-sm text-muted-foreground">Vencem em 90 dias</dt>
            <dd :class="['tabular mt-1 text-3xl font-semibold', media.stats.expiring_soon && 'text-warning']"><CountUp :value="media.stats.expiring_soon" /></dd>
          </div>
        </dl>
      </RouterLink>

      <section class="rounded-lg border bg-card p-5 xl:col-span-2" aria-labelledby="types-title">
        <div class="flex items-center justify-between gap-4">
          <h2 id="types-title" class="font-semibold">Ativos por tipo de veículo</h2>
          <Button variant="link" class="h-auto px-0" @click="$emit('navigate', 'map')">
            Abrir no mapa
          </Button>
        </div>
        <EmptyState
          v-if="media.stats.total === 0"
          :icon="FolderOpen"
          title="Nenhum ativo cadastrado"
          description="Os veículos aparecem aqui assim que forem cadastrados no inventário."
        />
        <ul v-else class="mt-4 grid gap-3.5">
          <li v-for="item in chartData" :key="item.type">
            <div class="flex items-baseline justify-between gap-4 text-sm">
              <span class="truncate">{{ mediaTypeLabel(item.type) }}</span>
              <span class="tabular font-semibold"><CountUp :value="item.count" /></span>
            </div>
            <div class="mt-1.5 h-2 rounded-full bg-muted">
              <div
                class="motion-bar h-full rounded-full"
                :style="{ width: `${item.percent}%`, backgroundColor: mediaTypeColor(item.type) }"
              />
            </div>
          </li>
        </ul>
      </section>

      <section class="rounded-lg border bg-card p-5" aria-labelledby="activity-title">
        <h2 id="activity-title" class="font-semibold">Atividades recentes</h2>
        <EmptyState
          v-if="media.activities.length === 0"
          :icon="History"
          title="Nenhuma atividade ainda"
          description="Cadastros, aprovações e edições ficam registrados aqui."
        />
        <ol v-else class="mt-3 divide-y">
          <li v-for="activity in media.activities" :key="activity.id" class="py-3 first:pt-1">
            <div class="flex items-start justify-between gap-3">
              <p class="min-w-0">{{ activity.message }}</p>
              <ToneBadge :tone="activityTone(activity.activity_type)" class="capitalize">
                {{ activityLabel(activity.activity_type) }}
              </ToneBadge>
            </div>
            <p class="mt-1 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
              <span class="font-medium text-foreground">{{ activity.process_code }}</span>
              <time :datetime="activity.created_at">{{ formatDateTime(activity.created_at) }}</time>
            </p>
          </li>
        </ol>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ChevronRight, Download, FolderOpen, History, LoaderCircle, Plus } from '@lucide/vue';
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';

import CountUp from '@/components/common/CountUp.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import ToneBadge from '@/components/common/ToneBadge.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { Button } from '@/components/ui/button';
import type { Tone } from '@/lib/tones';

import { MEDIA_TYPE_OPTIONS, mediaTypeColor, mediaTypeLabel } from '../domain/rules';
import { api } from '../services/api';
import { useMediaStore } from '../stores/media';
import { useAuthStore } from '../stores/auth';
import type { ActivityType } from '../types';
import { formatDateTime } from '../utils/format';

defineEmits<{ navigate: ['dashboard' | 'map' | 'inventory' | 'expirations'] }>();

const media = useMediaStore();
const auth = useAuthStore();
const exportLoading = ref(false);

const pipeline = computed(() => {
  const total = Math.max(media.stats.total, 1);
  return [
    { label: 'Novos', value: media.stats.new_processes, caption: 'Aguardam início da análise', bar: 'bg-sky-500' },
    { label: 'Em análise', value: media.stats.pending, caption: 'Em análise técnica', bar: 'bg-amber-500' },
    { label: 'Autorizados', value: media.stats.approved, caption: 'Ativos aprovados', bar: 'bg-emerald-600' },
    { label: 'Irregulares', value: media.stats.rejected, caption: 'Solicitações irregulares', bar: 'bg-red-600' },
  ].map((step) => ({ ...step, share: (step.value / total) * 100 }));
});

const chartData = computed(() => {
  const max = Math.max(...Object.values(media.stats.by_type), 1);
  return MEDIA_TYPE_OPTIONS.map(({ value }) => {
    const count = media.stats.by_type[value] ?? 0;
    return {
      type: value,
      count,
      percent: (count / max) * 100,
    };
  });
});

function activityTone(type: ActivityType): Tone {
  if (type === 'aprovacao') return 'success';
  if (type === 'reprovacao' || type === 'remocao') return 'error';
  if (type === 'cadastro') return 'primary';
  return 'warning';
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  cadastro: 'cadastro',
  aprovacao: 'aprovação',
  reprovacao: 'reprovação',
  edicao: 'edição',
  remocao: 'remoção',
};

function activityLabel(type: ActivityType): string {
  return ACTIVITY_LABELS[type] ?? type;
}

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
