<template>
  <fieldset class="grid gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
      <legend class="float-left font-semibold">{{ title }}</legend>
      <slot name="actions" />
    </div>
    <div class="grid gap-4 sm:grid-cols-2">
      <slot />
    </div>
  </fieldset>
</template>

<script setup lang="ts">
defineProps<{ title: string }>();
</script>
