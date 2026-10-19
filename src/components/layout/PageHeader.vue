<template>
  <header class="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 lg:mb-8">
    <div class="min-w-0">
      <h1 class="text-2xl font-semibold tracking-tight">{{ title }}</h1>
      <span class="brand-slant mt-2 block h-1 w-10 rounded-[1px] bg-brand-yellow" aria-hidden="true" />
      <p v-if="description || $slots.description" class="mt-3 max-w-[70ch] text-muted-foreground">
        <slot name="description">{{ description }}</slot>
      </p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>
