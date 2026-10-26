<template>
  <Dialog :open="open" @update:open="onDialogOpenChange">
    <DialogContent
      class="flex max-h-[min(90dvh,60rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
      :show-close-button="Boolean(asset)"
      @interact-outside="preventCreateDismiss"
      @escape-key-down="preventCreateDismiss"
    >
      <DialogHeader class="shrink-0 gap-0 border-b px-6 pt-6 pb-4 pr-14">
        <DialogTitle class="text-xl tracking-tight">
          {{ editingAsset ? `Editar ${editingAsset.official_process_code || editingAsset.process_code}` : 'Novo cadastro de veículo' }}
        </DialogTitle>
        <span class="brand-slant mt-2 block h-1 w-8 rounded-[1px] bg-brand-yellow" aria-hidden="true" />
        <DialogDescription v-if="!editingAsset" class="mt-2">O processo entra como novo e segue para análise.</DialogDescription>
      </DialogHeader>

      <div class="flex min-h-0 flex-1">
        <!-- Índice: atalhos para cada parte e um resumo do que falta. -->
        <aside class="hidden w-60 shrink-0 flex-col gap-6 border-r bg-muted/40 p-5 md:flex">
          <nav class="grid gap-1" aria-label="Partes do cadastro">
            <button
              v-for="group in sectionGroups"
              :key="group.id"
              type="button"
              :aria-current="group.id === current ? 'location' : undefined"
              :class="cn(
                'flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
                group.id === current ? 'bg-card font-medium text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
              )"
              @click="goToSection(group.id)"
            >
              {{ group.label }}
              <span v-if="attempted && groupHasErrors(group.id)" class="size-1.5 rounded-full bg-destructive" aria-label="com pendência" />
            </button>
          </nav>
          <dl class="grid gap-3 border-t pt-5 text-sm">
            <div>
              <dt class="text-muted-foreground">Raio pela regra atual</dt>
              <dd class="text-lg font-semibold tabular">{{ calculatedRadius }} m</dd>
            </div>
            <div>
              <dt class="text-muted-foreground">Status ao cadastrar</dt>
              <dd class="mt-1"><StatusBadge :status="form.status" /></dd>
            </div>
            <div>
              <dt class="text-muted-foreground">Campos obrigatórios</dt>
              <dd :class="cn('font-medium', missingCount ? 'text-foreground' : 'text-success')">
                {{ missingCount ? `${missingCount} em aberto` : 'Todos preenchidos' }}
              </dd>
            </div>
          </dl>
        </aside>

        <div ref="body" class="min-w-0 flex-1 overflow-y-auto px-6 py-5" @scroll="onBodyScroll">
      <form id="asset-form" class="grid gap-6" novalidate @submit.prevent="save">
        <Alert v-if="media.error" variant="destructive">
          <CircleAlert />
          <AlertDescription>{{ media.error }}</AlertDescription>
        </Alert>

        <div v-if="editingAsset" :id="sectionId('processo')" class="grid scroll-mt-2 gap-6">
        <dl class="grid grid-cols-2 gap-x-6 gap-y-3 rounded-md bg-muted/60 p-4 sm:grid-cols-4">
          <div>
            <dt class="text-sm text-muted-foreground">Protocolo de origem</dt>
            <dd class="font-medium">{{ editingAsset.process_code }}</dd>
          </div>
          <div>
            <dt class="text-sm text-muted-foreground">Raio registrado</dt>
            <dd class="tabular font-medium">{{ editingAsset.radius_meters }} m</dd>
          </div>
          <div>
            <dt class="text-sm text-muted-foreground">Criado em</dt>
            <dd>{{ formatDateTime(editingAsset.created_at) }}</dd>
          </div>
          <div>
            <dt class="text-sm text-muted-foreground">Atualizado em</dt>
            <dd>{{ formatDateTime(editingAsset.updated_at) }}</dd>
          </div>
        </dl>

        <FormSection title="Processo">
          <FormField
            v-slot="{ id, describedBy }"
            label="Protocolo oficial"
            hint="Depois da protocolização oficial, passa a ser o protocolo principal."
            class="sm:col-span-2"
          >
            <Input :id="id" :model-value="form.official_process_code ?? ''" maxlength="80" :aria-describedby="describedBy" @update:model-value="form.official_process_code = String($event)" />
          </FormField>
        </FormSection>
        </div>

        <FormSection :id="sectionId('requerente')" class="scroll-mt-2" title="Requerente">
          <template v-if="selectedForm">
            <FormField v-slot="{ id, invalid }" label="Empresa ou responsável" required :error="show('company_responsible')">
              <Input :id="id" v-model="formDetails.company_responsible" maxlength="120" :aria-invalid="invalid || undefined" />
            </FormField>
            <FormField v-slot="{ id }" label="CNPJ">
              <Input :id="id" :model-value="formDetails.company_cnpj ?? ''" maxlength="14" inputmode="numeric" @update:model-value="formDetails.company_cnpj = String($event)" />
            </FormField>
            <FormField v-slot="{ id, invalid }" label="Inscrição municipal" required :error="show('municipal_registration')">
              <Input :id="id" v-model="formDetails.municipal_registration" :aria-invalid="invalid || undefined" />
            </FormField>
            <FormField v-slot="{ id, invalid }" label="E-mail do solicitante" required :error="show('requester_email')">
              <Input :id="id" v-model="formDetails.requester_email" type="email" :aria-invalid="invalid || undefined" />
            </FormField>
          </template>
          <FormField v-slot="{ id }" label="Contato do solicitante">
            <Input :id="id" :model-value="form.contact_name ?? ''" @update:model-value="form.contact_name = String($event)" />
          </FormField>
          <FormField v-if="!selectedForm" v-slot="{ id }" label="E-mail do solicitante">
            <Input :id="id" :model-value="form.contact_email ?? ''" type="email" @update:model-value="form.contact_email = String($event)" />
          </FormField>
        </FormSection>

        <FormSection :id="sectionId('local')" class="scroll-mt-2" title="Local de instalação">
          <template v-if="selectedForm">
            <FormField v-slot="{ id, invalid }" label="Inscrição imobiliária" required :error="show('property_registration')">
              <Input :id="id" v-model="formDetails.property_registration" :aria-invalid="invalid || undefined" />
            </FormField>
            <FormField v-slot="{ id, invalid }" label="Logradouro" required :error="show('street')">
              <Input :id="id" v-model="formDetails.street" :aria-invalid="invalid || undefined" />
            </FormField>
            <FormField v-slot="{ id, invalid }" label="Número" required :error="show('number')">
              <Input :id="id" v-model="formDetails.number" :aria-invalid="invalid || undefined" />
            </FormField>
            <FormField v-slot="{ id, invalid }" label="CEP" required :error="show('postal_code')">
              <Input :id="id" v-model="formDetails.postal_code" inputmode="numeric" :aria-invalid="invalid || undefined" />
            </FormField>
          </template>
          <FormField v-else v-slot="{ id, invalid }" label="Endereço completo" required :error="show('address')" class="sm:col-span-2">
            <Input :id="id" v-model="form.address" :aria-invalid="invalid || undefined" />
          </FormField>
          <FormField v-slot="{ id }" label="Bairro">
            <SearchSelect :id="id" v-model="editable.district" :options="DISTRICT_OPTIONS" search-label="Buscar bairro" list-label="Bairros" />
          </FormField>
          <div class="hidden sm:block" aria-hidden="true" />
          <FormField v-slot="{ id, invalid }" label="Latitude" required :error="show('latitude')">
            <Input :id="id" :model-value="editable.latitude" type="number" step="any" :aria-invalid="invalid || undefined" @update:model-value="editable.latitude = Number($event)" />
          </FormField>
          <FormField v-slot="{ id, invalid }" label="Longitude" required :error="show('longitude')">
            <Input :id="id" :model-value="editable.longitude" type="number" step="any" :aria-invalid="invalid || undefined" @update:model-value="editable.longitude = Number($event)" />
          </FormField>
        </FormSection>

        <FormSection :id="sectionId('veiculo')" class="scroll-mt-2" title="Veículo de comunicação">
          <FormField v-slot="{ id }" label="Tipo de veículo" class="sm:col-span-2">
            <SearchSelect :id="id" v-model="editable.media_type" :options="registrationMediaTypeOptions" search-label="Buscar tipo de veículo" list-label="Tipos de veículo" />
          </FormField>
          <fieldset v-if="!editingId && formAreaThreshold != null" class="grid gap-2 sm:col-span-2">
            <legend class="text-sm font-medium">
              O painel tem área maior que <span class="tabular">{{ formAreaThreshold }}</span> m²?<span class="text-destructive" aria-hidden="true"> *</span>
            </legend>
            <div class="flex gap-2">
              <label
                v-for="option in AREA_OPTIONS"
                :key="option.value"
                :class="cn(
                  'flex h-10 cursor-pointer items-center gap-2 rounded-md border px-4 has-[:checked]:border-primary has-[:checked]:bg-secondary has-[:checked]:text-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                )"
              >
                <input v-model="form.area_rule_classification" type="radio" name="area-rule" :value="option.value" class="accent-[var(--brand-navy)]" />
                {{ option.title }}
              </label>
            </div>
            <p v-if="show('area_rule_classification')" class="text-sm text-destructive">{{ errors.area_rule_classification }}</p>
          </fieldset>
          <FormField v-slot="{ id, invalid }" label="Largura (m)" :error="show('width_m')">
            <Input :id="id" :model-value="form.width_m ?? ''" type="number" min="0" step="any" :aria-invalid="invalid || undefined" @update:model-value="form.width_m = toNumber($event)" />
          </FormField>
          <FormField v-slot="{ id }" label="Borda superior (m)">
            <Input :id="id" :model-value="form.top_height_m ?? ''" type="number" step="any" @update:model-value="form.top_height_m = toNumber($event)" />
          </FormField>
          <FormField v-slot="{ id }" label="Vencimento da autorização" hint="Opcional">
            <Input :id="id" :model-value="editable.expiration_date ?? ''" type="date" @update:model-value="editable.expiration_date = String($event) || null" />
          </FormField>
          <FormField v-if="selectedForm" v-slot="{ id }" label="Quantidade de faces">
            <Input :id="id" :model-value="formDetails.number_of_faces ?? ''" @update:model-value="formDetails.number_of_faces = String($event)" />
          </FormField>
          <div class="flex gap-3 rounded-md bg-secondary px-4 py-3 text-sm text-foreground sm:col-span-2">
            <Ruler class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <p v-if="!editingAsset">Raio pela regra atual: <strong class="tabular">{{ calculatedRadius }} m</strong>.</p>
            <p v-else-if="currentRadiusAvailable">
              Raio registrado: <strong class="tabular">{{ editingAsset.radius_meters }} m</strong>.
              Pela regra atual, seria <strong class="tabular">{{ calculatedRadius }} m</strong>.
            </p>
            <p v-else>
              Raio registrado: <strong class="tabular">{{ editingAsset.radius_meters }} m</strong>.
              A classificação histórica não permite calcular com segurança o raio pela regra atual.
            </p>
          </div>
        </FormSection>

        <div :id="sectionId('analise')" class="grid scroll-mt-2 gap-6">
        <FormSection title="Análise">
          <FormField v-if="!editingId || form.status === 'novos processos'" label="Status" hint="Use a ação Iniciar análise para liberar as demais situações." class="sm:col-span-2">
            <div><StatusBadge status="novos processos" /></div>
          </FormField>
          <FormField v-else v-slot="{ id }" label="Status">
            <Select v-model="form.status">
              <SelectTrigger :id="id" class="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in DECISION_STATUS_OPTIONS" :key="option.value" :value="option.value">{{ option.title }}</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField v-slot="{ id }" label="Justificativa jurídica ou territorial" class="sm:col-span-2">
            <Textarea :id="id" :model-value="form.justification ?? ''" rows="3" @update:model-value="form.justification = String($event)" />
          </FormField>
        </FormSection>

        <div v-if="editingId" class="grid gap-2">
          <h3 class="font-medium">Anexos do formulário público</h3>
          <div v-if="media.applicationFormsLoading" class="grid gap-2" aria-label="Carregando anexos">
            <Skeleton class="h-11" />
          </div>
          <div v-else-if="media.applicationFormsError" class="flex flex-wrap items-center gap-3 rounded-md bg-warning-soft px-4 py-3 text-sm">
            <span>{{ media.applicationFormsError }}</span>
            <Button type="button" variant="link" size="sm" class="h-auto px-0" @click="retrySelectedForm">Tentar novamente</Button>
          </div>
          <ul v-else-if="selectedForm?.attachments.length" class="divide-y rounded-md border">
            <li v-for="attachment in selectedForm.attachments" :key="attachment.id" class="flex items-center gap-3 px-4 py-2.5">
              <Paperclip class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div class="min-w-0 flex-1">
                <p class="truncate" :title="attachment.original_filename">{{ attachment.original_filename }}</p>
                <p class="text-sm text-muted-foreground">{{ attachmentCategoryLabel(attachment.category) }}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" @click="openUploadedAttachment(attachment)">
                <ExternalLink />
                Abrir
              </Button>
            </li>
          </ul>
          <p v-else-if="media.applicationFormsLoaded" class="text-sm text-muted-foreground">Nenhum anexo enviado pelo formulário para este veículo.</p>
          <ul v-if="formManualLinks.length" class="divide-y rounded-md border">
            <li v-for="(link, index) in formManualLinks" :key="`form-${index}`" class="flex items-center gap-3 px-4 py-2.5">
              <a :href="link" target="_blank" rel="noopener noreferrer" class="min-w-0 flex-1 truncate text-primary underline-offset-4 hover:underline">{{ link }}</a>
              <span class="shrink-0 text-sm text-muted-foreground">Do formulário</span>
            </li>
          </ul>
        </div>

        <AttachmentLinksEditor v-model="attachmentLinks" />
        </div>
      </form>
        </div>
      </div>

      <DialogFooter class="shrink-0 border-t bg-card px-6 py-4 sm:justify-between">
        <Button v-if="editingAsset && auth.canDelete" variant="ghost" @click="reassessmentOpen = true">
          <Ruler />
          Reavaliar raio
        </Button>
        <span v-else />
        <div class="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" @click="emit('update:open', false)">Cancelar</Button>
          <Button type="submit" form="asset-form" :disabled="media.saving || (Boolean(editingId) && !media.applicationFormsLoaded)">
            <LoaderCircle v-if="media.saving" class="animate-spin" />
            {{ editingAsset ? 'Salvar alterações' : 'Cadastrar veículo' }}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <RadiusReassessmentDialog v-model:open="reassessmentOpen" :asset="editingAsset" @reassessed="editingAsset = $event" />
