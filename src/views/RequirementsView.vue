<template>
  <section class="view-stack">
    <div class="view-header">
      <div>
        <h2>Comunicado de Exigência</h2>
        <p>Respostas recebidas pelo formulário público, com comprovantes e documentos anexados.</p>
      </div>
      <v-btn variant="tonal" prepend-icon="mdi-refresh" :loading="loading" @click="loadResponses">Atualizar</v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = ''">
      {{ error }}
    </v-alert>

    <v-card border class="pa-4 mb-4">
      <div class="d-flex ga-3 align-center flex-wrap">
        <v-text-field
          v-model="search"
          label="Buscar protocolo, processo, comunicado ou e-mail"
          prepend-inner-icon="mdi-magnify"
          hide-details
          class="flex-grow-1"
          @keyup.enter="applySearch"
        />
        <v-btn color="primary" :loading="loading" @click="applySearch">Buscar</v-btn>
      </div>
    </v-card>

    <v-card border>
      <div class="table-wrap">
        <v-table hover>
          <thead>
            <tr>
              <th>Protocolo</th>
              <th>Processo</th>
              <th>Comunicado</th>
              <th>E-mail do requerente</th>
              <th>Recebido em</th>
              <th>Anexos</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && page.items.length === 0">
              <td colspan="7">
                <div class="empty-table">
                  <v-icon icon="mdi-file-document-alert-outline" size="42" />
                  <span>Nenhuma resposta de comunicado de exigência encontrada.</span>
                </div>
              </td>
            </tr>
            <tr v-for="item in page.items" :key="item.id">
              <td class="process-code">{{ item.protocol }}</td>
              <td class="process-code">{{ item.process_number }}</td>
              <td class="process-code">{{ item.notice_number }}</td>
              <td>{{ item.requester_email }}</td>
              <td>{{ formatDateTime(item.finalized_at) }}</td>
              <td>{{ item.attachments.length }}</td>
              <td>
                <v-btn size="small" variant="tonal" prepend-icon="mdi-eye-outline" @click="selected = item">
                  Ver resposta
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
      <v-card-actions v-if="page.total > 0" class="justify-end">
        <span class="text-body-2 mr-3">{{ page.offset + 1 }}–{{ Math.min(page.offset + page.items.length, page.total) }} de {{ page.total }}</span>
        <v-btn icon="mdi-chevron-left" size="small" variant="text" :disabled="page.offset === 0 || loading" title="Página anterior" @click="changePage(-1)" />
        <v-btn icon="mdi-chevron-right" size="small" variant="text" :disabled="page.offset + page.limit >= page.total || loading" title="Próxima página" @click="changePage(1)" />
      </v-card-actions>
    </v-card>

    <v-dialog :model-value="Boolean(selected)" max-width="760" scrollable @update:model-value="(open) => { if (!open) selected = null; }">
      <v-card v-if="selected">
        <v-card-title>Resposta <span class="process-code">{{ selected.protocol }}</span></v-card-title>
        <v-card-text>
          <div class="mb-2"><strong>Número do processo:</strong> <span class="process-code">{{ selected.process_number }}</span></div>
          <div class="mb-2"><strong>Número do comunicado:</strong> <span class="process-code">{{ selected.notice_number }}</span></div>
          <div class="mb-2"><strong>E-mail do requerente:</strong> {{ selected.requester_email }}</div>
          <div class="mb-2"><strong>Recebido em:</strong> {{ formatDateTime(selected.finalized_at) }}</div>
          <strong>Documentos anexados</strong>
          <v-list density="compact" class="mt-2">
            <v-list-item v-for="attachment in selected.attachments" :key="attachment.index">
              <template #prepend><v-icon icon="mdi-paperclip" /></template>
              <v-list-item-title>{{ attachment.filename }}</v-list-item-title>
              <v-list-item-subtitle>{{ formatSize(attachment.size_bytes) }}</v-list-item-subtitle>
              <template #append>
                <v-btn size="small" variant="text" prepend-icon="mdi-download-outline" @click="openAttachment(selected, attachment.index)">Baixar</v-btn>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="tonal" prepend-icon="mdi-file-pdf-box" :loading="downloadingPdf" @click="downloadReceipt(selected)">Baixar comprovante PDF</v-btn>
          <v-spacer />
          <v-btn variant="text" @click="selected = null">Fechar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

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

onMounted(() => { void loadResponses(); });

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
