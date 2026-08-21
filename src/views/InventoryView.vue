<template>
  <section class="view-stack">
    <div class="view-header">
      <div>
        <h2>Inventário de Ativos de Mídia</h2>
        <p>Cadastre, revise e localize veículos de comunicação exterior.</p>
      </div>
      <v-btn v-if="auth.canWrite" color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
        Novo Cadastro
      </v-btn>
    </div>

    <v-card border class="pa-4">
      <v-row dense>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="search"
            label="Buscar endereço, bairro ou processo"
            prepend-inner-icon="mdi-magnify"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="typeFilter"
            :items="typeFilterOptions"
            label="Tipo"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="statusFilter"
            :items="statusFilterOptions"
            label="Status"
            hide-details
          />
        </v-col>
      </v-row>
    </v-card>

    <v-card border>
      <div class="table-wrap">
        <v-table hover>
          <thead>
            <tr>
              <th>Processo</th>
              <th>Endereço</th>
              <th>Bairro</th>
              <th>Tipo</th>
              <th class="text-center">Raio</th>
              <th>Coordenadas</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th class="text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredAssets.length === 0">
              <td colspan="9">
                <div class="empty-table">
                  <v-icon icon="mdi-database-search-outline" size="42" />
                  <span>Nenhum ativo encontrado.</span>
                </div>
              </td>
            </tr>
            <tr v-for="asset in filteredAssets" :key="asset.id">
              <td class="mono strong">{{ asset.process_code }}</td>
              <td class="address-cell">{{ asset.address }}</td>
              <td>{{ asset.district }}</td>
              <td class="type-cell">{{ mediaTypeLabel(asset.media_type) }}</td>
              <td class="text-center mono">{{ asset.radius_meters }}m</td>
              <td class="mono muted">
                {{ formatCoordinate(asset.latitude) }}, {{ formatCoordinate(asset.longitude) }}
              </td>
              <td class="mono">{{ formatDate(asset.expiration_date) }}</td>
              <td>
                <v-chip :color="statusColor(asset.status)" size="small" variant="tonal">
                  {{ statusLabel(asset.status) }}
                </v-chip>
              </td>
              <td>
                <div class="row-actions">
                  <v-btn
                    v-if="auth.canWrite"
                    icon="mdi-eye-outline"
                    size="small"
                    variant="tonal"
                    title="Visualizar no mapa"
                    @click="$emit('view-map', asset.id)"
                  />
                  <v-btn
                    v-if="auth.canWrite && asset.status === 'novos processos'"
                    icon="mdi-play-circle-outline"
                    size="small"
                    color="info"
                    variant="tonal"
                    title="Iniciar análise"
                    :loading="media.saving"
                    @click="startAnalysis(asset)"
                  />
                  <v-btn
                    v-if="auth.canDelete"
                    icon="mdi-pencil-outline"
                    size="small"
                    variant="tonal"
                    title="Editar ativo"
                    @click="openEditDialog(asset)"
                  />
                  <v-btn
                    icon="mdi-trash-can-outline"
                    size="small"
                    color="error"
                    variant="tonal"
                    title="Excluir ativo"
                    @click="deleteTarget = asset"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
      <div class="table-footer">
        <span>Total cadastrado: {{ media.assetTotal }}</span>
        <span>Exibindo {{ filteredAssets.length }} de {{ media.assetTotal }}</span>
      </div>
    </v-card>

    <v-dialog v-model="dialog" max-width="860" scrollable>
      <v-card>
        <v-card-title>
          {{ editingId ? 'Editar Cadastro' : 'Novo Cadastro de Veículo' }}
        </v-card-title>
        <v-card-subtitle>
          Raio calculado: {{ calculatedRadius }}m
        </v-card-subtitle>

        <v-card-text>
          <v-form v-model="formValid" class="form-grid" @submit.prevent="save">
            <v-select
              v-model="form.media_type"
              :items="registrationMediaTypeOptions"
              label="Tipo de veículo"
            />
            <v-select
              v-model="form.district"
              :items="DISTRICT_OPTIONS"
              label="Bairro"
            />
            <v-text-field
              v-model="form.address"
              label="Endereço completo"
              :rules="[required, minLength(3)]"
              class="span-2"
            />
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
            <v-text-field
              v-model.number="form.area_m2"
              label="Área total (m²)"
              type="number"
              min="0.01"
              :rules="[positive]"
            />
            <v-text-field
              v-model.number="form.width_m"
              label="Largura (m)"
              type="number"
              min="0"
              :rules="[nonNegative]"
            />
            <v-text-field
              v-model.number="form.bottom_height_m"
              label="Borda inferior (m)"
              type="number"
            />
            <v-text-field
              v-model.number="form.top_height_m"
              label="Borda superior (m)"
              type="number"
            />
            <v-text-field
              v-model="form.expiration_date"
              label="Vencimento da autorização"
              type="date"
              hint="Opcional"
              persistent-hint
            />
            <v-text-field
              v-model="form.contact_name"
              label="Contato do solicitante"
            />
            <v-text-field
              v-model="form.contact_email"
              label="E-mail do solicitante"
              type="email"
            />
            <v-text-field
              v-if="!editingId || form.status === 'novos processos'"
              model-value="Novos Processos"
              label="Status"
              hint="Use a ação Iniciar análise para liberar as demais situações."
              persistent-hint
              readonly
            />
            <v-select
              v-else
              v-model="form.status"
              :items="DECISION_STATUS_OPTIONS"
              label="Status"
            />
            <v-textarea
              v-model="form.justification"
              label="Justificativa jurídica ou territorial"
              rows="3"
              class="span-2"
            />
            <div class="attachment-crud span-2">
              <div class="attachment-crud-header">
                <strong>Links de anexos</strong>
                <span>Fotos, PDFs e arquivos relacionados</span>
              </div>
              <div class="attachment-crud-row">
                <v-text-field
                  v-model="attachmentLinkDraft"
                  label="Adicionar link"
                  placeholder="https://..."
                  hide-details
                  @keydown.enter.prevent="addAttachmentLink"
                />
                <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="addAttachmentLink">
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
                    density="comfortable"
                    prepend-icon="mdi-open-in-new"
                    class="attachment-link-button"
                  >
                    {{ link }}
                  </v-btn>
                  <v-btn
                    icon="mdi-close"
                    size="small"
                    variant="text"
                    color="error"
                    title="Remover link"
                    @click="removeAttachmentLink(index)"
                  />
                </div>
              </div>
              <div v-else class="attachment-link-empty">Nenhum link adicionado ainda.</div>
            </div>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="media.saving" :disabled="!formValid" @click="save">Salvar Cadastro</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="440">
      <v-card title="Confirmar exclusão">
        <v-card-text>
          Remover permanentemente o processo
          <strong>{{ deleteTarget?.process_code }}</strong> do inventário?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteTarget = null">Cancelar</v-btn>
          <v-btn color="error" :loading="media.saving" @click="confirmDelete">Excluir</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