</template>

<script setup lang="ts">
import { CircleAlert, ExternalLink, LoaderCircle, Paperclip, Ruler } from '@lucide/vue';
import { computed, nextTick, reactive, ref, watch } from 'vue';

import StatusBadge from '@/components/common/StatusBadge.vue';
import AttachmentLinksEditor from '@/components/form/AttachmentLinksEditor.vue';
import FormField from '@/components/form/FormField.vue';
import SearchSelect from '@/components/form/SearchSelect.vue';
import FormSection from '@/components/form/FormSection.vue';
import RadiusReassessmentDialog from '@/components/inventory/RadiusReassessmentDialog.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  DECISION_STATUS_OPTIONS,
  DISTRICT_OPTIONS,
  canPreviewCurrentRadius,
  getRequiredRadius,
  mediaTypeOptionsFromRules,
} from '@/domain/rules';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { useMediaStore } from '@/stores/media';
import type {
  ApplicationForm,
  ApplicationFormAttachment,
  ApplicationFormInput,
  LinkedApplicationFormUpdate,
  MediaAsset,
  MediaAssetInput,
} from '@/types';
import { attachmentCategoryLabel, openApplicationFormAttachment } from '@/utils/application-form-attachments';
import { joinAttachmentLinks, parseAttachmentLinks } from '@/utils/attachment-links';
import { formatDateTime } from '@/utils/format';

