<template>
  <div class="grid gap-1.5">
    <Input
      :id="id"
      :model-value="modelValue ?? ''"
      :list="listId"
      maxlength="120"
      autocomplete="off"
      placeholder="Busque ou digite uma empresa"
      @update:model-value="emit('update:modelValue', String($event))"
    />
    <datalist :id="listId">
      <option v-for="company in companies" :key="company" :value="company" />
    </datalist>
    <p v-if="error" class="text-sm text-destructive" role="alert">
      Não foi possível carregar as empresas. Você pode digitar o nome ou
      <button type="button" class="underline" @click="loadCompanies">tentar novamente</button>.
    </p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, useId } from 'vue';

import { Input } from '@/components/ui/input';
import { api } from '@/services/api';

defineProps<{ id: string; modelValue: string | null | undefined }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const listId = useId();
const companies = ref<string[]>([]);
const error = ref(false);

async function loadCompanies() {
  error.value = false;
  try {
    companies.value = await api.listMapCompanyOptions();
  } catch {
    error.value = true;
  }
}

onMounted(loadCompanies);
</script>
