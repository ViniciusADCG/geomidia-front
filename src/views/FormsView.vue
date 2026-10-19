<template>
  <section>
    <PageHeader title="Solicitações recebidas" description="Pedidos enviados pelo formulário público, prontos para análise." />

    <Alert v-if="message && !dialog && !deleteTarget" :variant="messageType === 'error' ? 'destructive' : 'default'" class="mb-4 pr-12">
      <CircleCheck v-if="messageType === 'success'" class="text-success" />
      <CircleAlert v-else />
      <AlertDescription :class="messageType === 'success' && 'text-foreground'">{{ message }}</AlertDescription>
      <button type="button" class="absolute top-2.5 right-2.5 rounded-sm p-1 opacity-70 hover:opacity-100" aria-label="Fechar aviso" @click="message = ''">
        <X class="size-4" />
      </button>
    </Alert>

    <div class="overflow-hidden rounded-lg border bg-card">
      <div class="border-b p-4">
        <SearchInput
          :model-value="formList.searchDraft.value"
          placeholder="Empresa, inscrição, endereço ou processo"
          label="Buscar solicitações"
          @update:model-value="formList.scheduleSearch($event)"
        />
      </div>

      <div v-if="formList.error.value && formList.items.value.length" class="flex flex-wrap items-center gap-3 border-b bg-warning-soft px-4 py-3 text-sm">
        <span>Não foi possível atualizar a lista: {{ formList.error.value }}</span>
        <Button variant="link" size="sm" class="h-auto px-0" @click="formList.load()">Tentar novamente</Button>
      </div>

      <div v-if="formList.items.value.length === 0">
        <div v-if="formList.loading.value || !formList.loaded.value" class="grid gap-3 p-4" aria-label="Carregando solicitações">
          <Skeleton v-for="n in 4" :key="n" class="h-12" />
        </div>
        <EmptyState
          v-else-if="formList.error.value"
          :icon="CircleAlert"
          title="Não foi possível carregar as solicitações"
          :description="formList.error.value"
        >
          <Button variant="outline" @click="formList.load()">Tentar novamente</Button>
        </EmptyState>
        <EmptyState
          v-else
          :icon="Inbox"
          :title="formList.search.value ? 'Nenhuma solicitação encontrada' : 'Nenhuma solicitação recebida'"
          :description="formList.search.value ? 'Tente outro termo de busca.' : 'Os pedidos enviados pelo formulário público aparecem aqui.'"
        />
      </div>

      <template v-else>
        <ul class="divide-y xl:hidden">
          <li v-for="item in formList.items.value" :key="item.id" class="px-4 py-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="font-medium">{{ item.process_code }}</p>
              <StatusBadge :status="item.status" />
            </div>
            <p class="mt-1">{{ item.company_responsible }}</p>
            <p class="mt-0.5 text-sm text-muted-foreground">{{ item.street }}, {{ item.number }}, {{ item.district }}</p>
            <p class="text-sm text-muted-foreground">{{ mediaTypeLabel(item.media_type) }}</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <Button v-if="item.status === 'novos processos'" size="sm" :disabled="saving" @click="startAnalysis(item)">
                <Play />
                Iniciar análise
              </Button>
              <Button variant="outline" size="sm" @click="openEdit(item)"><Pencil />Editar</Button>
              <Button variant="outline" size="sm" @click="viewOnMap(item)"><MapPin />Mapa</Button>
              <Button v-if="auth.canDelete" variant="ghost" size="sm" class="text-destructive hover:bg-danger-soft hover:text-destructive" @click="askDelete(item)">
                <Trash2 />Excluir
              </Button>
            </div>
          </li>
        </ul>

        <Table class="hidden xl:table">
          <TableHeader>
            <TableRow>
              <TableHead>Processo</TableHead>
              <TableHead>Empresa responsável</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Tipo de veículo</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead class="hidden 2xl:table-cell">Atualização</TableHead>
              <TableHead class="w-px"><span class="sr-only">Ações</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="item in formList.items.value" :key="item.id">
              <TableCell class="font-medium whitespace-nowrap">{{ item.process_code }}</TableCell>
              <TableCell class="min-w-48">
                {{ item.company_responsible }}
                <span class="block text-sm text-muted-foreground">
                  <template v-if="item.company_cnpj">CNPJ {{ item.company_cnpj }}<br /></template>
                  Inscrição {{ item.municipal_registration }}
                </span>
              </TableCell>
              <TableCell class="min-w-44">
                {{ item.street }}, {{ item.number }}
                <span class="block text-sm text-muted-foreground">{{ item.district }}</span>
              </TableCell>
              <TableCell class="min-w-36">{{ mediaTypeLabel(item.media_type) }}</TableCell>
              <TableCell class="whitespace-nowrap">{{ formatDate(item.expiration_date) }}</TableCell>
              <TableCell><StatusBadge :status="item.status" /></TableCell>
              <TableCell class="hidden text-sm whitespace-nowrap text-muted-foreground 2xl:table-cell">{{ formatDateTime(item.updated_at) }}</TableCell>
              <TableCell>
                <div class="flex justify-end gap-1">
                  <Button
                    v-if="item.status === 'novos processos'"
                    variant="ghost"
                    size="icon-sm"
                    class="text-primary"
                    :aria-label="`Iniciar análise de ${item.process_code}`"
                    title="Iniciar análise"
                    :disabled="saving"
                    @click="startAnalysis(item)"
                  >
                    <Play />
                  </Button>
                  <Button variant="ghost" size="icon-sm" :aria-label="`Ver ${item.process_code} no mapa`" title="Ver no mapa" @click="viewOnMap(item)">
                    <MapPin />
                  </Button>
                  <Button variant="ghost" size="icon-sm" :aria-label="`Editar ${item.process_code}`" title="Editar" @click="openEdit(item)">
                    <Pencil />
                  </Button>
                  <Button
                    v-if="auth.canDelete"
                    variant="ghost"
                    size="icon-sm"
                    class="text-destructive hover:bg-danger-soft hover:text-destructive"
                    :aria-label="`Excluir ${item.process_code}`"
                    title="Excluir solicitação e ponto"
                    @click="askDelete(item)"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </template>

      <TablePager
        :offset="(formList.page.value - 1) * formList.pageSize.value"
        :limit="formList.pageSize.value"
        :total="formList.total.value"
        :count="formList.items.value.length"
        :loading="formList.loading.value"
        @change="(direction) => formList.changePage(formList.page.value + direction)"
      >
        <label class="flex items-center gap-2">
          <span class="hidden sm:inline">Por página</span>
          <Select :model-value="String(formList.pageSize.value)" @update:model-value="formList.changePageSize(Number($event))">
            <SelectTrigger size="sm" class="w-20" aria-label="Itens por página"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="size in [25, 50, 100]" :key="size" :value="String(size)">{{ size }}</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </TablePager>
    </div>

    <Dialog :open="dialog" @update:open="dialog = $event">
      <DialogScrollContent class="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar solicitação</DialogTitle>
          <DialogDescription>Ao salvar, o processo é atualizado também no Mapa GIS e no Inventário.</DialogDescription>
        </DialogHeader>

        <form id="application-form" class="grid gap-6" novalidate @submit.prevent="save">
          <Alert v-if="message && messageType !== 'success'" :variant="messageType === 'error' ? 'destructive' : 'default'">
            <CircleAlert />
            <AlertDescription>{{ message }}</AlertDescription>
          </Alert>

          <FormSection title="Responsável">
            <FormField v-slot="{ id, invalid }" label="Empresa responsável" required :error="show(errors.company_responsible)" class="sm:col-span-2">
              <Input :id="id" v-model="form.company_responsible" :aria-invalid="invalid || undefined" />
            </FormField>
            <FormField v-slot="{ id, invalid }" label="CNPJ" :error="show(errors.company_cnpj)">
              <Input :id="id" :model-value="form.company_cnpj ?? ''" placeholder="00.000.000/0000-00" inputmode="numeric" :aria-invalid="invalid || undefined" @update:model-value="form.company_cnpj = String($event)" />
            </FormField>
            <FormField v-slot="{ id, invalid }" label="Inscrição municipal" required :error="show(errors.municipal_registration)">
              <Input :id="id" v-model="form.municipal_registration" :aria-invalid="invalid || undefined" />
            </FormField>
            <FormField v-slot="{ id, invalid }" label="Inscrição imobiliária" required :error="show(errors.property_registration)">
              <Input :id="id" v-model="form.property_registration" :aria-invalid="invalid || undefined" />
            </FormField>
            <FormField v-slot="{ id, invalid }" label="E-mail do requerente" required :error="show(errors.requester_email)">
              <Input :id="id" v-model="form.requester_email" type="email" :aria-invalid="invalid || undefined" />
            </FormField>
          </FormSection>

          <FormSection title="Localização">
            <template #actions>
              <Button type="button" variant="outline" size="sm" :disabled="locating" @click="captureCoordinates">
                <LoaderCircle v-if="locating" class="animate-spin" />
                <Crosshair v-else />
                Usar minha localização
              </Button>
            </template>
            <FormField v-slot="{ id, invalid }" label="Latitude" required :error="show(errors.latitude)">
              <Input :id="id" :model-value="form.latitude" type="number" step="any" :aria-invalid="invalid || undefined" @update:model-value="form.latitude = Number($event)" />
            </FormField>
            <FormField v-slot="{ id, invalid }" label="Longitude" required :error="show(errors.longitude)">
              <Input :id="id" :model-value="form.longitude" type="number" step="any" :aria-invalid="invalid || undefined" @update:model-value="form.longitude = Number($event)" />
            </FormField>
            <FormField v-slot="{ id, invalid }" label="Rua" required :error="show(errors.street)">
              <Input :id="id" v-model="form.street" :aria-invalid="invalid || undefined" />
            </FormField>
            <FormField v-slot="{ id, invalid }" label="Número" required :error="show(errors.number)">
              <Input :id="id" v-model="form.number" :aria-invalid="invalid || undefined" />
            </FormField>
            <FormField v-slot="{ id, invalid }" label="Bairro" required :error="show(errors.district)">
              <Select v-model="form.district">
                <SelectTrigger :id="id" class="w-full" :aria-invalid="invalid || undefined"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent class="max-h-72">
                  <SelectItem v-for="district in DISTRICT_OPTIONS" :key="district" :value="district">{{ district }}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField v-slot="{ id, invalid }" label="CEP" required :error="show(errors.postal_code)">
              <Input :id="id" v-model="form.postal_code" placeholder="00000-000" inputmode="numeric" :aria-invalid="invalid || undefined" />
            </FormField>
          </FormSection>

          <FormSection title="Veículo">
            <FormField v-slot="{ id, invalid }" label="Tipo de veículo" required :error="show(errors.media_type)" class="sm:col-span-2">
              <Select v-model="form.media_type">
                <SelectTrigger :id="id" class="w-full" :aria-invalid="invalid || undefined"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="option in registrationMediaTypeOptions" :key="option.value" :value="option.value">{{ option.title }}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField v-slot="{ id }" label="Quantidade de faces" hint="Opcional">
              <Input :id="id" :model-value="form.number_of_faces ?? ''" @update:model-value="form.number_of_faces = String($event)" />
            </FormField>
            <FormField v-slot="{ id }" label="Vencimento da autorização" hint="Opcional">
              <Input :id="id" :model-value="form.expiration_date ?? ''" type="date" @update:model-value="form.expiration_date = String($event) || null" />
            </FormField>
            <div class="flex gap-3 rounded-md bg-secondary px-4 py-3 text-sm text-foreground sm:col-span-2">
              <Ruler class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <p>
                Raio registrado:
                <strong class="tabular">{{ registeredRadius == null ? 'carregando ou indisponível' : `${registeredRadius} m` }}</strong>.
                <template v-if="currentRadiusAvailable"> Pela regra atual, seria <strong class="tabular">{{ calculatedRadius }} m</strong>.</template>
                <template v-else> A classificação histórica não permite calcular uma prévia segura pela regra atual.</template>
              </p>
            </div>
          </FormSection>

          <div v-if="uploadedAttachments.length" class="grid gap-2">
            <h3 class="font-medium">Documentos enviados pelo formulário público</h3>
            <p class="-mt-1 text-sm text-muted-foreground">Ficam em armazenamento privado; o acesso exige login.</p>
            <ul class="divide-y rounded-md border">
              <li v-for="attachment in uploadedAttachments" :key="attachment.id" class="flex items-center gap-3 px-4 py-2.5">
                <Paperclip class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div class="min-w-0 flex-1">
                  <p class="truncate" :title="attachment.original_filename">{{ attachment.original_filename }}</p>
                  <p class="text-sm text-muted-foreground">{{ attachmentCategoryLabel(attachment.category) }}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" @click="downloadUploadedAttachment(attachment)">
                  <Download />
                  Abrir
                </Button>
              </li>
            </ul>
          </div>

          <AttachmentLinksEditor v-model="attachmentLinks" />
        </form>

        <DialogFooter>
          <Button variant="outline" @click="dialog = false">Cancelar</Button>
          <Button type="submit" form="application-form" :disabled="saving">
            <LoaderCircle v-if="saving" class="animate-spin" />
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogScrollContent>
    </Dialog>

    <AlertDialog :open="Boolean(deleteTarget)" @update:open="!$event && (deleteTarget = null)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir a solicitação {{ deleteTarget?.process_code }}?</AlertDialogTitle>
          <AlertDialogDescription>
            A solicitação de {{ deleteTarget?.company_responsible }} sai do sistema junto com o ponto no mapa e no inventário.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Alert v-if="message && messageType === 'error'" variant="destructive">
          <CircleAlert />
          <AlertDescription>{{ message }}</AlertDescription>
        </Alert>
        <AlertDialogFooter>
          <Button variant="outline" @click="deleteTarget = null">Cancelar</Button>
          <Button variant="destructive" :disabled="saving" @click="confirmDelete">
            <LoaderCircle v-if="saving" class="animate-spin" />
            Excluir solicitação e ponto
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>

