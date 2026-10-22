<template>
  <section>
    <PageHeader
      title="Comunicados de exigência"
      description="Respostas enviadas pelo formulário público, com comprovante e documentos anexados."
    >
      <template #actions>
        <Button variant="outline" :disabled="loading" @click="loadResponses">
          <RefreshCw :class="loading && 'animate-spin'" />
          Atualizar
        </Button>
      </template>
    </PageHeader>

    <Alert v-if="error && !selected" variant="destructive" class="mb-4">
      <CircleAlert />
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <div class="overflow-hidden rounded-lg border bg-card">
      <form class="flex flex-wrap gap-2 border-b p-4" role="search" @submit.prevent="applySearch">
        <SearchInput
          v-model="search"
          class="min-w-64 flex-1"
          placeholder="Protocolo, processo, comunicado ou e-mail"
          label="Buscar respostas"
        />
        <Button type="submit" variant="secondary" :disabled="loading">Buscar</Button>
      </form>

      <EmptyState
        v-if="!loading && page.items.length === 0"
        :icon="FileWarning"
        :title="appliedSearch ? 'Nenhuma resposta encontrada' : 'Nenhuma resposta recebida ainda'"
        :description="appliedSearch ? 'Confira o número digitado ou busque por outro termo.' : 'As respostas enviadas pelo formulário público aparecem aqui.'"
      />
      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead>Protocolo</TableHead>
            <TableHead>Processo</TableHead>
            <TableHead>Comunicado</TableHead>
            <TableHead class="hidden lg:table-cell">E-mail do requerente</TableHead>
            <TableHead>Recebido em</TableHead>
            <TableHead class="text-right">Anexos</TableHead>
            <TableHead class="w-px"><span class="sr-only">Ações</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="item in page.items" :key="item.id" class="cursor-pointer" @click="select(item)">
            <TableCell class="font-medium whitespace-nowrap">{{ item.protocol }}</TableCell>
            <TableCell class="whitespace-nowrap">{{ item.process_number }}</TableCell>
            <TableCell class="whitespace-nowrap">{{ item.notice_number }}</TableCell>
            <TableCell class="hidden text-muted-foreground lg:table-cell">{{ item.requester_email }}</TableCell>
            <TableCell class="whitespace-nowrap">{{ formatDateTime(item.finalized_at) }}</TableCell>
            <TableCell class="tabular text-right">{{ item.attachments.length }}</TableCell>
            <TableCell>
              <Button variant="outline" size="sm" @click.stop="select(item)">Abrir</Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <TablePager
        v-if="page.total > 0"
        :offset="page.offset"
        :limit="page.limit"
        :total="page.total"
        :count="page.items.length"
        :loading="loading"
        @change="changePage"
      />
    </div>

    <Dialog :open="Boolean(selected)" @update:open="(open) => { if (!open) selected = null; }">
      <DialogScrollContent v-if="selected" class="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Resposta {{ selected.protocol }}</DialogTitle>
          <DialogDescription>Recebida em {{ formatDateTime(selected.finalized_at) }}</DialogDescription>
        </DialogHeader>

        <Alert v-if="error" variant="destructive">
          <CircleAlert />
          <AlertDescription>{{ error }}</AlertDescription>
        </Alert>

        <dl class="grid gap-x-6 gap-y-4 rounded-md bg-muted/60 p-4 sm:grid-cols-2">
          <div>
            <dt class="text-sm text-muted-foreground">Número do processo</dt>
            <dd class="font-medium">{{ selected.process_number }}</dd>
          </div>
          <div>
            <dt class="text-sm text-muted-foreground">Número do comunicado</dt>
            <dd class="font-medium">{{ selected.notice_number }}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-sm text-muted-foreground">E-mail do requerente</dt>
            <dd class="font-medium break-all">{{ selected.requester_email }}</dd>
          </div>
        </dl>

        <div>
          <h3 class="font-semibold">Documentos anexados</h3>
          <ul class="mt-2 divide-y rounded-md border">
            <li v-for="attachment in selected.attachments" :key="attachment.index" class="flex items-center gap-3 px-4 py-3">
              <Paperclip class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div class="min-w-0 flex-1">
                <p class="truncate" :title="attachment.filename">{{ attachment.filename }}</p>
                <p class="text-sm text-muted-foreground">{{ formatSize(attachment.size_bytes) }}</p>
              </div>
              <Button variant="ghost" size="sm" :aria-label="`Baixar ${attachment.filename}`" @click="openAttachment(selected, attachment.index)">
                <Download />
                Baixar
              </Button>
            </li>
          </ul>
        </div>

        <DialogFooter class="sm:justify-between">
          <Button variant="outline" :disabled="downloadingPdf" @click="downloadReceipt(selected)">
            <LoaderCircle v-if="downloadingPdf" class="animate-spin" />
            <FileText v-else />
            Baixar comprovante PDF
          </Button>
          <Button variant="secondary" @click="selected = null">Fechar</Button>
        </DialogFooter>
      </DialogScrollContent>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { CircleAlert, Download, FileText, FileWarning, LoaderCircle, Paperclip, RefreshCw } from '@lucide/vue';
import { onMounted, onUnmounted, ref } from 'vue';

import EmptyState from '@/components/common/EmptyState.vue';
import SearchInput from '@/components/common/SearchInput.vue';
import TablePager from '@/components/common/TablePager.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { api } from '../services/api';
import type { Page, RequirementResponse } from '../types';
import { formatDateTime } from '../utils/format';

const search = ref('');
const appliedSearch = ref('');
const loading = ref(false);
const downloadingPdf = ref(false);
const error = ref('');
const selected = ref<RequirementResponse | null>(null);
const page = ref<Page<RequirementResponse>>({ items: [], total: 0, limit: 50, offset: 0 });

onMounted(() => {
  window.addEventListener('geomidia:requirements-refresh', loadResponses);
  void loadResponses();
});
onUnmounted(() => window.removeEventListener('geomidia:requirements-refresh', loadResponses));

async function loadResponses() {
  loading.value = true;
  error.value = '';
  try {
    page.value = await api.listRequirementResponses(appliedSearch.value, page.value.limit, page.value.offset);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Não foi possível carregar os comunicados de exigência.';
  } finally {
    loading.value = false;
  }
}

function applySearch() {
  appliedSearch.value = search.value.trim();
  page.value.offset = 0;
  void loadResponses();
}

function changePage(direction: number) {
  page.value.offset = Math.max(0, page.value.offset + direction * page.value.limit);
  void loadResponses();
}

function select(item: RequirementResponse) {
  error.value = '';
  selected.value = item;
}

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

async function openAttachment(item: RequirementResponse, index: number) {
  const opened = window.open('about:blank', '_blank');
  if (!opened) {
    error.value = 'Permita abrir novas abas para baixar o anexo.';
    return;
  }
  opened.opener = null;
  try {
    const { url } = await api.getRequirementAttachmentDownload(item.id, index);
    opened.location.replace(url);
  } catch (caught) {
    opened.close();
    error.value = caught instanceof Error ? caught.message : 'Não foi possível baixar o anexo.';
  }
}

async function downloadReceipt(item: RequirementResponse) {
  downloadingPdf.value = true;
  error.value = '';
  try {
    const blob = await api.getRequirementReceipt(item.id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${item.protocol}.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Não foi possível baixar o comprovante.';
  } finally {
    downloadingPdf.value = false;
  }
}
</script>
