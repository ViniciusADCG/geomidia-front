<template>
  <section>
    <PageHeader
      title="Rastreabilidade de processos"
      description="Acompanhe o tempo de tramitação e as mudanças de status. A identificação individual é exclusiva das ações de analistas."
    />

    <form class="mb-5 grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-2 xl:grid-cols-[repeat(6,minmax(0,1fr))_auto]" @submit.prevent="applyFilters">
      <div class="grid gap-1 text-sm font-medium">
        <span>Registros</span>
        <Select v-model="draft.scope">
          <SelectTrigger class="w-full" aria-label="Registros ativos ou excluídos"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="deleted">Excluídos</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <label class="grid gap-1 text-sm font-medium">
        Processo
        <Input v-model="draft.search" placeholder="Código ou protocolo oficial" aria-label="Buscar processo" />
      </label>
      <label class="grid gap-1 text-sm font-medium">
        {{ draft.scope === 'deleted' ? 'Exclusão a partir de' : 'Entrada a partir de' }}
        <Input v-model="draft.fromDate" type="date" />
      </label>
      <label class="grid gap-1 text-sm font-medium">
        {{ draft.scope === 'deleted' ? 'Exclusão até' : 'Entrada até' }}
        <Input v-model="draft.toDate" type="date" />
      </label>
      <div class="grid gap-1 text-sm font-medium">
        <span>Analista</span>
        <Select v-model="draft.analystId">
          <SelectTrigger class="w-full" aria-label="Filtrar por analista"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os analistas</SelectItem>
            <SelectItem v-for="analyst in analysts" :key="analyst.id" :value="analyst.id">{{ analyst.name }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="grid gap-1 text-sm font-medium">
        <span>{{ draft.scope === 'deleted' ? 'Último status' : 'Status atual' }}</span>
        <Select v-model="draft.status">
          <SelectTrigger class="w-full" aria-label="Filtrar por status atual"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem v-for="option in STATUS_OPTIONS" :key="option.value" :value="option.value">{{ option.title }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" class="self-end">Filtrar</Button>
    </form>

    <Alert v-if="error" variant="destructive" class="mb-5">
      <CircleAlert />
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>
    <p v-if="filterError" class="mb-4 text-sm text-destructive" role="alert">{{ filterError }}</p>

    <section class="mb-5 overflow-hidden rounded-lg border bg-card" aria-labelledby="analysts-title">
      <div class="border-b px-5 py-3">
        <h2 id="analysts-title" class="font-semibold">Atuação dos analistas</h2>
        <p class="text-sm text-muted-foreground">Ações realizadas no período selecionado. Os tempos de tramitação pertencem ao processo e à equipe.</p>
      </div>
      <p v-if="summaryError" class="p-5 text-sm text-destructive" role="alert">{{ summaryError }}</p>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b bg-muted/40 text-muted-foreground">
            <tr><th class="px-5 py-2 font-medium">Analista</th><th class="px-4 py-2 font-medium">Processos com atuação</th><th class="px-4 py-2 font-medium">Ações</th><th class="px-4 py-2 font-medium">Análises iniciadas</th><th class="px-4 py-2 font-medium">Aprovações</th></tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="analyst in visibleSummaries" :key="analyst.id">
              <td class="px-5 py-3 font-medium">{{ analyst.name }}</td>
              <td class="px-4 py-3 tabular">{{ analyst.processes_touched }}</td>
              <td class="px-4 py-3 tabular">{{ analyst.actions }}</td>
              <td class="px-4 py-3 tabular">{{ analyst.analyses_started }}</td>
              <td class="px-4 py-3 tabular">{{ analyst.approvals }}</td>
            </tr>
            <tr v-if="!visibleSummaries.length"><td colspan="5" class="px-5 py-4 text-muted-foreground">Nenhum analista encontrado.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <div class="overflow-hidden rounded-lg border bg-card">
      <div class="flex items-center justify-between border-b px-5 py-3">
        <h2 class="font-semibold">{{ applied.scope === 'deleted' ? 'Processos excluídos' : 'Processos ativos' }} <span class="font-normal text-muted-foreground">({{ total }})</span></h2>
        <span class="text-sm text-muted-foreground">Dias corridos</span>
      </div>
      <div v-if="loading" class="grid gap-3 p-5" aria-label="Carregando rastreabilidade">
        <Skeleton v-for="n in 5" :key="n" class="h-20" />
      </div>
      <EmptyState v-else-if="!items.length && !error" :icon="History" title="Nenhum processo encontrado" description="Ajuste os filtros para consultar outro período ou analista." />
      <div v-else class="divide-y">
        <details v-for="process in items" :key="process.process_code" class="group px-5 py-4">
          <summary class="cursor-pointer list-none rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <div class="flex flex-wrap items-center gap-2">
              <ChevronRight class="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
              <strong>{{ process.official_process_code || process.process_code }}</strong>
              <span v-if="process.official_process_code" class="text-xs text-muted-foreground">{{ process.process_code }}</span>
              <span v-if="process.deleted_at" class="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">Excluído</span>
              <StatusBadge v-else-if="process.current_status" :status="process.current_status" />
            </div>
            <div class="mt-2 grid gap-x-4 gap-y-1 pl-6 text-sm sm:grid-cols-2 xl:grid-cols-4">
              <p><span class="text-muted-foreground">Entrada:</span> {{ process.created_at ? formatDateTime(process.created_at) : 'Sem registro' }}</p>
              <p><span class="text-muted-foreground">Até iniciar análise:</span> {{ formatDuration(process.seconds_to_analysis) }}</p>
              <p><span class="text-muted-foreground">Da análise à 1ª aprovação:</span> {{ formatDuration(process.seconds_analysis_to_approval) }}</p>
              <p v-if="process.deleted_at"><span class="text-muted-foreground">Excluído em:</span> {{ formatDateTime(process.deleted_at) }}</p>
              <p v-else><span class="text-muted-foreground">No status atual:</span> {{ formatDuration(process.seconds_in_current_status) }}</p>
            </div>
          </summary>
          <div class="mt-4 border-t pt-4 pl-6">
            <p class="mb-3 text-sm text-muted-foreground">Da entrada à primeira aprovação: <strong class="text-foreground">{{ formatDuration(process.seconds_to_approval) }}</strong></p>
            <p v-if="process.deleted_at" class="mb-3 rounded-md bg-muted/50 px-3 py-2 text-sm"><strong>Justificativa da exclusão:</strong> {{ process.deletion_reason || 'Não registrada no histórico antigo.' }}</p>
            <h3 class="font-medium">Linha do tempo</h3>
            <ol class="mt-3 border-l pl-5">
              <li v-for="(event, index) in process.timeline" :key="`${event.at}-${index}`" class="relative pb-4 last:pb-0">
                <span class="absolute -left-[1.52rem] top-1.5 size-2.5 rounded-full bg-primary" aria-hidden="true" />
                <p class="text-sm font-medium">{{ event.is_entry ? 'Entrada do processo' : event.is_deletion ? 'Exclusão do processo' : `${stageLabel(event.before)} → ${stageLabel(event.after)}` }}</p>
                <p class="text-sm text-muted-foreground">
                  {{ formatDateTime(event.at) }}
                  <template v-if="event.analyst_name"> · Analista: {{ event.analyst_name }}<span v-if="event.analyst_role_inferred"> (perfil atual)</span></template>
                  <template v-else-if="!event.is_entry"> · Sem analista identificado</template>
                </p>
                <p v-if="index < process.timeline.length - 1" class="text-xs text-muted-foreground">
                  Até a próxima etapa: {{ formatDuration(secondsBetween(event.at, process.timeline[index + 1].at)) }}
                </p>
              </li>
            </ol>
          </div>
        </details>
      </div>
      <TablePager
        v-if="total > 0"
        :offset="(page - 1) * pageSize"
        :limit="pageSize"
        :total="total"
        :count="items.length"
        :loading="loading"
        @change="changePage(page + $event)"
      />
    </div>
    <p class="mt-3 text-xs text-muted-foreground">Em eventos antigos, “perfil atual” indica que o perfil do analista foi inferido do cadastro de usuário disponível hoje. Etapas sem registro confiável aparecem sem duração.</p>
  </section>
</template>

<script setup lang="ts">
import { ChevronRight, CircleAlert, History } from '@lucide/vue';
import { computed, onMounted, reactive, ref } from 'vue';

import EmptyState from '@/components/common/EmptyState.vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import TablePager from '@/components/common/TablePager.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { STATUS_OPTIONS, statusLabel } from '@/domain/rules';
import { api } from '@/services/api';
import type { AnalystActivitySummary, MediaStatus, TrackedAnalyst, TrackedProcess } from '@/types';
import { formatDateTime } from '@/utils/format';

interface Filters { scope: 'active' | 'deleted'; search: string; fromDate: string; toDate: string; analystId: string; status: MediaStatus | 'all' }
const blankFilters = (): Filters => ({ scope: 'active', search: '', fromDate: '', toDate: '', analystId: 'all', status: 'all' });
const draft = reactive<Filters>(blankFilters());
const applied = ref<Filters>(blankFilters());
const analysts = ref<TrackedAnalyst[]>([]);
const summaries = ref<AnalystActivitySummary[]>([]);
const summaryError = ref('');
const visibleSummaries = computed(() => applied.value.analystId === 'all'
  ? summaries.value : summaries.value.filter((item) => item.id === applied.value.analystId));
const items = ref<TrackedProcess[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 25;
const loading = ref(false);
const error = ref('');
const filterError = ref('');
let requestVersion = 0;

function stageLabel(status: MediaStatus | null): string {
  return status ? statusLabel(status) : 'Status não registrado';
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return 'Sem registro';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days) return `${days} d${hours ? ` ${hours} h` : ''}`;
  if (hours) return `${hours} h`;
  return `${Math.floor(seconds / 60)} min`;
}

function secondsBetween(start: string, end: string): number {
  return Math.max(0, Math.floor((Date.parse(end) - Date.parse(start)) / 1000));
}

async function loadPage() {
  const version = ++requestVersion;
  loading.value = true;
  error.value = '';
  try {
    const list = applied.value.scope === 'deleted' ? api.listDeletedProcessTracking : api.listProcessTracking;
    const result = await list({
      search: applied.value.search.trim() || undefined,
      fromDate: applied.value.fromDate || undefined,
      toDate: applied.value.toDate || undefined,
      analystId: applied.value.analystId === 'all' ? undefined : applied.value.analystId,
      currentStatus: applied.value.status === 'all' ? undefined : applied.value.status,
      limit: pageSize,
      offset: (page.value - 1) * pageSize,
    });
    if (version !== requestVersion) return;
    items.value = result.items;
    total.value = result.total;
  } catch (cause) {
    if (version !== requestVersion) return;
    items.value = [];
    total.value = 0;
    error.value = cause instanceof Error ? cause.message : 'Não foi possível carregar a rastreabilidade.';
  } finally {
    if (version === requestVersion) loading.value = false;
  }
}

async function loadSummary() {
  summaryError.value = '';
  try {
    summaries.value = await api.listAnalystActivitySummary({
      fromDate: applied.value.fromDate || undefined,
      toDate: applied.value.toDate || undefined,
    });
  } catch (cause) {
    summaryError.value = cause instanceof Error ? cause.message : 'Não foi possível carregar a atuação dos analistas.';
  }
}

function applyFilters() {
  if (draft.fromDate && draft.toDate && draft.fromDate > draft.toDate) {
    filterError.value = 'A data inicial deve ser anterior ou igual à data final.';
    return;
  }
  filterError.value = '';
  applied.value = { ...draft };
  page.value = 1;
  void loadPage();
  void loadSummary();
}

function changePage(next: number) {
  page.value = next;
  void loadPage();
}

onMounted(() => {
  void loadPage();
  void loadSummary();
  void api.listTrackedAnalysts().then((result) => { analysts.value = result; }).catch(() => undefined);
});
</script>
