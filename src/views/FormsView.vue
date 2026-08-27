<template>
  <section class="view-stack">
    <div class="view-header">
      <div>
        <h2>Formulários</h2>
        <p>Cadastre requerimentos e gere automaticamente pontos no Mapa GIS e no Inventário.</p>
      </div>
      <div class="row-actions">
        <v-btn variant="tonal" prepend-icon="mdi-file-import-outline" @click="openFilePicker">
          Importar Formulário
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-form-select" @click="openCreate">
          Preencher Novo Formulário
        </v-btn>
        <input
          ref="fileInput"
          type="file"
          accept=".json,.csv,application/json,text/csv"
          class="d-none"
          @change="importFile"
        >
      </div>
    </div>

    <v-alert v-if="message" :type="messageType" variant="tonal" closable @click:close="message = ''">
      {{ message }}
    </v-alert>

    <v-card border class="pa-4">
      <v-text-field
        v-model="search"
        label="Buscar empresa, inscrição, endereço ou processo"
        prepend-inner-icon="mdi-magnify"
        hide-details
      />
    </v-card>

    <v-card border>
      <div class="table-wrap">
        <v-table hover>
          <thead>
            <tr>
              <th>Processo</th>
              <th>Empresa responsável</th>
              <th>Inscrição municipal</th>
              <th>Local</th>
              <th>Tipo de veículo</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th>Atualização</th>
              <th class="text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredForms.length === 0">
              <td colspan="9">
                <div class="empty-table">
                  <v-icon icon="mdi-file-document-outline" size="42" />
                  <span>Nenhum formulário encontrado.</span>
                </div>
              </td>
            </tr>
            <tr v-for="item in filteredForms" :key="item.id">
              <td class="mono strong">{{ item.process_code }}</td>
              <td>{{ item.company_responsible }}</td>
              <td class="mono">{{ item.municipal_registration }}</td>
              <td>{{ item.street }}, {{ item.number }} · {{ item.district }}</td>
              <td>{{ mediaTypeLabel(item.media_type) }}</td>
              <td class="mono">{{ formatDate(item.expiration_date) }}</td>
              <td>
                <v-chip :color="statusColor(item.status)" size="small" variant="tonal">
                  {{ statusLabel(item.status) }}
                </v-chip>
              </td>
              <td>{{ formatDateTime(item.updated_at) }}</td>
              <td>
                <div class="row-actions">
                  <v-btn
                    icon="mdi-map-marker-outline"
                    size="small"
                    variant="tonal"
                    title="Visualizar no mapa"
                    @click="viewOnMap(item)"
                  />
                  <v-btn
                    icon="mdi-pencil-outline"
                    size="small"
                    variant="tonal"
                    title="Editar formulário"
                    @click="openEdit(item)"
                  />
                  <v-btn
                    v-if="item.status === 'novos processos'"
                    icon="mdi-play-circle-outline"
                    size="small"
                    color="info"
                    variant="tonal"
                    title="Iniciar análise"
                    :loading="saving"
                    @click="startAnalysis(item)"
                  />
                  <v-btn
                    v-if="auth.canDelete"
                    icon="mdi-trash-can-outline"
                    size="small"
                    color="error"
                    variant="tonal"
                    title="Excluir formulário e ponto"
                    @click="deleteTarget = item"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </v-card>

    <v-dialog v-model="dialog" max-width="980" scrollable>
      <v-card>
        <v-card-title>{{ editingId ? 'Editar Formulário' : 'Novo Formulário' }}</v-card-title>
        <v-card-subtitle>
          Ao salvar, o processo será sincronizado automaticamente com o Mapa GIS e o Inventário.
        </v-card-subtitle>

        <v-card-text>
          <v-alert v-if="importedFileName" type="info" variant="tonal" density="compact" class="mb-4">
            Dados importados de {{ importedFileName }}. Revise os campos antes de salvar.
          </v-alert>

          <v-form v-model="formValid" class="form-grid" @submit.prevent="save">
            <v-text-field
              v-model="form.company_responsible"
              label="Empresa responsável"
              :rules="[required]"
              class="span-2"
            />
            <v-text-field
              v-model="form.municipal_registration"
              label="Inscrição municipal"
              :rules="[required]"
            />
            <v-text-field
              v-model="form.property_registration"
              label="Inscrição imobiliária"
              :rules="[required]"
            />

            <div class="span-2 form-section-title">
              <div>
                <strong>Coordenadas geográficas</strong>
                <span>Use a localização do dispositivo ou informe manualmente.</span>
              </div>
              <v-btn
                variant="tonal"
                color="primary"
                prepend-icon="mdi-crosshairs-gps"
                :loading="locating"
                @click="captureCoordinates"
              >
                Captar Coordenadas
              </v-btn>
            </div>
            <v-text-field
              v-model.number="form.latitude"
              label="Latitude"
              type="number"
              step="any"
              :rules="[coordinateRule(-20.65, -20.30, 'Latitude')]"
            />
            <v-text-field
              v-model.number="form.longitude"
              label="Longitude"
              type="number"
              step="any"
              :rules="[coordinateRule(-54.80, -54.40, 'Longitude')]"
            />

            <v-text-field v-model="form.street" label="Rua" :rules="[required]" />
            <v-text-field v-model="form.number" label="Número" :rules="[required]" />
            <v-select v-model="form.district" :items="DISTRICT_OPTIONS" label="Bairro" :rules="[required]" />
            <v-text-field v-model="form.postal_code" label="CEP" placeholder="00000-000" :rules="[postalCodeRule]" />

            <v-select
              v-model="form.media_type"
              :items="registrationMediaTypeOptions"
              label="Tipo de veículo"
              :rules="[required]"
              class="span-2"
            />
            <v-text-field
              v-model="form.number_of_faces"
              label="Quantidade de faces"
              hint="Opcional para cadastros internos"
              persistent-hint
            />
            <v-text-field
              v-model.number="form.area_m2"
              label="Área do veículo (m²)"
              type="number"
              min="0.01"
              :rules="[positive]"
            />
            <v-text-field
              v-model.number="form.bottom_height_m"
              label="Altura da borda inferior (m)"
              type="number"
              min="0"
              :rules="[nonNegative]"
            />
            <v-text-field
              v-model="form.expiration_date"
              label="Vencimento da autorização"
              type="date"
              hint="Opcional"
              persistent-hint
            />
            <v-alert color="primary" variant="tonal" density="compact" class="span-2">
              Raio calculado para o ponto: {{ calculatedRadius }}m
            </v-alert>

            <v-text-field
              v-model="form.requester_email"
              label="E-mail do requerente"
              type="email"
              :rules="[required, emailRule]"
              class="span-2"
            />

            <div v-if="uploadedAttachments.length" class="attachment-crud span-2">
              <div class="attachment-crud-header">
                <strong>Documentos enviados pelo formulário público</strong>
                <span>Os arquivos ficam em armazenamento privado e o acesso exige login.</span>
              </div>
              <div class="attachment-link-list">
                <div v-for="attachment in uploadedAttachments" :key="attachment.id" class="attachment-link-item">
                  <v-btn
                    variant="text"
                    prepend-icon="mdi-download-outline"
                    class="attachment-link-button"
                    @click="downloadUploadedAttachment(attachment)"
                  >
                    {{ attachmentCategoryLabel(attachment.category) }} · {{ attachment.original_filename }}
                  </v-btn>
                </div>
              </div>
            </div>

            <div class="attachment-crud span-2">
              <div class="attachment-crud-header">
                <strong>Links dos anexos</strong>
                <span>Adicione fotos, documentos, PDFs ou outros arquivos relacionados.</span>
              </div>
              <div class="attachment-crud-row">
                <v-text-field
                  v-model="attachmentDraft"
                  label="Adicionar link"
                  placeholder="https://..."
                  hide-details
                  @keydown.enter.prevent="addAttachment"
                />
                <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="addAttachment">
                  Adicionar
                </v-btn>
              </div>
              <div v-if="attachmentLinks.length" class="attachment-link-list">
                <div v-for="(link, index) in attachmentLinks" :key="`${link}-${index}`" class="attachment-link-item">
                  <v-btn
                    :href="link"
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="text"
                    prepend-icon="mdi-open-in-new"
                    class="attachment-link-button"
                  >
                    {{ link }}
                  </v-btn>
                  <v-btn icon="mdi-close" size="small" variant="text" color="error" @click="removeAttachment(index)" />
                </div>
              </div>
              <div v-else class="attachment-link-empty">Nenhum link adicionado.</div>
            </div>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="saving" :disabled="!formValid" @click="save">
            {{ editingId ? 'Salvar Alterações' : 'Criar Formulário e Ponto' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :model-value="Boolean(deleteTarget)" max-width="480" @update:model-value="!$event && (deleteTarget = null)">
      <v-card title="Excluir formulário">
        <v-card-text>
          Excluir o formulário de <strong>{{ deleteTarget?.company_responsible }}</strong> também removerá o processo
          <strong>{{ deleteTarget?.process_code }}</strong> do mapa e do inventário.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteTarget = null">Cancelar</v-btn>
          <v-btn color="error" :loading="saving" @click="confirmDelete">Excluir Formulário e Ponto</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { api } from '../services/api';
import {
  DISTRICT_OPTIONS,
  getRequiredRadius,
  mediaTypeLabel,
  mediaTypeOptionsFromRules,
  statusColor,
  statusLabel,
} from '../domain/rules';
import { useAuthStore } from '../stores/auth';
import { useMediaStore } from '../stores/media';
import type { ApplicationForm, ApplicationFormAttachment, ApplicationFormInput, MediaType } from '../types';
import { joinAttachmentLinks, normalizeAttachmentLink, parseAttachmentLinks } from '../utils/attachment-links';
import { formatDate, formatDateTime } from '../utils/format';

const router = useRouter();
const auth = useAuthStore();
const media = useMediaStore();
const forms = ref<ApplicationForm[]>([]);
const search = ref('');
const dialog = ref(false);
const editingId = ref<string | null>(null);
const deleteTarget = ref<ApplicationForm | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const importedFileName = ref('');
const formValid = ref(false);
const saving = ref(false);
const locating = ref(false);
const message = ref('');
const messageType = ref<'success' | 'error' | 'info'>('success');
const attachmentDraft = ref('');
const attachmentLinks = ref<string[]>([]);
const uploadedAttachments = ref<ApplicationFormAttachment[]>([]);
const form = reactive<ApplicationFormInput>(blankForm());

const required = (value: string) => Boolean(String(value ?? '').trim()) || 'Campo obrigatório.';
const positive = (value: number) => Number(value) > 0 || 'Informe um valor maior que zero.';
const nonNegative = (value: number) => Number(value) >= 0 || 'Informe um valor igual ou maior que zero.';
const emailRule = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'E-mail inválido.';
const postalCodeRule = (value: string) => /^\d{5}-?\d{3}$/.test(value) || 'Informe um CEP válido.';
const coordinateRule = (min: number, max: number, label: string) => (value: number) => (
  (Number(value) >= min && Number(value) <= max) || `${label} fora da área de Campo Grande.`
);

const registrationMediaTypeOptions = computed(() => mediaTypeOptionsFromRules(media.rules));
const calculatedRadius = computed(() => getRequiredRadius(form.media_type, Number(form.area_m2 || 0), media.rules));
const filteredForms = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('pt-BR');
  if (!term) return forms.value;
  return forms.value.filter((item) => [
    item.process_code,
    item.company_responsible,
    item.municipal_registration,
    item.property_registration,
    item.street,
    item.district,
  ].some((value) => value.toLocaleLowerCase('pt-BR').includes(term)));
});

