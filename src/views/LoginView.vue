<template>
  <main class="login-shell">
    <div class="login-stage">
      <v-card class="login-card">


        <div class="login-logo">
          <span class="login-eyebrow">Acesso ao sistema</span>
          <div class="login-map-icon" aria-hidden="true">
          <v-icon icon="mdi-map-marker-radius" size="34" />
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

        <v-alert
          v-if="helpMessage"
          type="info"
          variant="tonal"
          density="compact"
          closable
          class="mb-4"
          @click:close="helpMessage = ''"
        >
          {{ helpMessage }}
        </v-alert>

        <v-form v-model="valid" class="login-form" @submit.prevent="submit">
          <v-text-field
            v-model="username"
            label="Usuário"
            prepend-inner-icon="mdi-account-outline"
            autocomplete="username"
            :rules="[required, usernameRule]"
          />
          <v-text-field
            v-model="password"
            label="Senha"
            :type="showPassword ? 'text' : 'password'"
            prepend-inner-icon="mdi-lock-outline"
            :append-inner-icon="showPassword ? 'mdi-eye-outline' : 'mdi-eye-off-outline'"
            autocomplete="current-password"
            :rules="[required, passwordRule]"
            @click:append-inner="showPassword = !showPassword"
          />

          <div class="login-options">
            <v-checkbox
              v-model="remember"
              label="Lembrar de mim"
              density="compact"
              hide-details
            />
            <button type="button" class="login-help" @click="showPasswordHelp">
              Esqueceu sua senha?
            </button>
          </div>

          <v-btn
            type="submit"
            class="login-submit"
            size="large"
            block
            :loading="auth.loading"
            :disabled="!valid"
            append-icon="mdi-arrow-right"
          >
            Entrar
          </v-btn>

          <div class="login-security">
            <v-icon icon="mdi-shield-check-outline" size="15" />
            <span>Ambiente seguro de gestão municipal</span>
          </div>
        </v-form>
      </v-card>

      <div class="login-version">GeoMídia v1.0</div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const username = ref('');
const password = ref('');
const remember = ref(false);
const showPassword = ref(false);
const helpMessage = ref('');
const errorMessage = ref('');
const valid = ref(false);
const required = (value: string) => Boolean(value?.trim()) || 'Campo obrigatório.';
const usernameRule = (value: string) => value.trim().length >= 3 || 'Informe ao menos 3 caracteres.';
const passwordRule = (value: string) => value.length >= 8 || 'A senha deve ter ao menos 8 caracteres.';

function showPasswordHelp() {
  helpMessage.value = 'Solicite a redefinição de senha a um administrador do GeoMídia.';
}

async function submit() {
  errorMessage.value = '';
  try {
    await auth.login(username.value.trim(), password.value, remember.value);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    await router.replace(redirect);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Não foi possível entrar.';
  }
}
</script>
