<template>
  <header
    :class="cn(
      'flex h-16 items-center gap-3 px-4 lg:px-8',
      dark ? 'bg-sidebar text-white' : 'bg-card',
      !dark && 'border-b',
    )"
  >
    <Button
      v-if="showMenu"
      variant="ghost"
      size="icon"
      aria-label="Abrir menu"
      class="-ml-1"
      @click="emit('toggle-menu')"
    >
      <Menu class="size-5" />
    </Button>

    <!-- O começo da barra muda com a disposição: marcas oficiais, título da página ou navegação. -->
    <slot name="start">
      <BrandLockup :height="showMenu ? 26 : 32" />
    </slot>

    <div class="ml-auto flex items-center gap-2 sm:gap-4">
      <slot name="end" />

      <Button
        variant="ghost"
        size="icon"
        title="Atualizar dados"
        aria-label="Atualizar dados"
        :class="dark && 'text-white hover:bg-white/10 hover:text-white'"
        :disabled="loading"
        @click="emit('refresh')"
      >
        <RefreshCw :class="cn('size-[18px]', loading && 'animate-spin')" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <!-- Na barra só as iniciais; nome completo e papel ficam no topo do menu. -->
          <button
            type="button"
            :class="cn(
              'flex items-center gap-1.5 rounded-full p-1 pr-1.5 outline-none transition-colors',
              dark ? 'hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-brand-yellow' : 'hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
            )"
            :aria-label="`Conta de ${userName ?? 'usuário'}`"
          >
            <span
              :class="cn(
                'grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold',
                dark ? 'bg-brand-yellow text-brand-night' : 'bg-brand-navy text-white',
              )"
              aria-hidden="true"
            >{{ initials }}</span>
            <ChevronDown :class="cn('hidden size-3.5 sm:block', dark ? 'text-sidebar-muted' : 'text-muted-foreground')" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-60">
          <DropdownMenuLabel class="grid gap-0.5 py-2 font-normal">
            <span class="truncate font-semibold">{{ userName }}</span>
            <span class="text-xs text-muted-foreground">{{ roleLabel }}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem class="gap-2.5 py-2 text-base" @select="emit('logout')">
            <LogOut class="size-4" aria-hidden="true" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ChevronDown, LogOut, Menu, RefreshCw } from '@lucide/vue';
import { computed } from 'vue';

import BrandLockup from '@/components/brand/BrandLockup.vue';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const props = withDefaults(defineProps<{
  showMenu?: boolean;
  loading: boolean;
  roleLabel: string;
  userName: string | null;
  // Barra no azul da marca, com texto branco.
  dark?: boolean;
}>(), { showMenu: false, dark: false });

const emit = defineEmits<{
  'toggle-menu': [];
  refresh: [];
  logout: [];
}>();

const initials = computed(() => {
  const parts = (props.userName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
});
</script>
