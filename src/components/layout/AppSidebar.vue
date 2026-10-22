<template>
  <nav class="flex h-full flex-col bg-sidebar text-sidebar-foreground" aria-label="Navegação principal">
    <div class="border-b border-sidebar-border px-5 py-5">
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
import { LogOut } from '@lucide/vue';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import GeoMidiaLockup from '@/components/brand/GeoMidiaLockup.vue';
import { navGroups } from '@/components/layout/nav-items';
import { cn } from '@/lib/utils';

// Menu do celular, aberto na gaveta lateral. No computador a navegação fica no menu lateral (AppSideNav).
const props = defineProps<{
  activeName: string | symbol | null | undefined;
  canWrite: boolean;
  isAdmin: boolean;
}>();

const emit = defineEmits<{ navigate: []; logout: [] }>();

const groups = computed(() => navGroups(props.canWrite, props.isAdmin));
</script>