onMounted(loadForms);

function blankForm(): ApplicationFormInput {
  return {
    company_responsible: '',
    municipal_registration: '',
    property_registration: '',
    latitude: -20.464,
    longitude: -54.612,
    street: '',
    number: '',
    district: 'Centro',
    postal_code: '',
    media_type: 'outdoor',
    area_m2: 1,
    bottom_height_m: 0,
    number_of_faces: null,
    expiration_date: null,
    requester_email: '',
    attachment_links: '',
  };
}

async function loadForms() {
  try {
    forms.value = await api.listApplicationForms();
  } catch (caught) {
    showMessage(caught instanceof Error ? caught.message : 'Falha ao carregar os formulários.', 'error');
  }
}

function openCreate() {
  editingId.value = null;
  importedFileName.value = '';
  Object.assign(form, blankForm());
  resetAttachments('');
  uploadedAttachments.value = [];
  dialog.value = true;
}

function openEdit(item: ApplicationForm) {
  editingId.value = item.id;
  importedFileName.value = '';
  Object.assign(form, {
    company_responsible: item.company_responsible,
    municipal_registration: item.municipal_registration,
    property_registration: item.property_registration,
    latitude: item.latitude,
    longitude: item.longitude,
    street: item.street,
    number: item.number,
    district: item.district,
    postal_code: item.postal_code,
    media_type: item.media_type,
    area_m2: item.area_m2,
    bottom_height_m: item.bottom_height_m,
    number_of_faces: item.number_of_faces ?? null,
    expiration_date: item.expiration_date ?? null,
    requester_email: item.requester_email,
    attachment_links: item.attachment_links ?? '',
  });
  resetAttachments(item.attachment_links);
  uploadedAttachments.value = item.attachments ?? [];
  dialog.value = true;
}

