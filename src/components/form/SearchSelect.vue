<template>
  <PopoverRoot v-model:open="open">
    <!-- Botão próprio (âncora) para manter o id do rótulo do campo; o PopoverTrigger troca o id. -->
    <PopoverAnchor as-child>
      <button
        :id="id"
        ref="trigger"
        type="button"
        aria-haspopup="listbox"
        :aria-expanded="open"
        :aria-invalid="invalid || undefined"
        :data-placeholder="selectedTitle ? undefined : ''"
        class="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-2 text-base whitespace-nowrap shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[placeholder]:text-muted-foreground"
        @click="open = !open"
      >
        <span class="truncate">{{ selectedTitle || 'Selecione' }}</span>
        <ChevronDown :class="cn('size-4 shrink-0 opacity-50 transition-transform', open && 'rotate-180')" aria-hidden="true" />
      </button>
    </PopoverAnchor>

    <PopoverPortal>
      <PopoverContent
        data-slot="select-content"
        side="bottom"
        align="start"
        :side-offset="4"
        :side-flip="false"
        :collision-padding="8"
        class="z-50 flex max-h-[min(20rem,var(--reka-popper-available-height))] w-(--reka-popper-anchor-width) min-w-64 flex-col overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md outline-none"
        @open-auto-focus.prevent="focusList"
        @interact-outside="(event) => { if (trigger?.contains(event.target as Node)) event.preventDefault(); }"
      >
        <ListboxRoot v-model="model" class="flex min-h-0 flex-1 flex-col" :aria-label="listLabel">
          <div class="relative border-b">
            <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <ListboxFilter
              ref="filter"
              v-model="search"
              :placeholder="searchLabel"
              :aria-label="searchLabel"
              class="h-10 w-full bg-transparent pr-3 pl-9 text-base outline-none placeholder:text-muted-foreground"
            />
          </div>

          <ListboxContent ref="list" class="min-h-0 flex-1 overflow-y-auto p-1 outline-none">
            <p v-if="!filtered.length" class="px-2 py-6 text-center text-sm text-muted-foreground">
              Nada encontrado com “{{ search }}”.
            </p>
            <ListboxItem
              v-for="option in filtered"
              :key="option.value"
              :value="option.value"
              class="relative flex w-full cursor-default items-center gap-2 rounded-sm p-2 text-base outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground [&_svg]:text-muted-foreground"
            >
              {{ option.title }}
              <ListboxItemIndicator class="ml-auto"><Check class="size-4" /></ListboxItemIndicator>
            </ListboxItem>
          </ListboxContent>
        </ListboxRoot>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<script setup lang="ts">
import { Check, ChevronDown, Search } from '@lucide/vue';
import {
  ListboxContent,
  ListboxFilter,
  ListboxItem,
  ListboxItemIndicator,
  ListboxRoot,
  PopoverAnchor,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
} from 'reka-ui';
import { computed, nextTick, ref, watch, type ComponentPublicInstance, type Ref } from 'vue';

import { cn } from '@/lib/utils';

// Lista com busca que abre sempre embaixo do campo. Se não houver espaço, o painel em volta rola
// antes para abrir lugar. Aceita textos simples ou opções { value, title }.
type Option = string | { value: string; title: string };

const props = defineProps<{
  options: readonly Option[];
  searchLabel: string;
  listLabel: string;
  id?: string;
  invalid?: boolean;
}>();
const model = defineModel<string | null | undefined>();

const ROOM = 320;

const open = ref(false);
const search = ref('');
const trigger = ref<HTMLButtonElement | null>(null);
const list = ref<ComponentPublicInstance | null>(null);
const filter = ref<ComponentPublicInstance | null>(null);

const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const normalized = computed(() => props.options.map((option) => (typeof option === 'string' ? { value: option, title: option } : option)));
const selectedTitle = computed(() => normalized.value.find((option) => option.value === model.value)?.title ?? model.value);
const filtered = computed(() => {
  const term = plain(search.value.trim());
  return term ? normalized.value.filter((option) => plain(option.title).includes(term)) : normalized.value;
});

const el = (instance: Ref<ComponentPublicInstance | null>) => instance.value?.$el as HTMLElement | undefined;

watch(model, () => { open.value = false; });
watch(open, (isOpen) => {
  if (!isOpen) return;
  search.value = '';
  makeRoomBelow();
});

// Rola o contêiner do campo (ou a página) para caber a lista embaixo.
function makeRoomBelow() {
  const button = trigger.value;
  if (!button) return;
  let parent = button.parentElement;
  while (parent && !(/(auto|scroll)/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight)) {
    parent = parent.parentElement;
  }
  const limit = Math.min(window.innerHeight, parent ? parent.getBoundingClientRect().bottom : window.innerHeight);
  const missing = button.getBoundingClientRect().bottom + ROOM - limit;
  if (missing <= 0) return;
  (parent ?? window).scrollBy({ top: missing, behavior: 'smooth' });
}

async function focusList() {
  // Espera a lista ser desenhada no painel para levar a opção escolhida ao meio.
  await nextTick();
  await new Promise(requestAnimationFrame);
  const box = el(list);
  const selected = box?.querySelector<HTMLElement>('[data-state="checked"]');
  if (box && selected) {
    const offset = selected.getBoundingClientRect().top - box.getBoundingClientRect().top;
    box.scrollTop += offset - (box.clientHeight - selected.offsetHeight) / 2;
  }
  el(filter)?.focus();
}
</script>
