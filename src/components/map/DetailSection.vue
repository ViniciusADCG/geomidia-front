<template>
  <section class="grid gap-2">
    <h3 class="text-sm font-semibold">{{ title }}</h3>
    <dl class="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md border px-3 py-3">
      <slot />
    </dl>
  </section>
</template>

<script setup lang="ts">
defineProps<{ title: string }>();
</script>
