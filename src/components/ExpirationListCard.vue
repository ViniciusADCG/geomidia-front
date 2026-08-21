<template>
  <v-card border>
    <div :class="['expiration-card-header', `expiration-card-header--${mode}`]">
      <div>
        <h3>{{ title }}</h3>
        <span>{{ subtitle }}</span>
      </div>
      <v-chip :color="mode === 'expired' ? 'red-darken-2' : 'deep-orange'" variant="tonal">
        {{ items.length }}
      </v-chip>
    </div>

    <div class="table-wrap">
      <v-table hover>
        <thead>
          <tr>
            <th>Processo</th>
            <th>Local</th>
            <th>Tipo</th>
            <th>Status</th>
            <th>Vencimento</th>
            <th>Prazo</th>
            <th class="text-center">Ação</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="items.length === 0">
            <td colspan="7">
              <div class="empty-table">
                <v-icon icon="mdi-calendar-check-outline" size="42" />
                <span>
                  {{ mode === 'expired'
                    ? 'Nenhuma autorização vencida.'
                    : 'Nenhuma autorização vence nos próximos 90 dias.' }}
                </span>
              </div>
            </td>
          </tr>
          <tr v-for="asset in items" :key="asset.id">
            <td class="mono strong">{{ asset.process_code }}</td>
            <td class="address-cell">{{ asset.address }} · {{ asset.district }}</td>
            <td class="type-cell">{{ mediaTypeLabel(asset.media_type) }}</td>
            <td>
              <v-chip :color="statusColor(asset.status)" size="small" variant="tonal">
                {{ statusLabel(asset.status) }}
              </v-chip>
            </td>
            <td class="mono">{{ formatDate(asset.expiration_date) }}</td>
            <td :class="mode === 'expired' ? 'deadline-expired' : 'deadline-upcoming'">
              {{ deadlineLabel(asset) }}
            </td>
            <td class="text-center">
              <v-btn
                icon="mdi-map-marker-outline"
                size="small"
                variant="tonal"
                title="Visualizar no mapa"
                @click="$emit('view-map', asset)"
              />
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { mediaTypeLabel, statusColor, statusLabel } from '../domain/rules';
import type { MediaAsset } from '../types';
import { calendarDayDifference, formatDate } from '../utils/format';

const props = defineProps<{
  title: string;
  subtitle: string;
  items: MediaAsset[];
  referenceDate: string;
  mode: 'upcoming' | 'expired';
}>();

defineEmits<{ 'view-map': [asset: MediaAsset] }>();

function deadlineLabel(asset: MediaAsset): string {
  const days = calendarDayDifference(props.referenceDate, asset.expiration_date!);
  if (props.mode === 'expired') {
    const overdueDays = Math.abs(days);
    return overdueDays === 1 ? 'Vencido há 1 dia' : `Vencido há ${overdueDays} dias`;
  }
  if (days === 0) return 'Vence hoje';
  if (days === 1) return 'Vence amanhã';
  return `Vence em ${days} dias`;
}
</script>

<style scoped>
.expiration-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border-bottom: 1px solid #e3e9ee;
}

.expiration-card-header--upcoming {
  border-top: 3px solid #e85d04;
}

.expiration-card-header--expired {
  border-top: 3px solid #b42318;
}

.expiration-card-header h3 {
  margin: 0;
  font-size: 1rem;
}

.expiration-card-header span {
  color: #71808d;
  font-size: 0.8rem;
}

.deadline-upcoming,
.deadline-expired {
  white-space: nowrap;
  font-weight: 700;
}

.deadline-upcoming {
  color: #c2410c;
}

.deadline-expired {
  color: #b42318;
}
</style>