// asset = null abre o cadastro; um ativo abre a edição.
const props = defineProps<{ open: boolean; asset: MediaAsset | null }>();
const emit = defineEmits<{ 'update:open': [open: boolean] }>();

function preventCreateDismiss(event: Event) {
  if (!props.asset) event.preventDefault();
}

function onDialogOpenChange(open: boolean) {
  // O cadastro novo só fecha pelas ações explícitas de cancelar ou salvar.
  if (open || props.asset) emit('update:open', open);
}

const AREA_OPTIONS = [
  { title: 'Não', value: 'within_limit' },
  { title: 'Sim', value: 'above_limit' },
] as const;

const media = useMediaStore();
const auth = useAuthStore();
const editingId = ref<string | null>(null);
const editingAsset = ref<MediaAsset | null>(null);
const reassessmentOpen = ref(false);
const attempted = ref(false);
const attachmentLinks = ref<string[]>([]);

// Partes do cadastro, listadas no índice ao lado do formulário.
const sectionGroups = computed(() => [
  ...(editingAsset.value ? [{ id: 'processo', label: 'Processo' }] : []),
  { id: 'requerente', label: 'Requerente' },
  { id: 'local', label: 'Local' },
  { id: 'veiculo', label: 'Veículo' },
  { id: 'analise', label: 'Análise e anexos' },
]);
const current = ref('requerente');
const body = ref<HTMLElement | null>(null);

