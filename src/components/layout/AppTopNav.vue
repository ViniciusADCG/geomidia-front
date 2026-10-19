<template>
  <nav class="flex min-w-0 items-stretch gap-0.5 overflow-x-auto" aria-label="Navegação principal">
    <template v-for="group in groups" :key="group.label ?? 'main'">
      <template v-if="!group.label">
        <RouterLink
          v-for="item in group.items"
          :key="item.name"
          :to="item.to"
          :aria-current="activeName === item.name ? 'page' : undefined"
          :class="linkClass(activeName === item.name)"
        >
          <component :is="item.icon" class="size-4 shrink-0" aria-hidden="true" />
          {{ item.title }}
          <span v-if="activeName === item.name" :class="UNDERLINE" aria-hidden="true" />
        </RouterLink>
      </template>

      <DropdownMenu v-else>
        <DropdownMenuTrigger as-child>
          <button type="button" :class="linkClass(isActiveGroup(group))">
            {{ group.label }}
            <ChevronDown class="size-4 opacity-70" aria-hidden="true" />
            <span v-if="isActiveGroup(group)" :class="UNDERLINE" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-64">
          <DropdownMenuItem v-for="item in group.items" :key="item.name" as-child>
            <RouterLink :to="item.to" :aria-current="activeName === item.name ? 'page' : undefined" class="gap-2.5 py-2 text-base">
              <component :is="item.icon" class="size-4" aria-hidden="true" />
              {{ item.title }}
            </RouterLink>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { ChevronDown } from '@lucide/vue';
import { computed } from 'vue';
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
// A aba atual leva o traço amarelo inclinado.
const props = defineProps<{
  activeName: string | symbol | null | undefined;
  canWrite: boolean;
  isAdmin: boolean;
}>();

const UNDERLINE = 'brand-slant absolute right-3 bottom-0 left-3 h-[3px] bg-brand-yellow';

const groups = computed(() => navGroups(props.canWrite, props.isAdmin));

function isActiveGroup(group: NavGroup) {
  return group.items.some((item) => item.name === props.activeName);
}

function linkClass(active: boolean) {
  return cn(
    'relative flex items-center gap-2 px-3 text-[0.9375rem] whitespace-nowrap transition-colors outline-none',
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
    active ? 'font-medium text-primary' : 'text-muted-foreground hover:text-foreground',
  );
}
</script>
