<template>
  <section class="overflow-hidden rounded-lg border bg-card" :aria-labelledby="titleId">
    <div class="flex items-start justify-between gap-4 p-5">
      <div>
        <h2 :id="titleId" class="font-semibold">{{ title }}</h2>
        <p class="mt-0.5 text-sm text-muted-foreground">{{ subtitle }}</p>
      </div>
      <ToneBadge :tone="mode === 'expired' ? 'error' : 'warning'" class="tabular">{{ items.length }}</ToneBadge>
    </div>

    <EmptyState
      v-if="items.length === 0"
      :icon="CalendarCheck"
      class="border-t"
      :title="mode === 'expired' ? 'Nenhuma autorização vencida' : 'Nada vence nos próximos 90 dias'"
    />

    <ul v-else class="divide-y border-t md:hidden">
      <li v-for="asset in items" :key="asset.id" class="flex items-start gap-3 px-5 py-4">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-baseline justify-between gap-x-3">
            <p class="font-medium">{{ asset.process_code }}</p>
            <p :class="['text-sm font-medium', mode === 'expired' ? 'text-destructive' : 'text-warning']">{{ deadlineLabel(asset) }}</p>
          </div>
          <p class="mt-1">{{ asset.address }}, {{ asset.district }}</p>
          <p class="mt-0.5 text-sm text-muted-foreground">{{ mediaTypeLabel(asset.media_type) }}</p>
          <div class="mt-2 flex items-center gap-3">
            <StatusBadge :status="asset.status" />
            <span class="text-sm text-muted-foreground">Vencimento {{ formatDate(asset.expiration_date) }}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          :aria-label="`Ver ${asset.process_code} no mapa`"
          @click="$emit('view-map', asset)"
        >
          <MapPin />
        </Button>
      </li>
    </ul>

    <Table v-if="items.length" class="hidden border-t md:table">
      <TableHeader>
        <TableRow>
          <TableHead>Processo</TableHead>
          <TableHead>Local</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Vencimento</TableHead>
          <TableHead>Prazo</TableHead>
          <TableHead class="w-px"><span class="sr-only">Ações</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="asset in items" :key="asset.id">
          <TableCell class="font-medium whitespace-nowrap">{{ asset.process_code }}</TableCell>
          <TableCell class="min-w-48">
            {{ asset.address }}
            <span class="block text-sm text-muted-foreground">{{ asset.district }}</span>
          </TableCell>
          <TableCell class="min-w-40">{{ mediaTypeLabel(asset.media_type) }}</TableCell>
          <TableCell><StatusBadge :status="asset.status" /></TableCell>
          <TableCell class="whitespace-nowrap">{{ formatDate(asset.expiration_date) }}</TableCell>
          <TableCell :class="['whitespace-nowrap font-medium', mode === 'expired' ? 'text-destructive' : 'text-warning']">
            {{ deadlineLabel(asset) }}
          </TableCell>
          <TableCell>
            <Button
              variant="ghost"
              size="icon-sm"
              :aria-label="`Ver ${asset.process_code} no mapa`"
              title="Ver no mapa"
              @click="$emit('view-map', asset)"
            >
              <MapPin />
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </section>
</template>

<script setup lang="ts">
import { CalendarCheck, MapPin } from '@lucide/vue';
import { useId } from 'vue';

import EmptyState from '@/components/common/EmptyState.vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import ToneBadge from '@/components/common/ToneBadge.vue';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mediaTypeLabel } from '@/domain/rules';
import type { MediaAsset } from '@/types';
import { calendarDayDifference, formatDate } from '@/utils/format';

const props = defineProps<{
  title: string;
  subtitle: string;
  items: MediaAsset[];
  referenceDate: string;
  mode: 'upcoming' | 'expired';
}>();

defineEmits<{ 'view-map': [asset: MediaAsset] }>();

const titleId = useId();

function deadlineLabel(asset: MediaAsset): string {
  const days = calendarDayDifference(props.referenceDate, asset.expiration_date!);
  if (props.mode === 'expired') {
    const overdueDays = Math.abs(days);
    return overdueDays === 1 ? 'Vencido há 1 dia' : `Vencido há ${overdueDays} dias`;
  }
  if (days === 0) return 'Vence hoje';
  if (days === 1) return 'Vence amanhã';
  return `Vence em ${days} dias`;
}
</script>
