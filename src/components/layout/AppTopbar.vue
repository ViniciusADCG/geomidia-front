<template>
  <header class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card px-4 lg:px-8">
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

    <BrandLockup :height="showMenu ? 26 : 32" />

    <div class="ml-auto flex items-center gap-2 sm:gap-4">
      <Button
        variant="ghost"
        size="icon"
        title="Atualizar dados"
        aria-label="Atualizar dados"
        :disabled="loading"
        @click="emit('refresh')"
      >
        <RefreshCw :class="cn('size-[18px]', loading && 'animate-spin')" />
      </Button>

      <div class="flex min-w-0 items-center gap-3">
        <span
          class="grid size-9 shrink-0 place-items-center rounded-full bg-brand-navy text-sm font-semibold text-white"
          aria-hidden="true"
        >{{ initials }}</span>
        <div class="hidden min-w-0 leading-tight sm:block">
          <p class="max-w-44 truncate text-sm font-semibold" :title="userName ?? ''">{{ userName }}</p>
          <p class="text-xs text-muted-foreground">{{ roleLabel }}</p>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Menu, RefreshCw } from '@lucide/vue';
import { computed } from 'vue';

import BrandLockup from '@/components/brand/BrandLockup.vue';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const props = defineProps<{
  showMenu: boolean;
  loading: boolean;
  roleLabel: string;
  userName: string | null;
}>();

const emit = defineEmits<{
  'toggle-menu': [];
  refresh: [];
}>();

const initials = computed(() => {
  const parts = (props.userName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
});
</script>