<script setup lang="ts">
import {
  CircleAlert,
  CircleCheck,
  Crosshair,
  Download,
  Inbox,
  LoaderCircle,
  MapPin,
  Paperclip,
  Pencil,
  Play,
  Ruler,
  Trash2,
  X,
} from '@lucide/vue';
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import EmptyState from '@/components/common/EmptyState.vue';
import SearchInput from '@/components/common/SearchInput.vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import TablePager from '@/components/common/TablePager.vue';
import AttachmentLinksEditor from '@/components/form/AttachmentLinksEditor.vue';
import FormField from '@/components/form/FormField.vue';
import FormSection from '@/components/form/FormSection.vue';
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
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { api } from '../services/api';
import {
  DISTRICT_OPTIONS,
  getRequiredRadius,
  canPreviewCurrentRadius,
  mediaTypeLabel,
  mediaTypeOptionsFromRules,
} from '../domain/rules';
import { useAuthStore } from '../stores/auth';
import { useApplicationFormList } from '../stores/application-form-list';
import { useMediaStore } from '../stores/media';
import type { ApplicationForm, ApplicationFormAttachment, ApplicationFormInput } from '../types';
import { attachmentCategoryLabel, openApplicationFormAttachment } from '../utils/application-form-attachments';
import { joinAttachmentLinks, parseAttachmentLinks } from '../utils/attachment-links';
import { formatDate, formatDateTime } from '../utils/format';

