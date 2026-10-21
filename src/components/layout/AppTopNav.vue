<template>
  <nav ref="navElement" class="relative flex min-w-0 items-stretch gap-0.5 overflow-x-auto" aria-label="Navegação principal">
    <template v-for="group in groups" :key="group.label ?? 'main'">
      <template v-if="!group.label">
        <RouterLink
          v-for="item in group.items"
          :key="item.name"
          :to="item.to"
          :aria-current="activeName === item.name ? 'page' : undefined"
          :data-active="activeName === item.name || undefined"
          :class="linkClass(activeName === item.name)"
        >
          <component :is="item.icon" class="size-4 shrink-0" aria-hidden="true" />
          {{ item.title }}
        </RouterLink>
      </template>

      <DropdownMenu
        v-else
        :open="openGroup === group.label"
        :modal="false"
        @update:open="(open) => onOpenChange(group.label!, open)"
      >
        <DropdownMenuTrigger as-child>
          <button
            type="button"
            :data-active="isActiveGroup(group) || undefined"
            :class="linkClass(isActiveGroup(group))"
            @pointerenter="(event) => hoverIn(group.label!, event)"
            @pointerleave="hoverOut"
          >
            {{ group.label }}
            <ChevronDown class="size-4 opacity-70" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-64" @pointerenter="cancelClose" @pointerleave="hoverOut">
          <DropdownMenuItem v-for="item in group.items" :key="item.name" as-child>
            <RouterLink :to="item.to" :aria-current="activeName === item.name ? 'page' : undefined" class="gap-2.5 py-2 text-base">
              <component :is="item.icon" class="size-4" aria-hidden="true" />
              {{ item.title }}
            </RouterLink>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </template>

    <!-- Traço amarelo da aba atual: desliza de uma aba para a outra. -->
    <span
      v-show="indicator.width > 0"
      :class="cn(
        'brand-slant pointer-events-none absolute bottom-0 left-0 h-[3px] bg-brand-yellow',
        indicator.animate && 'transition-[translate,width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none',
      )"
      :style="{ width: `${indicator.width}px`, translate: `${indicator.left}px 0` }"
      aria-hidden="true"
    />
  </nav>
</template>

<script setup lang="ts">
import { ChevronDown } from '@lucide/vue';
import { useResizeObserver } from '@vueuse/core';
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import { navGroups, type NavGroup } from '@/components/layout/nav-items';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Abas abaixo da faixa institucional: os itens principais à mostra e os grupos em menus suspensos.
// A aba atual leva o traço amarelo inclinado, que desliza ao trocar de página.
const props = defineProps<{
  activeName: string | symbol | null | undefined;
  canWrite: boolean;
  isAdmin: boolean;
}>();

const navElement = ref<HTMLElement | null>(null);
const indicator = reactive({ left: 0, width: 0, animate: false });

const groups = computed(() => navGroups(props.canWrite, props.isAdmin));

// Os grupos abrem ao passar o mouse, sem clicar. Um pequeno atraso ao sair deixa atravessar o vão
// entre a aba e o menu. Clique e teclado continuam funcionando; no toque, só o clique abre.
const openGroup = ref<string | null>(null);
const hoveredTrigger = ref<string | null>(null);
let closeTimer = 0;

function cancelClose() {
  window.clearTimeout(closeTimer);
}

function hoverIn(label: string, event: PointerEvent) {
  if (event.pointerType !== 'mouse') return;
  cancelClose();
  hoveredTrigger.value = label;
  openGroup.value = label;
}

function hoverOut(event: PointerEvent) {
  if (event.pointerType !== 'mouse') return;
  hoveredTrigger.value = null;
  cancelClose();
  closeTimer = window.setTimeout(() => { openGroup.value = null; }, 150);
}

// Um clique na aba com o menu já aberto pelo mouse não o fecha.
function onOpenChange(label: string, open: boolean) {
  if (open) openGroup.value = label;
  else if (hoveredTrigger.value !== label && openGroup.value === label) openGroup.value = null;
}

function isActiveGroup(group: NavGroup) {
  return group.items.some((item) => item.name === props.activeName);
}

// O traço fica 12px para dentro de cada lado da aba, como o sublinhado do título.
function placeIndicator(animate: boolean) {
  const active = navElement.value?.querySelector<HTMLElement>('[data-active]');
  indicator.animate = animate;
  if (!active) {
    indicator.width = 0;
    return;
  }
  indicator.left = active.offsetLeft + 12;
  indicator.width = active.offsetWidth - 24;
}

onMounted(() => placeIndicator(false));
watch(() => props.activeName, async () => {
  await nextTick();
  placeIndicator(true);
});
useResizeObserver(navElement, () => placeIndicator(false));

function linkClass(active: boolean) {
  return cn(
    'relative flex items-center gap-2 px-3 text-[0.9375rem] whitespace-nowrap transition-colors outline-none',
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
    active ? 'font-medium text-primary' : 'text-muted-foreground hover:text-foreground',
  );
}
</script>
