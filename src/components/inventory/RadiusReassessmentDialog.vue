<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Reavaliar raio</DialogTitle>
        <DialogDescription>Aplica a regra atual a um ativo já cadastrado. A decisão fica registrada no histórico.</DialogDescription>
      </DialogHeader>

      <div v-if="loading && !preview" class="grid gap-2" aria-label="Carregando prévia">
        <Skeleton class="h-16" />
        <Skeleton class="h-10" />
      </div>

      <Alert v-if="error" variant="destructive">
        <CircleAlert />
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>

      <template v-if="preview">
        <dl class="grid grid-cols-2 gap-4 rounded-md bg-muted/60 p-4">
          <div>
            <dt class="text-sm text-muted-foreground">Raio registrado</dt>
            <dd class="tabular text-xl font-semibold">{{ preview.registered_radius_meters }} m</dd>
          </div>
          <div>
            <dt class="text-sm text-muted-foreground">Pela regra atual</dt>
            <dd class="tabular text-xl font-semibold">
              {{ preview.current_radius_meters == null ? 'Indisponível' : `${preview.current_radius_meters} m` }}
            </dd>
          </div>
          <div class="col-span-2">
            <dt class="text-sm text-muted-foreground">Condição usada</dt>
            <dd>{{ preview.condition }}</dd>
          </div>
        </dl>

        <p v-if="!preview.can_reassess" class="rounded-md bg-warning-soft px-4 py-3 text-sm">
          {{ preview.reason_unavailable }}
        </p>
        <FormField
          v-else
          v-slot="{ id, invalid }"
          label="Motivo da reavaliação"
          required
          hint="Mínimo de 10 caracteres."
          :error="reason && !validReassessmentReason(reason) ? 'Informe ao menos 10 caracteres.' : null"
        >
          <Textarea :id="id" v-model="reason" rows="3" :aria-invalid="invalid || undefined" />
        </FormField>
      </template>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">Cancelar</Button>
        <Button :disabled="loading || !preview?.can_reassess || !validReassessmentReason(reason)" @click="confirm">
          <LoaderCircle v-if="loading && preview" class="animate-spin" />
          Confirmar reavaliação
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { CircleAlert, LoaderCircle } from '@lucide/vue';
import { ref, watch } from 'vue';

import FormField from '@/components/form/FormField.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { validReassessmentReason } from '@/domain/rules';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useMediaStore } from '@/stores/media';
import type { MediaAsset, RadiusReassessmentPreview } from '@/types';

const props = defineProps<{ open: boolean; asset: MediaAsset | null }>();
const emit = defineEmits<{ 'update:open': [open: boolean]; reassessed: [asset: MediaAsset] }>();

const auth = useAuthStore();
const media = useMediaStore();
const loading = ref(false);
const error = ref('');
const reason = ref('');
const preview = ref<RadiusReassessmentPreview | null>(null);

watch(() => props.open, (open) => {
  if (open) void loadPreview();
});

async function loadPreview() {
  if (!props.asset || auth.role !== 'admin') return;
  preview.value = null;
  reason.value = '';
  error.value = '';
  loading.value = true;
  try {
    preview.value = await api.previewRadiusReassessment(props.asset.id);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Falha ao carregar a prévia.';
  } finally {
    loading.value = false;
  }
}

async function confirm() {
  const current = preview.value;
  if (!props.asset || !current?.can_reassess || !current.rule_updated_at || !validReassessmentReason(reason.value)) return;
  loading.value = true;
  error.value = '';
  try {
    const updated = await api.confirmRadiusReassessment(props.asset.id, {
      reason: reason.value.trim(),
      expected_registered_radius_meters: current.registered_radius_meters,
      expected_rule_updated_at: current.rule_updated_at,
    });
    emit('reassessed', updated);
    emit('update:open', false);
    await media.refreshInventory();
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Falha ao confirmar a reavaliação.';
  } finally {
    loading.value = false;
  }
}
</script>
