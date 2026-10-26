<script setup lang="ts">
import { Check, ChevronDown } from '@lucide/vue';
import { DropdownMenuCheckboxItem, DropdownMenuItemIndicator } from 'reka-ui';
import { computed } from 'vue';

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MEDIA_TYPE_OPTIONS, mediaTypeLabel } from '@/domain/rules';
import type { MediaType } from '@/types';

defineOptions({ inheritAttrs: false });

const model = defineModel<MediaType[]>({ required: true });
const label = computed(() => model.value.length === 0
  ? 'Todos os tipos'
  : model.value.length === 1 ? mediaTypeLabel(model.value[0]) : `${model.value.length} tipos selecionados`);

function toggle(type: MediaType, checked: boolean | 'indeterminate') {
  model.value = checked === true
    ? MEDIA_TYPE_OPTIONS.filter((option) => option.value === type || model.value.includes(option.value)).map((option) => option.value)
    : model.value.filter((value) => value !== type);
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
        v-bind="$attrs"
        type="button"
        class="flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        :aria-label="`Filtrar por tipo: ${label}`"
        :title="label"
      >
        <span class="truncate">{{ label }}</span>
        <ChevronDown class="size-4 shrink-0 text-muted-foreground opacity-50" aria-hidden="true" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-max min-w-(--reka-dropdown-menu-trigger-width) max-w-[calc(100vw-2rem)]" aria-label="Tipos de veículo">
      <DropdownMenuItem :disabled="model.length === 0" @select.prevent="model = []">
        Limpar seleção
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuCheckboxItem
        v-for="option in MEDIA_TYPE_OPTIONS"
        :key="option.value"
        :model-value="model.includes(option.value)"
        class="relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground"
        @select.prevent
        @update:model-value="toggle(option.value, $event)"
      >
        <span
          class="flex size-4 shrink-0 items-center justify-center rounded-sm border border-input"
          :class="model.includes(option.value) ? 'border-primary bg-primary text-primary-foreground' : 'bg-card'"
          aria-hidden="true"
        >
          <DropdownMenuItemIndicator><Check class="size-3.5" /></DropdownMenuItemIndicator>
        </span>
        {{ option.title }}
      </DropdownMenuCheckboxItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
