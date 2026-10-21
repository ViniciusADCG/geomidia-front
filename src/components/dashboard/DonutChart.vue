<template>
  <div class="shrink-0" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :viewBox="`0 0 ${size} ${size}`" class="size-full -rotate-90" role="img" :aria-label="label">
      <circle :cx="size / 2" :cy="size / 2" :r="radius" fill="none" :stroke="trackColor" :stroke-width="thickness" />
      <circle
        v-for="arc in arcs"
        :key="arc.label"
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke="arc.color"
        :stroke-width="thickness"
        :stroke-dasharray="`${arc.length} ${circumference}`"
        :stroke-dashoffset="-arc.start"
        class="motion-ring"
      >
        <title>{{ arc.label }}: {{ arc.value }}</title>
      </circle>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// Rosca com um arco por parte, separados por um vão de 2 px. Partes com zero não aparecem.
const props = withDefaults(defineProps<{
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  trackColor?: string;
  label: string;
}>(), { size: 160, thickness: 18, trackColor: 'var(--muted)' });

const radius = computed(() => (props.size - props.thickness) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);
const GAP = 2;

const arcs = computed(() => {
  const total = props.segments.reduce((sum, item) => sum + item.value, 0);
  if (!total) return [];
  const visible = props.segments.filter((item) => item.value > 0);
  let start = 0;
  return visible.map((item) => {
    const full = (item.value / total) * circumference.value;
    const arc = { ...item, start, length: visible.length > 1 ? Math.max(0.01, full - GAP) : full };
    start += full;
    return arc;
  });
});
</script>