function captureCoordinates() {
  if (!navigator.geolocation) {
    showMessage('Este navegador não oferece captura de localização.', 'error');
    return;
  }
  locating.value = true;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      form.latitude = Number(position.coords.latitude.toFixed(6));
      form.longitude = Number(position.coords.longitude.toFixed(6));
      locating.value = false;
      showMessage('Coordenadas captadas com sucesso.', 'success');
    },
    (error) => {
      locating.value = false;
      showMessage(`Não foi possível captar as coordenadas: ${error.message}`, 'error');
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
  );
}

function resetAttachments(value: string | null | undefined) {
  attachmentLinks.value = parseAttachmentLinks(value);
  attachmentDraft.value = '';
}

function addAttachment() {
  const link = normalizeAttachmentLink(attachmentDraft.value);
  if (!link) return;
  if (!attachmentLinks.value.includes(link)) attachmentLinks.value = [...attachmentLinks.value, link];
  attachmentDraft.value = '';
}

function removeAttachment(index: number) {
  attachmentLinks.value = attachmentLinks.value.filter((_, currentIndex) => currentIndex !== index);
}

const attachmentCategoryLabels: Record<string, string> = {
  alvaraLocalizacao: 'Alvará de localização',
  requerimentoPadrao: 'Requerimento padrão',
  autorizacaoProprietario: 'Autorização do proprietário',
  documentoProprietario: 'Documento do proprietário',
  projetoEstrutural: 'Projeto estrutural',
  projetoImplantacao: 'Projeto de implantação',
  artRrt: 'ART/RRT',
};

