<template>
  <main class="login-shell">
    <v-card class="login-card" border>
      <div class="login-logo">
        <div class="brand-icon large">
          <v-icon icon="mdi-map-marker-radius-outline" size="34" />
        </div>
        <h1>GeoMídia</h1>
        <p>Gestão de Mídia Exterior e GIS</p>
      </div>

      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        {{ errorMessage }}
      </v-alert>

      <v-form @submit.prevent="submit">
        <v-text-field
          v-model="email"
          label="E-mail corporativo"
          type="email"
          prepend-inner-icon="mdi-email-outline"
          autocomplete="email"
        />
        <v-text-field
          v-model="password"
          label="Senha"
          type="password"
          prepend-inner-icon="mdi-lock-outline"
          autocomplete="current-password"
        />
        <v-checkbox
          v-model="remember"
          label="Lembrar de mim"
          density="compact"
          hide-details
          class="mb-4"
        />
        <v-btn
          type="submit"
          color="primary"
          size="large"
          block
          :loading="auth.loading"
          append-icon="mdi-arrow-right"
        >
          Entrar
        </v-btn>
      </v-form>

      <div class="login-version">GeoMídia v1.0</div>
    </v-card>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { useAuthStore } from '../stores/auth';

const emit = defineEmits<{ 'logged-in': [] }>();

const auth = useAuthStore();
const email = ref('analista@campogrande.ms.gov.br');
const password = ref('geomidia');
const remember = ref(true);
const errorMessage = ref('');

async function submit() {
  errorMessage.value = '';
  try {
    await auth.login(email.value, password.value);
    emit('logged-in');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Não foi possível entrar.';
  }
}
</script>
