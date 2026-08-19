<template>
  <section class="view-stack">
    <div class="view-header">
      <div>
        <h2>Regras de negócio</h2>
        <p>Gerencie os raios aplicados a cada tipo de veículo de comunicação.</p>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        :disabled="availableMediaTypes.length === 0"
        @click="openCreate"
      >
        Nova regra
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

    <v-alert type="info" variant="tonal" density="compact">
      Ao salvar uma alteração de raio, todos os veículos já cadastrados daquele tipo são recalculados automaticamente.
    </v-alert>

    <v-card border>
      <div class="table-wrap">
        <v-table hover>
          <thead>
            <tr>
              <th>Veículo</th>
              <th>Raio padrão</th>
              <th>Regra por área</th>
              <th>Status</th>
              <th>Descrição</th>
              <th class="text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="rules.length === 0">
              <td colspan="6">
                <div class="empty-table">
                  <v-icon icon="mdi-tune-variant" size="42" />
                  <span>Nenhuma regra cadastrada.</span>
                </div>
              </td>
            </tr>
            <tr v-for="rule in rules" :key="rule.id">
              <td>
                <strong>{{ rule.name }}</strong>
                <div class="muted">{{ mediaTypeLabel(rule.media_type) }}</div>
              </td>
              <td class="mono strong">{{ rule.base_radius_meters }}m</td>
              <td>
                <span v-if="rule.area_threshold_m2 != null && rule.radius_above_threshold_meters != null">
                  Acima de {{ rule.area_threshold_m2 }}m²: <strong>{{ rule.radius_above_threshold_meters }}m</strong>
                </span>
                <span v-else class="muted">Não se aplica</span>
              </td>
              <td>
                <v-chip :color="rule.is_active ? 'success' : 'error'" size="small" variant="tonal">
                  {{ rule.is_active ? 'Ativa' : 'Inativa' }}
                </v-chip>
              </td>
              <td class="rule-description">{{ rule.description || '—' }}</td>
              <td>
                <div class="row-actions">
                  <v-btn
                    icon="mdi-pencil-outline"
                    size="small"
                    variant="tonal"
                    title="Editar regra"
                    @click="openEdit(rule)"
                  />
                  <v-btn
                    icon="mdi-trash-can-outline"
                    size="small"
                    color="error"
                    variant="tonal"
                    title="Excluir regra"
                    @click="deleteTarget = rule"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </v-card>

    <v-dialog v-model="dialog" max-width="720" scrollable>
      <v-card :title="editingId ? 'Editar regra' : 'Nova regra de negócio'">
        <v-card-text>
          <v-form v-model="valid" class="form-grid" @submit.prevent="save">
            <v-select
              v-model="form.media_type"
              :items="editingId ? MEDIA_TYPE_OPTIONS : availableMediaTypes"
              label="Tipo de veículo"
              :disabled="Boolean(editingId)"
            />
            <v-text-field v-model="form.name" label="Nome da regra" :rules="[required, minLength(3)]" />
            <v-text-field
              v-model.number="form.base_radius_meters"
              label="Raio padrão (m)"
              type="number"
              min="1"
              :rules="[positive]"
            />
            <v-switch v-model="form.use_threshold" label="Aplicar raio diferente acima de uma área" color="primary" />
            <template v-if="form.use_threshold">
              <v-text-field
                v-model.number="form.area_threshold_m2"
                label="Limite de área (m²)"
                type="number"
                min="0.01"
                :rules="[positive]"
              />
              <v-text-field
                v-model.number="form.radius_above_threshold_meters"
                label="Raio acima do limite (m)"
                type="number"
                min="1"
                :rules="[positive]"
              />
            </template>
            <v-textarea
              v-model="form.description"
              label="Descrição"
              rows="3"
              class="span-2"
            />
            <v-switch v-model="form.is_active" label="Regra ativa" color="success" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="saving" :disabled="!valid" @click="save">Salvar regra</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :model-value="Boolean(deleteTarget)" max-width="480" @update:model-value="!$event && (deleteTarget = null)">
      <v-card title="Excluir regra">
        <v-card-text>
          Deseja excluir a regra <strong>{{ deleteTarget?.name }}</strong>? A exclusão é bloqueada se houver veículos desse tipo.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteTarget = null">Cancelar</v-btn>
          <v-btn color="error" :loading="saving" @click="confirmDelete">Excluir</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';