const router = useRouter();
const auth = useAuthStore();
const media = useMediaStore();
const formList = useApplicationFormList();
const dialog = ref(false);
const editingId = ref<string | null>(null);
const deleteTarget = ref<ApplicationForm | null>(null);
const attempted = ref(false);
const saving = ref(false);
const locating = ref(false);
const message = ref('');
const messageType = ref<'success' | 'error' | 'info'>('success');
const attachmentLinks = ref<string[]>([]);
const uploadedAttachments = ref<ApplicationFormAttachment[]>([]);
const registeredRadius = ref<number | null>(null);
const form = reactive<ApplicationFormInput>(blankForm());

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const blank = (value: unknown) => !String(value ?? '').trim();
const inRange = (value: number, min: number, max: number) => Number(value) >= min && Number(value) <= max;

const errors = computed(() => {
  const cnpjDigits = String(form.company_cnpj ?? '').replace(/\D/g, '');
  return {
    company_responsible: blank(form.company_responsible) ? 'Informe a empresa responsável.' : null,
    company_cnpj: cnpjDigits && cnpjDigits.length !== 14 ? 'O CNPJ deve ter 14 dígitos.' : null,
    municipal_registration: blank(form.municipal_registration) ? 'Informe a inscrição municipal.' : null,
    property_registration: blank(form.property_registration) ? 'Informe a inscrição imobiliária.' : null,
    latitude: inRange(form.latitude, -20.65, -20.30) ? null : 'Latitude fora da área de Campo Grande.',
    longitude: inRange(form.longitude, -54.80, -54.40) ? null : 'Longitude fora da área de Campo Grande.',
    street: blank(form.street) ? 'Informe a rua.' : null,
    number: blank(form.number) ? 'Informe o número.' : null,
    district: blank(form.district) ? 'Selecione o bairro.' : null,
    postal_code: /^\d{5}-?\d{3}$/.test(form.postal_code) ? null : 'Informe um CEP válido.',
    media_type: blank(form.media_type) ? 'Selecione o tipo de veículo.' : null,
    requester_email: blank(form.requester_email)
      ? 'Informe o e-mail.'
      : EMAIL_PATTERN.test(form.requester_email) ? null : 'E-mail inválido.',
  };
});
const formValid = computed(() => Object.values(errors.value).every((message) => !message));

