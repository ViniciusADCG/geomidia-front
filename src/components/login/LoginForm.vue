<template>
  <div>
    <div class="text-center">
      <h1 class="text-[1.625rem] leading-tight font-bold tracking-tight text-brand-night">Acesso ao sistema</h1>
      <p class="mx-auto mt-2 max-w-72 text-[0.9375rem] text-balance text-muted-foreground">
        Informe suas credenciais para acessar o GeoMídia.
      </p>
    </div>

    <Alert v-if="errorMessage" variant="destructive" class="mt-6">
      <CircleAlert />
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <p v-if="helpOpen" class="mt-6 rounded-md bg-muted px-4 py-3 text-sm">
      Peça a um administrador do GeoMídia para redefinir sua senha.
    </p>

    <form class="mt-7 grid gap-4" novalidate @submit.prevent="submit">
      <div>
        <div class="relative">
          <UserRound class="pointer-events-none absolute top-1/2 left-3.5 size-[1.125rem] -translate-y-1/2 text-[#314c6c]" />
          <Input
            id="login-username"
            v-model="username"
            placeholder="Usuário"
            aria-label="Usuário"
            autocomplete="username"
            class="h-[52px] rounded-lg pl-10"
            :aria-invalid="Boolean(usernameError) || undefined"
            :aria-describedby="usernameError ? 'login-username-error' : undefined"
            @blur="touched.username = true"
          />
        </div>
        <p v-if="usernameError" id="login-username-error" class="mt-1.5 text-sm text-destructive">{{ usernameError }}</p>
      </div>

      <div>
        <div class="relative">
          <LockKeyhole class="pointer-events-none absolute top-1/2 left-3.5 size-[1.125rem] -translate-y-1/2 text-[#314c6c]" />
          <Input
            id="login-password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Senha"
            aria-label="Senha"
            autocomplete="current-password"
            class="h-[52px] rounded-lg pr-12 pl-10"
            :aria-invalid="Boolean(passwordError) || undefined"
            :aria-describedby="passwordError ? 'login-password-error' : undefined"
            @blur="touched.password = true"
          />
          <button
            type="button"
            class="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-lg text-[#314c6c] outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          >
            <Eye v-if="showPassword" class="size-[1.125rem]" />
            <EyeOff v-else class="size-[1.125rem]" />
          </button>
        </div>
        <p v-if="passwordError" id="login-password-error" class="mt-1.5 text-sm text-destructive">{{ passwordError }}</p>
      </div>

      <div class="flex items-center justify-between gap-4">
        <label class="flex cursor-pointer items-center gap-2 text-base">
          <Checkbox v-model="remember" />
          Lembrar de mim
        </label>
        <button
          type="button"
          class="rounded-sm text-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          @click="helpOpen = !helpOpen"
        >
          Esqueceu sua senha?
        </button>
      </div>

      <Button
        type="submit"
        size="lg"
        class="mt-1 h-[54px] w-full rounded-lg text-base font-bold tracking-[0.06em] uppercase"
        :disabled="auth.loading"
      >
        <LoaderCircle v-if="auth.loading" class="animate-spin" />
        Entrar
        <ArrowRight v-if="!auth.loading" />
      </Button>
    </form>

    <div class="mt-5 border-t pt-4 text-center text-[0.8125rem] text-[#405873]">
      <p class="flex items-center justify-center gap-2">
        <ShieldCheck class="size-[1.125rem] text-[#35577a]" />
        Ambiente seguro de gestão municipal
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowRight, CircleAlert, Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck, UserRound } from '@lucide/vue';
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

import { useWelcome } from '@/composables/useWelcome';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const welcome = useWelcome();
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
    await welcome.leave();
    welcome.play();
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    await router.replace(redirect);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Não foi possível entrar.';
  }
}
</script>
