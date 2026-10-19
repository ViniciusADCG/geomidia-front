<template>
  <nav class="flex h-full flex-col bg-sidebar text-sidebar-foreground" aria-label="Navegação principal">
    <div class="border-b border-sidebar-border px-5 py-5" data-welcome-target>
      <GeoMidiaLockup tone="onDark" subtitle="Campo Grande, MS" />
    </div>

    <div class="flex-1 overflow-y-auto px-3 py-4">
      <template v-for="group in groups" :key="group.label ?? 'main'">
        <p v-if="group.label" class="mt-5 mb-1.5 px-3 text-xs font-medium text-sidebar-muted">{{ group.label }}</p>
        <ul class="space-y-0.5">
          <li v-for="item in group.items" :key="item.name">
            <RouterLink
              :to="item.to"
              :aria-current="activeName === item.name ? 'page' : undefined"
              :class="cn(
                'group relative flex h-10 items-center gap-3 rounded-md px-3 text-base transition-colors',
                'outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow',
                activeName === item.name
                  ? 'bg-sidebar-accent font-medium text-white'
                  : 'hover:bg-white/5 hover:text-white',
              )"
              @click="emit('navigate')"
            >
              <span
                v-if="activeName === item.name"
                class="brand-slant absolute top-2 bottom-2 left-0 w-1 rounded-[1px] bg-brand-yellow"
                aria-hidden="true"
              />
              <component :is="item.icon" class="size-[18px] shrink-0 opacity-80 group-aria-[current=page]:opacity-100" aria-hidden="true" />
              <span class="truncate">{{ item.title }}</span>
            </RouterLink>
          </li>
        </ul>
      </template>
    </div>

    <div class="border-t border-sidebar-border p-3">
      <button
        type="button"
        class="flex h-10 w-full items-center gap-3 rounded-md px-3 text-base text-sidebar-foreground outline-none transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-yellow"
        @click="emit('logout')"
      >
        <LogOut class="size-[18px]" aria-hidden="true" />
        Sair
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import {
  CalendarClock,
  FileWarning,
  Inbox,
  LayoutDashboard,
  LogOut,
  Map,
  SlidersHorizontal,
  TableProperties,
  UsersRound,
} from '@lucide/vue';
import type { Component } from 'vue';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import GeoMidiaLockup from '@/components/brand/GeoMidiaLockup.vue';
import { cn } from '@/lib/utils';

interface NavItem { title: string; name: string; to: string; icon: Component }
interface NavGroup { label?: string; items: NavItem[] }

const props = defineProps<{
  activeName: string | symbol | null | undefined;
  canWrite: boolean;
  isAdmin: boolean;
}>();

const emit = defineEmits<{ navigate: []; logout: [] }>();

const groups = computed<NavGroup[]>(() => [
  {
    items: [
      { title: 'Dashboard', name: 'dashboard', to: '/', icon: LayoutDashboard },
      { title: 'Mapa GIS', name: 'map', to: '/mapa', icon: Map },
      { title: 'Inventário', name: 'inventory', to: '/inventario', icon: TableProperties },
      { title: 'Vencimentos', name: 'expirations', to: '/vencimentos', icon: CalendarClock },
    ],
  },
  ...(props.canWrite
    ? [{
      label: 'Processos',
      items: [
        { title: 'Solicitações recebidas', name: 'forms', to: '/formularios', icon: Inbox },
        { title: 'Comunicados de exigência', name: 'requirements', to: '/comunicados-de-exigencia', icon: FileWarning },
      ],
    }]
    : []),
  ...(props.isAdmin
    ? [{
      label: 'Administração',
      items: [
        { title: 'Usuários', name: 'users', to: '/usuarios', icon: UsersRound },
        { title: 'Regras de negócio', name: 'rules', to: '/regras', icon: SlidersHorizontal },
      ],
    }]
    : []),
]);
</script>
