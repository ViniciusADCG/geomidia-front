<template>
  <section class="view-stack">
    <div class="view-header">
      <div>
        <h2>Dashboard</h2>
        <p>Visão geral do inventário municipal de mídia exterior.</p>
      </div>
      <div class="header-actions">
        <v-btn v-if="auth.canWrite" variant="outlined" prepend-icon="mdi-download" @click="exportJson">Exportar</v-btn>
        <v-btn v-if="auth.canWrite" color="primary" prepend-icon="mdi-plus" @click="$emit('navigate', 'inventory')">Novo Cadastro</v-btn>
      </div>
    </div>

    <div class="kpi-grid">
      <v-card v-for="card in kpis" :key="card.label" class="kpi-card" border>
        <div>
          <span :class="['kpi-label', card.className]">{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
          <small>{{ card.caption }}</small>
        </div>
        <v-icon :icon="card.icon" size="34" :color="card.color" />
      </v-card>
    </div>

    <v-row>
      <v-col cols="12">
        <v-card border class="pa-5">
          <div class="card-title-row">
            <h3>Ativos por Tipo de Veículo</h3>
            <v-btn variant="text" color="primary" append-icon="mdi-arrow-right" @click="$emit('navigate', 'map')">
              Ver mapa
            </v-btn>
          </div>

          <div v-if="media.assets.length === 0" class="empty-state">
            <v-icon icon="mdi-folder-open-outline" size="42" />
            <span>Nenhum ativo cadastrado.</span>
          </div>
          <div v-else class="bar-list">
            <div v-for="item in chartData" :key="item.type" class="bar-row">
              <div class="bar-meta">
                <span>{{ mediaTypeLabel(item.type) }}</span>
                <strong>{{ item.count }}</strong>
              </div>
              <div class="bar-track">
                <div
                  class="bar-fill"
                  :style="{ width: `${item.percent}%`, backgroundColor: mediaTypeColor(item.type) }"
                />
              </div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card border class="pa-5 activity-card">
          <h3>Atividades Recentes</h3>
          <div v-if="media.activities.length === 0" class="empty-state compact">
            <v-icon icon="mdi-clipboard-text-clock-outline" size="36" />
            <span>Nenhuma atividade registrada.</span>
          </div>
          <v-list v-else density="compact" class="activity-list">
            <v-list-item v-for="activity in media.activities" :key="activity.id" class="activity-item">
              <template #prepend>
                <v-chip size="x-small" :color="activityColor(activity.activity_type)" variant="tonal">
                  {{ activity.activity_type }}
                </v-chip>
              </template>
              <v-list-item-title>{{ activity.message }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ activity.process_code }} · {{ formatDateTime(activity.created_at) }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { MEDIA_TYPE_OPTIONS, mediaTypeColor, mediaTypeLabel } from '../domain/rules';
import { useMediaStore } from '../stores/media';
import { useAuthStore } from '../stores/auth';
import type { ActivityType } from '../types';
import { formatDateTime } from '../utils/format';

defineEmits<{ navigate: ['dashboard' | 'map' | 'inventory'] }>();

const media = useMediaStore();
const auth = useAuthStore();

const kpis = computed(() => [
  {
    label: 'Total de Ativos',
    value: media.stats.total,
    caption: `${media.stats.total} registro(s)`,
    icon: 'mdi-folder-table-outline',
    color: 'primary',
    className: 'blue',
  },
  {
    label: 'Novos Processos',
    value: media.stats.new_processes,
    caption: 'Aguardando início da análise',
    icon: 'mdi-inbox-arrow-down-outline',
    color: 'info',
    className: 'cyan',
  },
  {
    label: 'Em Análise',
    value: media.stats.pending,
    caption: 'Processos em análise técnica',
    icon: 'mdi-file-search-outline',
    color: 'warning',
    className: 'amber',
  },
  {
    label: 'Autorizados',
    value: media.stats.approved,
    caption: 'Ativos aprovados',
    icon: 'mdi-check-decagram-outline',
    color: 'success',
    className: 'green',
  },
  {
    label: 'Irregulares',
    value: media.stats.rejected,
    caption: 'Solicitações irregulares',
    icon: 'mdi-alert-octagon-outline',
    color: 'error',
    className: 'red',
  },
]);

const chartData = computed(() => {
  const max = Math.max(...Object.values(media.stats.by_type), 1);
  return MEDIA_TYPE_OPTIONS.map(({ value }) => {
    const count = media.stats.by_type[value] ?? 0;
    return {
      type: value,
      count,
      percent: (count / max) * 100,
    };
  });
});

function activityColor(type: ActivityType) {
  if (type === 'aprovacao') return 'success';
  if (type === 'reprovacao' || type === 'remocao') return 'error';
  if (type === 'cadastro') return 'primary';
  return 'warning';
}

function exportJson() {
  const data = JSON.stringify(media.assets, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = 'inventario-geomidia.json';
  link.click();
  URL.revokeObjectURL(href);
}
</script>
