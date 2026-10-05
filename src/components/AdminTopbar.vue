<template>
  <v-app-bar flat height="58" class="admin-topbar">
    <v-app-bar-nav-icon v-if="showMenu" @click="$emit('toggle-menu')" />
    <div class="topbar-context">
      <img class="prefcglogooficial" src="/prefcglogoficial1.png" alt="PREFCG" width="600" height="60" />
    </div>
    <v-spacer />
    <v-btn
      icon="mdi-refresh"
      title="Atualizar dados"
      aria-label="Atualizar dados"
      variant="text"
      :loading="loading"
      class="topbar-refresh"
      @click="$emit('refresh')"
    />
    <div class="admin-user">
      <v-avatar color="primary" size="34" class="admin-user-avatar">
        <v-icon icon="mdi-account-outline" />
      </v-avatar>
      <div class="admin-user-meta">
        <strong>{{ roleLabel }}</strong>
        <span :title="userName ?? ''">{{ userName }}</span>
      </div>
    </div>
  </v-app-bar>
</template>

<script setup lang="ts">
defineProps<{
  showMenu: boolean;
  loading: boolean;
  roleLabel: string;
  userName: string | null;
}>();

defineEmits<{
  'toggle-menu': [];
  refresh: [];
}>();
</script>
