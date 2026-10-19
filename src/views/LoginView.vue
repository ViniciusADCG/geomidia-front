<template>
  <main class="grid min-h-dvh bg-card lg:grid-cols-[minmax(0,1.1fr)_minmax(28rem,0.9fr)]">
    <section
      class="relative flex min-h-56 flex-col justify-between overflow-hidden bg-brand-night bg-cover bg-center p-6 text-white sm:p-10 lg:min-h-dvh lg:p-14"
      style="background-image: url('/login-hero-city.jpg')"
    >
      <div class="absolute inset-0 bg-gradient-to-t from-brand-night via-brand-night/40 to-transparent" aria-hidden="true" />
      <BrandLockup tone="onDark" :height="40" class="relative" />
      <div class="relative mt-10 max-w-lg">
        <p class="text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-[2.75rem] sm:leading-[1.1]">
          Mídia exterior de Campo Grande, no mapa e em dia.
        </p>
        <p class="mt-4 hidden max-w-md text-lg text-white/75 sm:block">
          Secretaria Municipal de Meio Ambiente, Gestão Urbana e Desenvolvimento Econômico, Turístico e Sustentável
        </p>
      </div>
    </section>

    <section class="flex items-center justify-center px-6 py-10 sm:px-10">
      <div class="w-full max-w-sm">
        <div class="flex items-center gap-3">
          <img src="/Logocircular-arredondado.png" alt="" width="44" height="44" class="size-11 rounded-full" />
          <p class="text-xl font-semibold">GeoMídia</p>
        </div>

        <h1 class="mt-8 text-2xl font-semibold tracking-tight">Entrar</h1>
        <p class="mt-1 text-muted-foreground">Use o usuário e a senha fornecidos pela administração do GeoMídia.</p>

        <Alert v-if="errorMessage" variant="destructive" class="mt-6">
          <CircleAlert />
          <AlertDescription>{{ errorMessage }}</AlertDescription>
        </Alert>

        <form class="mt-6 grid gap-5" novalidate @submit.prevent="submit">
          <FormField v-slot="{ id, invalid, describedBy }" label="Usuário" :error="usernameError">
            <Input
              :id="id"
              v-model="username"
              autocomplete="username"
              :aria-invalid="invalid || undefined"
              :aria-describedby="describedBy"
              @blur="touched.username = true"
            />
          </FormField>

          <FormField v-slot="{ id, invalid, describedBy }" label="Senha" :error="passwordError">
            <div class="relative">
              <Input
                :id="id"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                class="pr-11"
                :aria-invalid="invalid || undefined"
                :aria-describedby="describedBy"
                @blur="touched.password = true"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" class="size-4" />
                <Eye v-else class="size-4" />
              </button>
            </div>
          </FormField>

          <div class="flex items-center justify-between gap-4">
            <label class="flex cursor-pointer items-center gap-2 text-base">
              <Checkbox v-model="remember" />
              Manter conectado
            </label>
            <button
              type="button"
              class="rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              @click="helpOpen = !helpOpen"
            >
              Esqueci a senha
            </button>
          </div>

          <p v-if="helpOpen" class="rounded-md bg-muted px-4 py-3 text-sm">
            Peça a um administrador do GeoMídia para redefinir sua senha.
          </p>

          <Button type="submit" size="lg" class="w-full text-base" :disabled="auth.loading">
            <LoaderCircle v-if="auth.loading" class="animate-spin" />
            Entrar
          </Button>
        </form>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { CircleAlert, Eye, EyeOff, LoaderCircle } from '@lucide/vue';
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import BrandLockup from '@/components/brand/BrandLockup.vue';
import FormField from '@/components/form/FormField.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const username = ref('');
const password = ref('');
const remember = ref(false);
const showPassword = ref(false);
const helpOpen = ref(false);
const errorMessage = ref('');
const touched = reactive({ username: false, password: false });

const usernameRule = computed(() => {
  if (!username.value.trim()) return 'Informe o usuário.';
  if (username.value.trim().length < 3) return 'O usuário tem ao menos 3 caracteres.';
  return null;
});
const passwordRule = computed(() => {
  if (!password.value) return 'Informe a senha.';
  if (password.value.length < 8) return 'A senha tem ao menos 8 caracteres.';
  return null;
});
const usernameError = computed(() => (touched.username ? usernameRule.value : null));
const passwordError = computed(() => (touched.password ? passwordRule.value : null));
const valid = computed(() => !usernameRule.value && !passwordRule.value);

async function submit() {
  touched.username = true;
  touched.password = true;
  if (!valid.value) return;
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
