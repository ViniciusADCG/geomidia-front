<template>
  <div class="grid gap-5">
    <div
      v-if="asset.status === 'novos processos'"
      class="flex gap-3 rounded-md bg-sky-100 px-4 py-3 text-sm text-sky-900"
    >
      <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>Processo novo. Inicie a análise para calcular conflitos e liberar as demais situações.</p>
    </div>
    <div
      v-else
      :class="cn(
        'flex gap-3 rounded-md px-4 py-3 text-sm',
        analyzing ? 'bg-muted text-foreground' : analysis?.has_conflict ? 'bg-danger-soft text-destructive' : 'bg-success-soft text-success',
      )"
      role="status"
    >
      <LoaderCircle v-if="analyzing" class="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden="true" />
      <TriangleAlert v-else-if="analysis?.has_conflict" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <CircleCheck v-else class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div class="min-w-0">
        <p>{{ analyzing ? 'Analisando viabilidade territorial...' : (analysis?.message ?? 'Análise indisponível.') }}</p>
        <ul v-if="!analyzing && analysis?.conflicts.length" class="mt-2 grid gap-1 text-foreground">
          <li v-for="conflict in analysis.conflicts" :key="conflict.conflicting_asset_id" class="flex flex-wrap justify-between gap-x-3">
            <span class="font-medium">{{ conflict.process_code }}</span>
            <span class="tabular text-muted-foreground">{{ Math.round(conflict.distance_meters) }} m (mínimo {{ conflict.minimum_distance_meters }} m)</span>
          </li>
        </ul>
      </div>
    </div>

    <DetailSection title="Processo">
      <DetailItem :label="asset.official_process_code ? 'Processo oficial' : 'Protocolo'">{{ asset.official_process_code || asset.process_code }}</DetailItem>
      <DetailItem v-if="asset.official_process_code" label="Protocolo de origem">{{ asset.process_code }}</DetailItem>
      <DetailItem label="Criado em">{{ formatDateTime(asset.created_at) }}</DetailItem>
      <DetailItem label="Atualizado em">{{ formatDateTime(asset.updated_at) }}</DetailItem>
      <DetailItem v-if="asset.justification" label="Justificativa ou análise" wide>{{ asset.justification }}</DetailItem>
    </DetailSection>

    <DetailSection v-if="form || asset.company_responsible || asset.contact_name || asset.contact_email" title="Requerente">
      <DetailItem v-if="form?.company_responsible || asset.company_responsible || asset.contact_name" label="Empresa ou responsável" wide>
        {{ form?.company_responsible || asset.company_responsible || asset.contact_name }}
      </DetailItem>
      <DetailItem v-if="asset.contact_name && asset.contact_name !== (form?.company_responsible || asset.company_responsible)" label="Contato">
        {{ asset.contact_name }}
      </DetailItem>
      <DetailItem v-if="form?.company_cnpj || asset.company_cnpj" label="CNPJ">{{ formatCompanyCnpj(form?.company_cnpj || asset.company_cnpj) }}</DetailItem>
      <DetailItem v-if="form?.municipal_registration" label="Inscrição municipal">{{ form.municipal_registration }}</DetailItem>
      <DetailItem v-if="form?.requester_email || asset.contact_email" label="E-mail" wide>
        <span class="break-all">{{ form?.requester_email || asset.contact_email }}</span>
      </DetailItem>
    </DetailSection>

    <DetailSection title="Local de instalação">
      <DetailItem label="Endereço" wide>{{ form ? `${form.street}, ${form.number}` : asset.address }}</DetailItem>
      <DetailItem label="Bairro">{{ form?.district || asset.district }}</DetailItem>
      <DetailItem v-if="form?.postal_code" label="CEP">{{ form.postal_code }}</DetailItem>
      <DetailItem v-if="form?.property_registration" label="Inscrição imobiliária">{{ form.property_registration }}</DetailItem>
      <DetailItem label="Coordenadas" wide>
        <span class="tabular">{{ asset.latitude.toFixed(6) }}, {{ asset.longitude.toFixed(6) }}</span>
      </DetailItem>
    </DetailSection>

    <DetailSection title="Veículo">
      <DetailItem label="Tipo" wide>{{ mediaTypeLabel(asset.media_type) }}</DetailItem>
      <DetailItem label="Raio"><span class="tabular">{{ asset.radius_meters }} m</span></DetailItem>
      <DetailItem v-if="asset.expiration_date" label="Vencimento">{{ formatDate(asset.expiration_date) }}</DetailItem>
      <DetailItem v-if="asset.width_m != null" label="Largura"><span class="tabular">{{ asset.width_m }} m</span></DetailItem>
      <DetailItem v-if="asset.top_height_m != null" label="Borda superior"><span class="tabular">{{ asset.top_height_m }} m</span></DetailItem>
      <DetailItem v-if="form?.number_of_faces" label="Faces">{{ form.number_of_faces }}</DetailItem>
    </DetailSection>

    <section v-if="attachments.length || links.length" class="grid gap-2">
      <h3 class="text-sm font-semibold">Anexos</h3>
      <ul class="divide-y rounded-md border">
        <li v-for="attachment in attachments" :key="attachment.id" class="flex items-center gap-3 px-3 py-2">
          <component :is="attachment.content_type.startsWith('image/') ? ImageIcon : FileText" class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm" :title="attachment.original_filename">{{ attachment.original_filename }}</p>
            <p class="text-xs text-muted-foreground">{{ attachmentCategoryLabel(attachment.category) }}</p>
          </div>
          <Button variant="ghost" size="sm" @click="emit('open-attachment', attachment)">Abrir</Button>
        </li>
        <li v-for="(link, index) in links" :key="`${link}-${index}`" class="flex items-center gap-3 px-3 py-2">
          <Link2 class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <a :href="link" target="_blank" rel="noopener noreferrer" class="min-w-0 flex-1 truncate text-sm text-primary underline-offset-4 hover:underline">
            {{ link }}
          </a>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { CircleCheck, FileText, Image as ImageIcon, Info, Link2, LoaderCircle, TriangleAlert } from '@lucide/vue';
