<template>
  <section>
    <PageHeader title="Regras de negócio" description="Raio mínimo de distância exigido para cada tipo de veículo de comunicação.">
      <template #actions>
        <Button
          :disabled="availableMediaTypes.length === 0"
          :title="availableMediaTypes.length === 0 ? 'Todos os tipos de veículo já têm regra' : undefined"
          @click="openCreate"
        >
          <Plus />
          Nova regra
        </Button>
      </template>
    </PageHeader>

    <Alert v-if="error && !dialog && !deleteTarget" variant="destructive" class="mb-4">
      <CircleAlert />
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <p class="mb-4 flex max-w-[80ch] gap-2 text-sm text-muted-foreground">
      <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      Mudanças valem para novos cadastros. Ativos já cadastrados mantêm o raio registrado até uma reavaliação administrativa.
    </p>

    <div class="overflow-hidden rounded-lg border bg-card">
      <EmptyState v-if="rules.length === 0" :icon="SlidersHorizontal" title="Nenhuma regra cadastrada">
        <Button variant="outline" @click="openCreate">Criar a primeira regra</Button>
      </EmptyState>
      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead>Veículo</TableHead>
            <TableHead class="text-right">Raio padrão</TableHead>
            <TableHead>Regra por área</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead class="hidden xl:table-cell">Descrição</TableHead>
            <TableHead class="w-px"><span class="sr-only">Ações</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="rule in rules" :key="rule.id">
            <TableCell class="min-w-52">
              <span class="font-medium">{{ rule.name }}</span>
              <span v-if="rule.name !== mediaTypeLabel(rule.media_type)" class="block text-sm text-muted-foreground">
                {{ mediaTypeLabel(rule.media_type) }}
              </span>
            </TableCell>
            <TableCell class="tabular text-right text-lg font-semibold whitespace-nowrap">{{ rule.base_radius_meters }} m</TableCell>
            <TableCell class="min-w-44">
              <span v-if="rule.area_threshold_m2 != null && rule.radius_above_threshold_meters != null">
                Acima de <span class="tabular">{{ rule.area_threshold_m2 }}</span> m²:
                <span class="tabular font-semibold">{{ rule.radius_above_threshold_meters }} m</span>
              </span>
              <span v-else class="text-muted-foreground">Não se aplica</span>
            </TableCell>
            <TableCell>
              <ToneBadge :tone="rule.is_active ? 'success' : 'neutral'">{{ rule.is_active ? 'Ativa' : 'Inativa' }}</ToneBadge>
            </TableCell>
            <TableCell class="hidden max-w-sm text-muted-foreground xl:table-cell">{{ rule.description || '—' }}</TableCell>
            <TableCell>
              <div class="flex justify-end gap-1">
                <Button variant="ghost" size="icon-sm" :aria-label="`Editar regra ${rule.name}`" title="Editar" @click="openEdit(rule)">
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  class="text-destructive hover:bg-danger-soft hover:text-destructive"
                  :aria-label="`Excluir regra ${rule.name}`"
                  title="Excluir"
                  @click="error = ''; deleteTarget = rule"
                >
                  <Trash2 />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <Dialog :open="dialog" @update:open="dialog = $event">
      <DialogScrollContent class="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{{ editingId ? 'Editar regra' : 'Nova regra' }}</DialogTitle>
        </DialogHeader>

        <form id="rule-form" class="grid gap-4 sm:grid-cols-2" novalidate @submit.prevent="save">
          <Alert v-if="error" variant="destructive" class="sm:col-span-2">
            <CircleAlert />
            <AlertDescription>{{ error }}</AlertDescription>
          </Alert>
          <FormField v-slot="{ id }" label="Tipo de veículo" :hint="editingId ? 'Não pode ser alterado.' : undefined">
            <Select v-model="form.media_type" :disabled="Boolean(editingId)">
              <SelectTrigger :id="id" class="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in editingId ? MEDIA_TYPE_OPTIONS : availableMediaTypes" :key="option.value" :value="option.value">
                  {{ option.title }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField v-slot="{ id, invalid }" label="Nome da regra" required :error="show(errors.name)">
            <Input :id="id" v-model="form.name" :aria-invalid="invalid || undefined" />
          </FormField>
          <FormField v-slot="{ id, invalid }" label="Raio padrão (m)" required :error="show(errors.base_radius_meters)">
            <Input :id="id" v-model="form.base_radius_meters" type="number" min="1" inputmode="numeric" :aria-invalid="invalid || undefined" />
          </FormField>

          <label class="flex items-center justify-between gap-4 rounded-md border px-4 py-3 sm:col-span-2">
            <span>
              <span class="block font-medium">Raio diferente acima de uma área</span>
              <span class="block text-sm text-muted-foreground">Veículos maiores que o limite usam outro raio.</span>
            </span>
            <Switch v-model="form.use_threshold" />
          </label>
          <template v-if="form.use_threshold">
            <FormField v-slot="{ id, invalid }" label="Limite de área (m²)" required :error="show(errors.area_threshold_m2)">
              <Input :id="id" :model-value="form.area_threshold_m2 ?? ''" type="number" min="0.01" step="0.01" inputmode="decimal" :aria-invalid="invalid || undefined" @update:model-value="form.area_threshold_m2 = toNumber($event)" />
            </FormField>
            <FormField v-slot="{ id, invalid }" label="Raio acima do limite (m)" required :error="show(errors.radius_above_threshold_meters)">
              <Input :id="id" :model-value="form.radius_above_threshold_meters ?? ''" type="number" min="1" inputmode="numeric" :aria-invalid="invalid || undefined" @update:model-value="form.radius_above_threshold_meters = toNumber($event)" />
            </FormField>
          </template>

          <FormField v-slot="{ id }" label="Descrição" class="sm:col-span-2">
            <Textarea :id="id" :model-value="form.description ?? ''" rows="3" @update:model-value="form.description = String($event)" />
          </FormField>
          <label class="flex items-center justify-between gap-4 rounded-md border px-4 py-3 sm:col-span-2">
            <span>
              <span class="block font-medium">Regra ativa</span>
              <span class="block text-sm text-muted-foreground">Regras inativas não são aplicadas a novos cadastros.</span>
            </span>
            <Switch v-model="form.is_active" />
          </label>
        </form>

        <DialogFooter>
          <Button variant="outline" @click="dialog = false">Cancelar</Button>
          <Button type="submit" form="rule-form" :disabled="saving">
            <LoaderCircle v-if="saving" class="animate-spin" />
            Salvar regra
          </Button>
        </DialogFooter>
      </DialogScrollContent>
    </Dialog>

    <AlertDialog :open="Boolean(deleteTarget)" @update:open="!$event && (deleteTarget = null)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir a regra {{ deleteTarget?.name }}?</AlertDialogTitle>
          <AlertDialogDescription>A exclusão é bloqueada se existirem veículos desse tipo cadastrados.</AlertDialogDescription>
        </AlertDialogHeader>
        <Alert v-if="error" variant="destructive">
          <CircleAlert />
          <AlertDescription>{{ error }}</AlertDescription>
        </Alert>
        <AlertDialogFooter>
          <Button variant="outline" @click="deleteTarget = null">Cancelar</Button>
          <Button variant="destructive" :disabled="saving" @click="confirmDelete">
            <LoaderCircle v-if="saving" class="animate-spin" />
            Excluir regra
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>

<script setup lang="ts">
import { CircleAlert, Info, LoaderCircle, Pencil, Plus, SlidersHorizontal, Trash2 } from '@lucide/vue';
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';

import EmptyState from '@/components/common/EmptyState.vue';
import ToneBadge from '@/components/common/ToneBadge.vue';
import FormField from '@/components/form/FormField.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

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
const attempted = ref(false);
const error = ref('');
const form = reactive<RuleForm>(blankForm());
const POSITIVE = 'Informe um valor maior que zero.';
const errors = computed(() => ({
  name: form.name.trim().length < 3 ? 'Mínimo de 3 caracteres.' : null,
  base_radius_meters: Number(form.base_radius_meters) > 0 ? null : POSITIVE,
  area_threshold_m2: !form.use_threshold || Number(form.area_threshold_m2) > 0 ? null : POSITIVE,
  radius_above_threshold_meters: !form.use_threshold || Number(form.radius_above_threshold_meters) > 0 ? null : POSITIVE,
}));
const valid = computed(() => Object.values(errors.value).every((message) => !message));

function show(message: string | null) {
  return attempted.value ? message : null;
}

function toNumber(value: string | number): number | null {
  return value === '' ? null : Number(value);
}

const availableMediaTypes = computed(() => (
  MEDIA_TYPE_OPTIONS.filter((option) => !rules.value.some((rule) => rule.media_type === option.value))
));

onMounted(() => {
  window.addEventListener('geomidia:rules-refresh', loadRules);
  void loadRules();
});
onUnmounted(() => window.removeEventListener('geomidia:rules-refresh', loadRules));

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
  attempted.value = false;
  error.value = '';
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
  attempted.value = false;
  error.value = '';
  dialog.value = true;
}

async function save() {
  attempted.value = true;
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