import { MEDIA_TYPE_OPTIONS, mediaTypeLabel } from '../domain/rules';
import { api } from '../services/api';
import { useMediaStore } from '../stores/media';
import type { MediaRule, MediaRuleInput } from '../types';

type RuleForm = MediaRuleInput & { use_threshold: boolean };

const media = useMediaStore();
const rules = ref<MediaRule[]>([]);
const dialog = ref(false);
const editingId = ref<string | null>(null);
const deleteTarget = ref<MediaRule | null>(null);
const saving = ref(false);
const valid = ref(false);
const error = ref('');
const form = reactive<RuleForm>(blankForm());
const required = (value: string) => Boolean(value?.trim()) || 'Campo obrigatório.';
const minLength = (length: number) => (value: string) => value.trim().length >= length || `Mínimo de ${length} caracteres.`;
const positive = (value: number) => Number(value) > 0 || 'Informe um valor maior que zero.';

const availableMediaTypes = computed(() => (
  MEDIA_TYPE_OPTIONS.filter((option) => !rules.value.some((rule) => rule.media_type === option.value))
));

onMounted(loadRules);

function blankForm(): RuleForm {
  return {
    media_type: 'outdoor',
    name: 'Outdoor',
    base_radius_meters: 80,
    area_threshold_m2: null,
    radius_above_threshold_meters: null,
    description: '',
    is_active: true,
    use_threshold: false,
  };
}

async function loadRules() {
  try {
    rules.value = await api.listMediaRules();
    media.rules = rules.value;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Falha ao carregar as regras.';
  }
}

function openCreate() {
  const firstType = availableMediaTypes.value[0];
  if (!firstType) return;
  editingId.value = null;
  Object.assign(form, blankForm(), { media_type: firstType.value, name: firstType.title });
  dialog.value = true;
}

function openEdit(rule: MediaRule) {
  editingId.value = rule.id;
  Object.assign(form, {
    media_type: rule.media_type,
    name: rule.name,
    base_radius_meters: rule.base_radius_meters,
    area_threshold_m2: rule.area_threshold_m2 ?? null,
    radius_above_threshold_meters: rule.radius_above_threshold_meters ?? null,
    description: rule.description ?? '',
    is_active: rule.is_active,
    use_threshold: rule.area_threshold_m2 != null,
  });
  dialog.value = true;
}

async function save() {
  if (!valid.value) return;
  saving.value = true;
  error.value = '';
  const payload: MediaRuleInput = {
    media_type: form.media_type,
    name: form.name,
    base_radius_meters: Number(form.base_radius_meters),
    area_threshold_m2: form.use_threshold ? Number(form.area_threshold_m2) : null,
    radius_above_threshold_meters: form.use_threshold ? Number(form.radius_above_threshold_meters) : null,
    description: form.description?.trim() || null,
    is_active: form.is_active,
  };
  try {
    if (editingId.value) {
      const { media_type: _mediaType, ...changes } = payload;
      await api.updateMediaRule(editingId.value, changes);
    } else {
      await api.createMediaRule(payload);
    }
    await loadRules();
    await media.loadAll();
    dialog.value = false;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Falha ao salvar a regra.';
  } finally {
    saving.value = false;
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  saving.value = true;
  error.value = '';
  try {
    await api.deleteMediaRule(deleteTarget.value.id);
    deleteTarget.value = null;
    await loadRules();
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Falha ao excluir a regra.';
  } finally {
    saving.value = false;
  }
}
</script>
