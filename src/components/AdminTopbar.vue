<template>
  <v-app-bar flat height="58" class="admin-topbar">
    <v-app-bar-nav-icon v-if="showMenu" @click="$emit('toggle-menu')" />
    <div class="topbar-context">
      <img class="scope-chip-image" src="/prefeitura-municipal.png" alt="Prefeitura Municipal" width="158" height="33" />
      <span class="topbar-department">Secretaria de Planejamento e Meio Ambiente</span>
      <img class="prefcg-logo" src="/prefcg-logo.png" alt="PREFCG" width="140" height="33" />
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