import { computed } from 'vue';

import DetailItem from '@/components/map/DetailItem.vue';
import DetailSection from '@/components/map/DetailSection.vue';
import { Button } from '@/components/ui/button';
import { mediaTypeLabel } from '@/domain/rules';
import { cn } from '@/lib/utils';
import type { ApplicationForm, ApplicationFormAttachment, ConflictAnalysis, MediaAsset } from '@/types';
import { attachmentCategoryLabel } from '@/utils/application-form-attachments';
import { parseAttachmentLinks } from '@/utils/attachment-links';
import { formatDate, formatDateTime } from '@/utils/format';

const props = defineProps<{
  asset: MediaAsset;
  form: ApplicationForm | null;
  analysis: ConflictAnalysis | null | undefined;
  analyzing: boolean;
}>();

const emit = defineEmits<{ 'open-attachment': [attachment: ApplicationFormAttachment] }>();

// Documentos primeiro, imagens depois, como na versão anterior.
const attachments = computed(() => {
  const items = props.form?.attachments ?? [];
  return [
    ...items.filter((item) => !item.content_type.startsWith('image/')),
    ...items.filter((item) => item.content_type.startsWith('image/')),
  ];
});

const links = computed(() => [...new Set([
  ...parseAttachmentLinks(props.form?.attachment_links),
  ...parseAttachmentLinks(props.asset.attachment_links),
])].filter((link) => /^https?:\/\//i.test(link)));

function formatCompanyCnpj(value: string | null | undefined): string {
  const raw = String(value ?? '').trim();
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 14) return raw || 'nao informado';
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}
</script>
