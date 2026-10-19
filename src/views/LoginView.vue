<template>
  <LoginLayouts :variant="selectedId" />
</template>

<script setup lang="ts">
import LoginLayouts from '@/components/login/LoginLayouts.vue';
import { useLoginVariant } from '@/composables/useLoginVariant';

const { selectedId } = useLoginVariant();
</script>