function attachmentCategoryLabel(category: string): string {
  return attachmentCategoryLabels[category] ?? category;
}

async function downloadUploadedAttachment(attachment: ApplicationFormAttachment) {
  if (!editingId.value) return;
  try {
    const { url } = await api.getApplicationFormAttachmentDownload(editingId.value, attachment.id);
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (opened) opened.opener = null;
  } catch (caught) {
    showMessage(caught instanceof Error ? caught.message : 'Falha ao abrir o anexo.', 'error');
  }
}

function sanitizeForm(): ApplicationFormInput {
  return {
    ...form,
    company_responsible: form.company_responsible.trim(),
    municipal_registration: form.municipal_registration.trim(),
    property_registration: form.property_registration.trim(),
    street: form.street.trim(),
    number: form.number.trim(),
    postal_code: form.postal_code.trim(),
    requester_email: form.requester_email.trim(),
    area_m2: Number(form.area_m2),
    bottom_height_m: Number(form.bottom_height_m),
    number_of_faces: form.number_of_faces?.trim() || null,
    expiration_date: form.expiration_date || null,
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    attachment_links: joinAttachmentLinks(attachmentLinks.value) || null,
  };
}

async function save() {
  if (!formValid.value) return;
  saving.value = true;
  try {
    if (editingId.value) {
      await api.updateApplicationForm(editingId.value, sanitizeForm());
      showMessage('Formulário e ponto atualizados com sucesso.', 'success');
    } else {
      const created = await api.createApplicationForm(sanitizeForm());
      showMessage(`Formulário salvo e processo ${created.process_code} adicionado ao sistema.`, 'success');
    }
    await Promise.all([loadForms(), media.loadAll()]);
    dialog.value = false;
  } catch (caught) {
    showMessage(caught instanceof Error ? caught.message : 'Falha ao salvar o formulário.', 'error');
  } finally {
    saving.value = false;
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  saving.value = true;
  try {
    await api.deleteApplicationForm(deleteTarget.value.id);
    deleteTarget.value = null;
    await Promise.all([loadForms(), media.loadAll()]);
    showMessage('Formulário e ponto removidos do sistema.', 'success');
  } catch (caught) {
    showMessage(caught instanceof Error ? caught.message : 'Falha ao excluir o formulário.', 'error');
  } finally {
    saving.value = false;
  }
}

async function startAnalysis(item: ApplicationForm) {
  saving.value = true;
  try {
    await media.startAnalysis(item.asset_id);
    await loadForms();
    showMessage(`Análise do processo ${item.process_code} iniciada.`, 'success');
  } catch (caught) {
    showMessage(caught instanceof Error ? caught.message : 'Falha ao iniciar a análise.', 'error');
  } finally {
    saving.value = false;
  }
}

function viewOnMap(item: ApplicationForm) {
  media.selectAsset(item.asset_id);
  void router.push({ name: 'map', query: { asset: item.asset_id } });
}

function openFilePicker() {
  fileInput.value?.click();
}

async function importFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    const text = await file.text();
    const record = file.name.toLocaleLowerCase().endsWith('.csv') ? parseCsv(text) : JSON.parse(text);
    const source = Array.isArray(record) ? record[0] : record;
    if (!source || typeof source !== 'object') throw new Error('O arquivo não contém um formulário válido.');
    const imported = normalizeImportedRecord(source as Record<string, unknown>);
    editingId.value = null;
    Object.assign(form, blankForm(), imported);
    resetAttachments(imported.attachment_links);
    importedFileName.value = file.name;
    dialog.value = true;
  } catch (caught) {
    showMessage(caught instanceof Error ? caught.message : 'Não foi possível importar o arquivo.', 'error');
  }
}

