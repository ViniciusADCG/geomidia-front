<template>
  <section>
    <PageHeader title="Inventário" description="Veículos de comunicação exterior cadastrados, com raio, situação e localização.">
      <template v-if="auth.canWrite" #actions>
        <Button @click="openCreateDialog">
          <Plus />
          Novo cadastro
        </Button>
      </template>
    </PageHeader>

    <div class="overflow-hidden rounded-lg border bg-card">
      <div class="grid gap-2 border-b p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <SearchInput
          :model-value="media.inventorySearchDraft"
          placeholder="Endereço, bairro, processo ou empresa"
          label="Buscar no inventário"
          @update:model-value="media.scheduleInventorySearch($event)"
        />
        <Select :model-value="media.inventoryTypeFilter" @update:model-value="media.changeInventoryType($event as typeof media.inventoryTypeFilter)">
          <SelectTrigger class="w-full" aria-label="Filtrar por tipo"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="option in typeFilterOptions" :key="option.value" :value="option.value">{{ option.title }}</SelectItem>
          </SelectContent>
        </Select>
        <Select :model-value="media.inventoryStatusFilter" @update:model-value="media.changeInventoryStatus($event as typeof media.inventoryStatusFilter)">
          <SelectTrigger class="w-full" aria-label="Filtrar por status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="option in statusFilterOptions" :key="option.value" :value="option.value">{{ option.title }}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div v-if="media.inventoryLoading" class="grid gap-3 p-4" aria-label="Carregando inventário">
        <Skeleton v-for="n in 5" :key="n" class="h-12" />
      </div>
      <EmptyState
        v-else-if="media.inventoryError"
        :icon="CircleAlert"
        title="Não foi possível carregar o inventário"
        :description="media.inventoryError"
      >
        <Button variant="outline" @click="media.refreshInventory()">Tentar novamente</Button>
      </EmptyState>
      <EmptyState
        v-else-if="media.inventoryItems.length === 0"
        :icon="SearchX"
        :title="emptyTitle"
        :description="hasInventoryFilters ? 'Ajuste a busca ou os filtros.' : undefined"
      />

      <template v-else>
        <ul class="divide-y xl:hidden">
          <li v-for="asset in visibleInventoryItems" :key="asset.id" class="px-4 py-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="font-medium">{{ asset.official_process_code || asset.process_code }}</p>
              <StatusBadge :status="asset.status" />
            </div>
            <p class="mt-1">{{ asset.address }}, {{ asset.district }}</p>
            <p class="mt-0.5 text-sm text-muted-foreground">
              {{ mediaTypeLabel(asset.media_type) }}, raio de <span class="tabular">{{ asset.radius_meters }}</span> m
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              <Button v-if="auth.canWrite && asset.status === 'novos processos'" size="sm" :disabled="media.saving" @click="startAnalysis(asset)">
                <Play />
                Iniciar análise
              </Button>
              <Button v-if="auth.canWrite" variant="outline" size="sm" @click="openEditDialog(asset)"><Pencil />Editar</Button>
              <Button v-if="auth.canWrite" variant="outline" size="sm" @click="$emit('view-map', asset.id)"><MapPin />Mapa</Button>
              <Button v-if="auth.canWrite" variant="ghost" size="sm" class="text-destructive hover:bg-danger-soft hover:text-destructive" @click="askDelete(asset)">
                <Trash2 />Excluir
              </Button>
            </div>
          </li>
        </ul>

        <Table class="hidden xl:table">
          <TableHeader>
            <TableRow>
              <TableHead>Processo</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead class="text-right">Raio</TableHead>
              <TableHead class="hidden 2xl:table-cell">Coordenadas</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead class="w-px"><span class="sr-only">Ações</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="asset in visibleInventoryItems" :key="asset.id">
              <TableCell class="whitespace-nowrap">
                <span class="font-medium">{{ asset.official_process_code || asset.process_code }}</span>
                <span v-if="asset.official_process_code" class="block text-sm text-muted-foreground">Origem {{ asset.process_code }}</span>
              </TableCell>
              <TableCell class="min-w-48">
                {{ asset.address }}
                <span class="block text-sm text-muted-foreground">{{ asset.district }}</span>
              </TableCell>
              <TableCell class="min-w-40">{{ mediaTypeLabel(asset.media_type) }}</TableCell>
              <TableCell class="tabular text-right whitespace-nowrap">{{ asset.radius_meters }} m</TableCell>
              <TableCell class="hidden text-sm whitespace-nowrap text-muted-foreground 2xl:table-cell">
                {{ formatCoordinate(asset.latitude) }}, {{ formatCoordinate(asset.longitude) }}
              </TableCell>
              <TableCell class="whitespace-nowrap">{{ formatDate(asset.expiration_date) }}</TableCell>
              <TableCell><StatusBadge :status="asset.status" /></TableCell>
              <TableCell>
                <div class="flex justify-end gap-1">
                  <Button
                    v-if="auth.canWrite && asset.status === 'novos processos'"
                    variant="ghost"
                    size="icon-sm"
                    class="text-primary"
                    :aria-label="`Iniciar análise de ${asset.process_code}`"
                    title="Iniciar análise"
                    :disabled="media.saving"
                    @click="startAnalysis(asset)"
                  >
                    <Play />
                  </Button>
                  <Button v-if="auth.canWrite" variant="ghost" size="icon-sm" :aria-label="`Ver ${asset.process_code} no mapa`" title="Ver no mapa" @click="$emit('view-map', asset.id)">
                    <MapPin />
                  </Button>
                  <Button v-if="auth.canWrite" variant="ghost" size="icon-sm" :aria-label="`Editar ${asset.process_code}`" title="Editar" @click="openEditDialog(asset)">
                    <Pencil />
                  </Button>
                  <Button
                    v-if="auth.canWrite"
                    variant="ghost"
                    size="icon-sm"
                    class="text-destructive hover:bg-danger-soft hover:text-destructive"
                    :aria-label="`Excluir ${asset.process_code}`"
                    title="Excluir"
                    @click="askDelete(asset)"
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
        v-if="!media.inventoryError"
        :offset="(media.inventoryPage - 1) * media.inventoryPageSize"
        :limit="media.inventoryPageSize"
        :total="media.inventoryLoading ? 0 : media.inventoryTotal"
        :count="media.inventoryItems.length"
        :loading="media.inventoryLoading"
        @change="(direction) => media.changeInventoryPage(media.inventoryPage + direction)"
      >
        <label class="flex items-center gap-2">
          <span class="hidden sm:inline">Por página</span>
          <Select :model-value="String(media.inventoryPageSize)" @update:model-value="media.changeInventoryPageSize(Number($event))">
            <SelectTrigger size="sm" class="w-20" aria-label="Itens por página"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="size in [25, 50, 100]" :key="size" :value="String(size)">{{ size }}</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </TablePager>
    </div>

    <AssetFormDialog v-model:open="dialog" :asset="editingAsset" />

    <AlertDialog v-if="auth.canWrite" :open="Boolean(deleteTarget)" @update:open="!$event && (deleteTarget = null)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir o processo {{ deleteTarget?.process_code }}?</AlertDialogTitle>
          <AlertDialogDescription>O veículo sai do inventário e do mapa. Essa ação não pode ser desfeita.</AlertDialogDescription>
        </AlertDialogHeader>
        <Alert v-if="media.error" variant="destructive">
          <CircleAlert />
          <AlertDescription>{{ media.error }}</AlertDescription>
        </Alert>
        <AlertDialogFooter>
          <Button variant="outline" @click="deleteTarget = null">Cancelar</Button>
          <Button variant="destructive" :disabled="media.saving" @click="confirmDelete">
            <LoaderCircle v-if="media.saving" class="animate-spin" />
            Excluir processo
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>