import {
  DECISION_STATUS_OPTIONS,
  DISTRICT_OPTIONS,
  MEDIA_TYPE_OPTIONS,
  STATUS_OPTIONS,
  getRequiredRadius,
  mediaTypeOptionsFromRules,
  mediaTypeLabel,
  statusLabel,
  statusColor,
} from '../domain/rules';
import { useMediaStore } from '../stores/media';
import { useAuthStore } from '../stores/auth';
import type { MediaAsset, MediaAssetInput, MediaStatus, MediaType } from '../types';
import { formatCoordinate, formatDate } from '../utils/format';
import { joinAttachmentLinks, normalizeAttachmentLink, parseAttachmentLinks } from '../utils/attachment-links';

defineEmits<{ 'view-map': [id: string] }>();

const media = useMediaStore();
const auth = useAuthStore();
const search = ref('');
const typeFilter = ref<MediaType | 'all'>('all');
const statusFilter = ref<MediaStatus | 'all'>('all');
const dialog = ref(false);
const editingId = ref<string | null>(null);
const deleteTarget = ref<MediaAsset | null>(null);
const formValid = ref(false);
const attachmentLinkDraft = ref('');
const attachmentLinks = ref<string[]>([]);
const required = (value: string) => Boolean(value?.trim()) || 'Campo obrigatório.';
const minLength = (length: number) => (value: string) => value.trim().length >= length || `Mínimo de ${length} caracteres.`;
const positive = (value: number) => Number(value) > 0 || 'Informe um valor maior que zero.';
const nonNegative = (value: number) => Number(value) >= 0 || 'Informe um valor igual ou maior que zero.';
const coordinateRule = (min: number, max: number, label: string) => (value: number) => (
  (Number(value) >= min && Number(value) <= max) || `${label} fora da área de Campo Grande.`
);