function parseCsv(text: string): Record<string, string> {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error('O CSV deve conter cabeçalho e pelo menos uma linha de dados.');
  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = splitCsvLine(lines[0], delimiter);
  const values = splitCsvLine(lines[1], delimiter);
  return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  values.push(current.trim());
  return values;
}

function normalizeImportedRecord(source: Record<string, unknown>): Partial<ApplicationFormInput> {
  const normalized = Object.fromEntries(Object.entries(source).map(([key, value]) => [normalizeKey(key), value]));
  const value = (...keys: string[]) => keys.map((key) => normalized[key]).find((item) => item != null && item !== '');
  const coordinateText = String(value('coordenadas_geograficas', 'coordenadas') ?? '');
  const coordinates = coordinateText.split(/[,;\s]+/).map(Number).filter(Number.isFinite);
  const rawMediaType = String(value('media_type', 'tipo_de_veiculo', 'tipo_veiculo', 'tipo') ?? '');
  const mediaType = resolveMediaType(rawMediaType);
  const rawLinks = value('attachment_links', 'links_dos_anexos', 'links_anexos', 'anexos');
  const links = Array.isArray(rawLinks) ? rawLinks.join('\n') : String(rawLinks ?? '');
  const expirationDate = normalizeImportedDate(value('expiration_date', 'vencimento', 'data_de_vencimento'));

  return {
    company_responsible: String(value('company_responsible', 'empresa_responsavel', 'empresa') ?? ''),
    municipal_registration: String(value('municipal_registration', 'inscricao_municipal') ?? ''),
    property_registration: String(value('property_registration', 'inscricao_imobiliaria') ?? ''),
    latitude: Number(value('latitude') ?? coordinates[0] ?? -20.464),
    longitude: Number(value('longitude') ?? coordinates[1] ?? -54.612),
    street: String(value('street', 'rua', 'logradouro') ?? ''),
    number: String(value('number', 'numero') ?? ''),
    district: String(value('district', 'bairro') ?? 'Centro'),
    postal_code: String(value('postal_code', 'cep') ?? ''),
    media_type: mediaType,
    area_m2: Number(value('area_m2', 'area', 'area_do_veiculo') ?? 1),
    bottom_height_m: Number(value('bottom_height_m', 'altura', 'altura_da_borda_inferior') ?? 0),
    expiration_date: expirationDate,
    requester_email: String(value('requester_email', 'email_do_requerente', 'email') ?? ''),
    attachment_links: links,
  };
}

function normalizeImportedDate(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const brazilianDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (brazilianDate) return `${brazilianDate[3]}-${brazilianDate[2]}-${brazilianDate[1]}`;
  return raw.slice(0, 10);
}

function resolveMediaType(value: string): MediaType {
  const normalized = normalizeKey(value);
  const option = registrationMediaTypeOptions.value.find((item) => (
    normalizeKey(item.value) === normalized || normalizeKey(item.title) === normalized
  ));
  return option?.value ?? 'outdoor';
}

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function showMessage(text: string, type: 'success' | 'error' | 'info') {
  message.value = text;
  messageType.value = type;
}
</script>

<style scoped>
.form-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 0;
}

.form-section-title div {
  display: grid;
  gap: 2px;
}

.form-section-title span {
  color: var(--gm-muted);
  font-size: 0.82rem;
}

@media (max-width: 700px) {
  .form-section-title {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