function show(message: string | null) {
  return attempted.value ? message : null;
}

const registrationMediaTypeOptions = computed(() => mediaTypeOptionsFromRules(media.rules));
const calculatedRadius = computed(() => getRequiredRadius(form.media_type, form.area_m2, media.rules, form.area_rule_classification));
const currentRadiusAvailable = computed(() => canPreviewCurrentRadius(form.media_type, form.area_m2, media.rules));
onMounted(() => {
  window.addEventListener('geomidia:forms-refresh', formList.load);
  void formList.load();
});
onUnmounted(() => {
  window.removeEventListener('geomidia:forms-refresh', formList.load);
  formList.dispose();
});

function blankForm(): ApplicationFormInput {
  return {
    company_responsible: '',
    company_cnpj: null,
    municipal_registration: '',
    property_registration: '',
    latitude: -20.464,
    longitude: -54.612,
    street: '',
    number: '',
    district: 'Centro',
    postal_code: '',
    media_type: 'outdoor',
    area_m2: null,
    area_rule_classification: null,
    bottom_height_m: null,
    number_of_faces: null,
    expiration_date: null,
    requester_email: '',
    attachment_links: '',
  };
}

function openEdit(item: ApplicationForm) {
  editingId.value = item.id;
  registeredRadius.value = null;
  void api.getMediaAsset(item.asset_id).then((asset) => {
    if (editingId.value === item.id) registeredRadius.value = asset.radius_meters;
  }).catch(() => {
    if (editingId.value === item.id) showMessage('Não foi possível carregar o raio registrado.', 'error');
  });
  Object.assign(form, {
    company_responsible: item.company_responsible,
    company_cnpj: item.company_cnpj ?? null,
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
    area_rule_classification: item.area_rule_classification,
    bottom_height_m: item.bottom_height_m,
    number_of_faces: item.number_of_faces ?? null,
    expiration_date: item.expiration_date ?? null,
    requester_email: item.requester_email,
    attachment_links: item.attachment_links ?? '',
  });
  resetAttachments(item.attachment_links);
  uploadedAttachments.value = item.attachments ?? [];
  attempted.value = false;
  message.value = '';
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
}

