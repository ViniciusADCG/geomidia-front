<template>
  <div :class="['min-w-0', wide && 'col-span-2']">
    <dt class="text-xs text-muted-foreground">{{ label }}</dt>
    <dd class="mt-0.5 text-sm">
      <slot />
    </dd>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; wide?: boolean }>();
</script>