function sectionId(group: string) {
  return `asset-section-${group}`;
}

function goToSection(group: string) {
  current.value = group;
  document.getElementById(sectionId(group))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// A parte marcada no índice acompanha a rolagem.
function onBodyScroll() {
  if (!body.value) return;
  const top = body.value.getBoundingClientRect().top;
  let active = sectionGroups.value[0].id;
  for (const group of sectionGroups.value) {
    const element = document.getElementById(sectionId(group.id));
    if (element && element.getBoundingClientRect().top - top < 80) active = group.id;
  }
  current.value = active;
}

const registrationMediaTypeOptions = computed(() => mediaTypeOptionsFromRules(media.rules));

const form = reactive<MediaAssetInput>(blankForm());
const formAreaThreshold = computed(() => media.rules.find(
  (rule) => rule.media_type === form.media_type && rule.is_active,
)?.area_threshold_m2 ?? null);
watch(() => form.media_type, () => {
  if (!editingId.value) form.area_rule_classification = null;
});
const formDetails = reactive<ApplicationFormInput>(blankFormDetails());
const selectedForm = computed(() => media.applicationForms.find((item) => item.asset_id === editingId.value) ?? null);
const editable = computed(() => selectedForm.value ? formDetails : form);
const formManualLinks = computed(() => parseAttachmentLinks(selectedForm.value?.attachment_links).filter((link) => /^https?:\/\//i.test(link)));

watch(selectedForm, (value) => {
  if (value) Object.assign(formDetails, formDetailsFrom(value));
});

watch(() => props.open, (open) => {
  if (!open) return;
  attempted.value = false;
  current.value = props.asset ? 'processo' : 'requerente';
  media.error = null;
  if (props.asset) startEdit(props.asset);
  else startCreate();
});

const calculatedRadius = computed(() => getRequiredRadius(
  editable.value.media_type, editable.value.area_m2, media.rules, editable.value.area_rule_classification,
));
const currentRadiusAvailable = computed(() => canPreviewCurrentRadius(
  editable.value.media_type, editable.value.area_m2, media.rules,
));

const blank = (value: unknown) => !String(value ?? '').trim();
const inRange = (value: number, min: number, max: number) => Number(value) >= min && Number(value) <= max;
const REQUIRED = 'Campo obrigatório.';

const errors = computed(() => {
  const linked = Boolean(selectedForm.value);
  return {
    company_responsible: linked && blank(formDetails.company_responsible) ? REQUIRED : null,
    municipal_registration: linked && blank(formDetails.municipal_registration) ? REQUIRED : null,
    requester_email: linked && blank(formDetails.requester_email) ? REQUIRED : null,
    property_registration: linked && blank(formDetails.property_registration) ? REQUIRED : null,
    street: linked && blank(formDetails.street) ? REQUIRED : null,
    number: linked && blank(formDetails.number) ? REQUIRED : null,
    postal_code: linked && blank(formDetails.postal_code) ? REQUIRED : null,
    address: !linked && form.address.trim().length < 3
      ? (blank(form.address) ? REQUIRED : 'Mínimo de 3 caracteres.')
      : null,
    latitude: inRange(editable.value.latitude, -20.65, -20.30) ? null : 'Latitude fora da área de Campo Grande.',
    longitude: inRange(editable.value.longitude, -54.80, -54.40) ? null : 'Longitude fora da área de Campo Grande.',
    width_m: Number(form.width_m) >= 0 ? null : 'Informe um valor igual ou maior que zero.',
    area_rule_classification: !editingId.value && formAreaThreshold.value != null && !form.area_rule_classification
      ? 'Responda se a área passa do limite.'
      : null,
  };
});
const formValid = computed(() => Object.values(errors.value).every((message) => !message));
const missingCount = computed(() => Object.values(errors.value).filter(Boolean).length);

type ErrorKey = keyof typeof errors.value;
const ERROR_GROUP: Record<ErrorKey, string> = {
  company_responsible: 'requerente', municipal_registration: 'requerente', requester_email: 'requerente',
  property_registration: 'local', street: 'local', number: 'local', postal_code: 'local', address: 'local',
  latitude: 'local', longitude: 'local', width_m: 'veiculo', area_rule_classification: 'veiculo',
};
function groupHasErrors(group: string) {
  return (Object.keys(ERROR_GROUP) as ErrorKey[]).some((key) => ERROR_GROUP[key] === group && errors.value[key]);
}

function show(key: ErrorKey) {
  return attempted.value ? errors.value[key] : null;
}

function toNumber(value: string | number): number | null {
  return value === '' ? null : Number(value);
}

function blankForm(): MediaAssetInput {
  return {
    media_type: 'outdoor',
    official_process_code: null,
    address: '',
    district: 'Centro',
    latitude: -20.464,
    longitude: -54.612,
    area_m2: null,
    area_rule_classification: null,
    width_m: 9,
    bottom_height_m: null,
    top_height_m: null,
    expiration_date: null,
    status: 'novos processos',
    justification: '',
    attachment_links: '',
    contact_name: '',
    contact_email: '',
  };
}

function blankFormDetails(): ApplicationFormInput {
  return {
    company_responsible: '', company_cnpj: null, municipal_registration: '', property_registration: '',
    street: '', number: '', district: 'Centro', postal_code: '', latitude: -20.464, longitude: -54.612,
    media_type: 'outdoor', area_m2: null, area_rule_classification: null, bottom_height_m: null, number_of_faces: null,
    expiration_date: null, requester_email: '', attachment_links: null,
  };
}

function formDetailsFrom(value: ApplicationForm): ApplicationFormInput {
  return {
    company_responsible: value.company_responsible,
    company_cnpj: value.company_cnpj,
    municipal_registration: value.municipal_registration,
    property_registration: value.property_registration,
    street: value.street,
    number: value.number,
    district: value.district,
    postal_code: value.postal_code,
    latitude: value.latitude,
    longitude: value.longitude,
    media_type: value.media_type,
    area_m2: value.area_m2,
    area_rule_classification: value.area_rule_classification,
    bottom_height_m: value.bottom_height_m,
    number_of_faces: value.number_of_faces,
    expiration_date: value.expiration_date,
    requester_email: value.requester_email,
    attachment_links: value.attachment_links,
  };
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

function startCreate() {
  editingId.value = null;
  editingAsset.value = null;
  Object.assign(form, blankForm());
  attachmentLinks.value = [];
}

function startEdit(asset: MediaAsset) {
  editingId.value = asset.id;
  editingAsset.value = asset;
  Object.assign(form, {
    official_process_code: asset.official_process_code ?? null,
    media_type: asset.media_type,
    address: asset.address,
    district: asset.district,
    latitude: asset.latitude,
    longitude: asset.longitude,
    area_m2: asset.area_m2,
    area_rule_classification: asset.area_rule_classification ?? null,
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
  attachmentLinks.value = parseAttachmentLinks(asset.attachment_links);
  void media.loadApplicationFormForInventory(asset.id);
}

function retrySelectedForm() {
  if (editingId.value) void media.loadApplicationFormForInventory(editingId.value);
}

async function openUploadedAttachment(attachment: ApplicationFormAttachment) {
  if (!selectedForm.value) return;
  try {
    await openApplicationFormAttachment(selectedForm.value.id, attachment.id);
  } catch (error) {
    media.error = error instanceof Error ? error.message : 'Falha ao abrir o anexo.';
  }
}

async function save() {
  attempted.value = true;
  if (!formValid.value) {
    // Leva à primeira parte com pendência e põe o foco no primeiro campo com erro.
    const firstGroup = sectionGroups.value.find((group) => groupHasErrors(group.id));
    if (firstGroup) current.value = firstGroup.id;
    await nextTick();
    document.querySelector<HTMLElement>('#asset-form [aria-invalid="true"]')?.focus();
    return;
  }
  if (editingId.value && !media.applicationFormsLoaded) return;

  try {
    await media.runInventoryMutation(saveChanges);
    emit('update:open', false);
  } catch {
    // O store publica o erro em media.error, exibido no topo do diálogo.
  }
}

async function saveChanges() {
  if (editingId.value) {
    if (selectedForm.value) {
      const formPayload = {
        ...formDetailsFrom(selectedForm.value),
        ...formDetails,
        company_cnpj: formDetails.company_cnpj || null,
        number_of_faces: formDetails.number_of_faces || null,
        expiration_date: formDetails.expiration_date || null,
      };
      const formChanges = Object.fromEntries(Object.entries(formPayload).filter(
        ([key, value]) => [
          'company_responsible', 'company_cnpj', 'municipal_registration', 'property_registration',
          'street', 'number', 'district', 'postal_code', 'latitude', 'longitude', 'media_type',
          'number_of_faces', 'expiration_date', 'requester_email',
        ].includes(key) && value !== selectedForm.value?.[key as keyof ApplicationForm],
      )) as LinkedApplicationFormUpdate['form'];
      const assetPayload = {
        official_process_code: form.official_process_code?.trim() || null,
        width_m: form.width_m || null,
        top_height_m: form.top_height_m || null,
        status: form.status,
        justification: form.justification || null,
        contact_name: form.contact_name || null,
        attachment_links: joinAttachmentLinks(attachmentLinks.value) || null,
      };
      const assetChanges = Object.fromEntries(Object.entries(assetPayload).filter(
        ([key, value]) => value !== editingAsset.value?.[key as keyof MediaAsset],
      )) as LinkedApplicationFormUpdate['asset'];
      if (Object.keys(formChanges).length || Object.keys(assetChanges).length) {
        await media.updateLinkedAsset(editingId.value, selectedForm.value.id, formChanges, assetChanges);
      }
    } else {
      const changes = Object.fromEntries(Object.entries(sanitizeForm()).filter(
        ([key]) => !['area_m2', 'bottom_height_m', 'area_rule_classification'].includes(key),
      )) as Partial<MediaAssetInput>;
      await media.updateAsset(editingId.value, changes);
    }
  } else {
    await media.createAsset(sanitizeForm());
  }
}
</script>