function askDelete(item: ApplicationForm) {
  message.value = '';
  deleteTarget.value = item;
}

async function downloadUploadedAttachment(attachment: ApplicationFormAttachment) {
  if (!editingId.value) return;
  try {
    await openApplicationFormAttachment(editingId.value, attachment.id);
  } catch (caught) {
    showMessage(caught instanceof Error ? caught.message : 'Falha ao abrir o anexo.', 'error');
  }
}

function sanitizeForm(): ApplicationFormInput {
  return {
    ...form,
    company_responsible: form.company_responsible.trim(),
    company_cnpj: String(form.company_cnpj ?? '').replace(/\D/g, '') || null,
    municipal_registration: form.municipal_registration.trim(),
    property_registration: form.property_registration.trim(),
    street: form.street.trim(),
    number: form.number.trim(),
    postal_code: form.postal_code.trim(),
    requester_email: form.requester_email.trim(),
    number_of_faces: form.number_of_faces?.trim() || null,
    expiration_date: form.expiration_date || null,
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    attachment_links: joinAttachmentLinks(attachmentLinks.value) || null,
  };
}

async function save() {
  attempted.value = true;
  if (!formValid.value || !editingId.value) return;
  saving.value = true;
  try {
    const changes = Object.fromEntries(Object.entries(sanitizeForm()).filter(
      ([key]) => !['area_m2', 'bottom_height_m', 'area_rule_classification'].includes(key),
    )) as Partial<ApplicationFormInput>;
    await api.updateApplicationForm(editingId.value, changes);
    showMessage('Solicitação e ponto atualizados com sucesso.', 'success');
    await formList.load();
    dialog.value = false;
  } catch (caught) {
    showMessage(caught instanceof Error ? caught.message : 'Falha ao salvar a solicitação.', 'error');
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
    await formList.load();
    showMessage('Solicitação e ponto removidos do sistema.', 'success');
  } catch (caught) {
    showMessage(caught instanceof Error ? caught.message : 'Falha ao excluir a solicitação.', 'error');
  } finally {
    saving.value = false;
  }
}

async function startAnalysis(item: ApplicationForm) {
  saving.value = true;
  try {
    await media.startAnalysis(item.asset_id);
    await formList.load();
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

function showMessage(text: string, type: 'success' | 'error' | 'info') {
  message.value = text;
  messageType.value = type;
}
</script>
