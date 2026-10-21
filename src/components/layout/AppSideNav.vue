<template>
  <!-- No fluxo da página ocupa só o trilho; aberto, o painel cresce por cima do conteúdo. -->
  <div class="side-nav relative w-16 shrink-0" data-welcome-nav>
    <nav
      :class="cn(
        'sticky top-[var(--band-h)] flex h-[calc(100dvh-var(--band-h))] flex-col overflow-hidden border-r bg-card transition-[width,box-shadow] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none',
        open ? 'w-46 shadow-xl' : 'w-16',
      )"
      aria-label="Navegação principal"
      @pointerenter="onEnter"
      @pointerleave="onLeave"
      @focusin="open = true"
      @focusout="onFocusOut"
    >
      <div class="flex-1 overflow-x-hidden overflow-y-auto px-2 py-3">
        <template v-for="(group, index) in groups" :key="group.label ?? 'main'">
          <div v-if="index > 0" class="my-2 h-6 px-3">
            <p v-if="open && group.label" class="pt-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground">{{ group.label }}</p>
            <span v-else class="mt-3 block h-px bg-border" aria-hidden="true" />
          </div>
          <ul class="grid gap-0.5">
            <li v-for="item in group.items" :key="item.name">
              <RouterLink
                :to="item.to"
                :aria-current="activeName === item.name ? 'page' : undefined"
                :aria-label="open ? undefined : item.title"
                :title="open ? item.title : undefined"
                :class="cn(
                  'relative flex h-10 items-center gap-3 rounded-md px-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  activeName === item.name
                    ? 'bg-primary/8 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )"
                @click="open = false"
              >
                <span v-if="activeName === item.name" class="brand-slant absolute top-2 bottom-2 left-0 w-[3px] bg-brand-yellow" aria-hidden="true" />
                <component :is="item.icon" class="size-[18px] shrink-0" aria-hidden="true" />
                <span v-if="open" class="truncate text-sm whitespace-nowrap">{{ shortTitle(item.title) }}</span>
              </RouterLink>
            </li>
          </ul>
        </template>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';

import { navGroups } from '@/components/layout/nav-items';
import { cn } from '@/lib/utils';

// Menu lateral do computador ("Desliza"): um trilho fino de ícones que, ao passar o mouse ou com o
// foco do teclado, abre por cima da página com os nomes e os grupos, sem empurrar o conteúdo.
const props = defineProps<{
  activeName: string | symbol | null | undefined;
  canWrite: boolean;
  isAdmin: boolean;
}>();

const groups = computed(() => navGroups(props.canWrite, props.isAdmin));
const open = ref(false);

// Nomes curtos para o menu caber estreito; o nome do grupo aparece acima deles.
const SHORT: Record<string, string> = {
  'Solicitações recebidas': 'Solicitações',
  'Comunicados de exigência': 'Exigências',
  'Regras de negócio': 'Regras',
};
function shortTitle(title: string) {
  return SHORT[title] ?? title;
}

// Um pequeno atraso evita abrir quando o mouse só cruza o menu a caminho de outro lugar.
let timer = 0;
function onEnter(event: PointerEvent) {
  if (event.pointerType !== 'mouse') return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => { open.value = true; }, 120);
}
function onLeave(event: PointerEvent) {
  if (event.pointerType !== 'mouse') return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => { open.value = false; }, 200);
}
function onFocusOut(event: FocusEvent) {
  const next = event.relatedTarget as Node | null;
  if (!next || !(event.currentTarget as HTMLElement).contains(next)) open.value = false;
}
</script>

<style scoped>
/* O painel aberto fica por cima do conteúdo da página. */
.side-nav {
  z-index: 30;
}
</style>