<script setup lang="ts">
import { CircleAlert, LoaderCircle, MapPin, Pencil, Play, Plus, SearchX, Trash2 } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';

import EmptyState from '@/components/common/EmptyState.vue';
import SearchInput from '@/components/common/SearchInput.vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import TablePager from '@/components/common/TablePager.vue';
import AssetFormDialog from '@/components/inventory/AssetFormDialog.vue';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { MEDIA_TYPE_OPTIONS, STATUS_OPTIONS, mediaTypeLabel } from '../domain/rules';
import { useAuthStore } from '../stores/auth';
import { useMediaStore } from '../stores/media';
import type { MediaAsset } from '../types';
import { formatCoordinate, formatDate } from '../utils/format';

defineEmits<{ 'view-map': [id: string] }>();

const media = useMediaStore();
const auth = useAuthStore();
const dialog = ref(false);
const editingAsset = ref<MediaAsset | null>(null);
const deleteTarget = ref<MediaAsset | null>(null);
const visibleInventoryItems = computed(() => media.inventoryLoading || media.inventoryError ? [] : media.inventoryItems);
const hasInventoryFilters = computed(() => Boolean(media.inventorySearch || media.inventorySearchDraft.trim()
  || media.inventoryTypeFilter !== 'all' || media.inventoryStatusFilter !== 'all'));
const emptyTitle = computed(() => {
  if (!media.inventoryLoaded) return 'Carregando inventário';
  if (media.inventoryTotal === 0 && !hasInventoryFilters.value) return 'Nenhum veículo cadastrado';
  if (media.inventoryTotal === 0) return 'Nenhum resultado para a busca e os filtros atuais';
  return 'Esta página está vazia. Atualize o inventário.';
});
onMounted(() => { void media.refreshInventory(); });

const typeFilterOptions = computed(() => [
  { title: 'Todos os tipos', value: 'all' },
  ...MEDIA_TYPE_OPTIONS,
]);

const statusFilterOptions = computed(() => [
  { title: 'Todos os status', value: 'all' },
  ...STATUS_OPTIONS,
]);

function openCreateDialog() {
  editingAsset.value = null;
  dialog.value = true;
}

function openEditDialog(asset: MediaAsset) {
  editingAsset.value = asset;
  dialog.value = true;
}

function askDelete(asset: MediaAsset) {
  media.error = null;
  deleteTarget.value = asset;
}

async function startAnalysis(asset: MediaAsset) {
  try {
    await media.runInventoryMutation(() => media.startAnalysis(asset.id));
  } catch {
    // O store publica o erro no alerta global.
  }
}

async function confirmDelete() {
  if (!auth.canWrite || !deleteTarget.value) return;
  try {
    const assetId = deleteTarget.value.id;
    await media.runInventoryMutation(() => media.deleteAsset(assetId));
    deleteTarget.value = null;
  } catch {
    // O store publica o erro no alerta global.
  }
}
</script>