const typeFilterOptions = computed(() => [
  { title: 'Todos os tipos', value: 'all' },
  ...MEDIA_TYPE_OPTIONS,
]);

const registrationMediaTypeOptions = computed(() => mediaTypeOptionsFromRules(media.rules));

const statusFilterOptions = computed(() => [
  { title: 'Todos os status', value: 'all' },
  ...STATUS_OPTIONS,
]);

const form = reactive<MediaAssetInput>(blankForm());

const deleteDialog = computed({
  get: () => Boolean(deleteTarget.value),
  set: (value: boolean) => {
    if (!value) deleteTarget.value = null;
  },
});

const calculatedRadius = computed(() => getRequiredRadius(form.media_type, Number(form.area_m2 || 0), media.rules));

const filteredAssets = computed(() => {
  const term = search.value.trim().toLowerCase();
  return media.assets.filter((asset) => {
    const matchesSearch =
      !term ||
      asset.address.toLowerCase().includes(term) ||
      asset.district.toLowerCase().includes(term) ||
      asset.process_code.toLowerCase().includes(term);

    const matchesType = typeFilter.value === 'all' || asset.media_type === typeFilter.value;
    const matchesStatus = statusFilter.value === 'all' || asset.status === statusFilter.value;

    return matchesSearch && matchesType && matchesStatus;
  });
});

function blankForm(): MediaAssetInput {
  return {
    media_type: 'outdoor',
    address: '',
    district: 'Centro',
    latitude: -20.464,
    longitude: -54.612,
    area_m2: 27,
    width_m: 9,
    bottom_height_m: 5,
    top_height_m: null,
    expiration_date: null,
    status: 'novos processos',
    justification: '',
    attachment_links: '',
    contact_name: '',
    contact_email: '',
  };
}

function resetAttachmentLinks(value: string | null | undefined = '') {
  attachmentLinks.value = parseAttachmentLinks(value);
  attachmentLinkDraft.value = '';
}

function addAttachmentLink() {
  const link = normalizeAttachmentLink(attachmentLinkDraft.value);
  if (!link) return;
  if (!attachmentLinks.value.includes(link)) {
    attachmentLinks.value = [...attachmentLinks.value, link];
  }
  attachmentLinkDraft.value = '';
}

function removeAttachmentLink(index: number) {
  attachmentLinks.value = attachmentLinks.value.filter((_, currentIndex) => currentIndex !== index);
}

function sanitizeForm(): MediaAssetInput {
  return {
    ...form,
    width_m: form.width_m || null,
    top_height_m: form.top_height_m || null,
    expiration_date: form.expiration_date || null,
    justification: form.justification || null,
    attachment_links: joinAttachmentLinks(attachmentLinks.value) || null,
    contact_name: form.contact_name || null,
    contact_email: form.contact_email || null,
  };
}

function openCreateDialog() {
  editingId.value = null;
  Object.assign(form, blankForm());
  resetAttachmentLinks('');
  dialog.value = true;
}

function openEditDialog(asset: MediaAsset) {
  editingId.value = asset.id;
  Object.assign(form, {
    media_type: asset.media_type,
    address: asset.address,
    district: asset.district,
    latitude: asset.latitude,
    longitude: asset.longitude,
    area_m2: asset.area_m2,
    width_m: asset.width_m ?? null,
    bottom_height_m: asset.bottom_height_m,
    top_height_m: asset.top_height_m ?? null,
    expiration_date: asset.expiration_date ?? null,
    status: asset.status,
    justification: asset.justification ?? '',
    attachment_links: asset.attachment_links ?? '',
    contact_name: asset.contact_name ?? '',
    contact_email: asset.contact_email ?? '',
  });
  resetAttachmentLinks(asset.attachment_links);
  dialog.value = true;
}

async function save() {
  if (!formValid.value || !form.address.trim()) return;

  try {
    if (editingId.value) {
      await media.updateAsset(editingId.value, sanitizeForm());
    } else {
      await media.createAsset(sanitizeForm());
    }
    dialog.value = false;
  } catch {
    // O store publica o erro no alerta global.
  }
}

async function startAnalysis(asset: MediaAsset) {
  try {
    await media.startAnalysis(asset.id);
  } catch {
    // O store publica o erro no alerta global.
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  try {
    await media.deleteAsset(deleteTarget.value.id);
    deleteTarget.value = null;
  } catch {
    // O store publica o erro no alerta global.
  }
}
</script>
