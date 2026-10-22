<template>
  <section class="rounded-lg border bg-card p-5" aria-labelledby="activity-title">
    <h2 id="activity-title" class="font-semibold">Atividades recentes</h2>
    <EmptyState
      v-if="media.activities.length === 0"
      :icon="History"
      title="Nenhuma atividade ainda"
      description="Cadastros, aprovações e edições ficam registrados aqui."
    />
    <ol v-else class="mt-3 divide-y">
      <li v-for="activity in shown" :key="activity.id" class="py-3 first:pt-1">
        <div class="flex items-start justify-between gap-3">
          <p class="min-w-0">{{ activity.message }}</p>
          <ToneBadge :tone="activityTone(activity.activity_type)" class="capitalize">
            {{ activityLabel(activity.activity_type) }}
          </ToneBadge>
        </div>
        <p class="mt-1 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
          <span class="font-medium text-foreground">{{ activity.process_code }}</span>
          <time :datetime="activity.created_at">{{ formatDateTime(activity.created_at) }}</time>
        </p>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { History } from '@lucide/vue';
import { computed } from 'vue';

import EmptyState from '@/components/common/EmptyState.vue';
import ToneBadge from '@/components/common/ToneBadge.vue';
import type { Tone } from '@/lib/tones';
import { useMediaStore } from '@/stores/media';
import type { ActivityType } from '@/types';
import { formatDateTime } from '@/utils/format';

// Últimas atividades do inventário. `limit` corta a lista quando o espaço é curto.
const props = defineProps<{ limit?: number }>();
const media = useMediaStore();
const shown = computed(() => (props.limit ? media.activities.slice(0, props.limit) : media.activities));

function activityTone(type: ActivityType): Tone {
  if (type === 'aprovacao') return 'success';
  if (type === 'reprovacao' || type === 'remocao') return 'error';
  if (type === 'cadastro') return 'primary';
  return 'warning';
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  cadastro: 'cadastro',
  aprovacao: 'aprovação',
  reprovacao: 'reprovação',
  edicao: 'edição',
  remocao: 'remoção',
};

function activityLabel(type: ActivityType): string {
  return ACTIVITY_LABELS[type] ?? type;
}
</script>
