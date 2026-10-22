<template>
  <ToneBadge :tone="asTone(statusColor(status))">{{ statusLabel(status) }}</ToneBadge>
</template>

<script setup lang="ts">
import ToneBadge from '@/components/common/ToneBadge.vue';
import { statusColor, statusLabel } from '@/domain/rules';
import { asTone } from '@/lib/tones';
import type { MediaStatus } from '@/types';

defineProps<{ status: MediaStatus }>();
</script>
