<script setup lang="ts">
import { Textarea } from '@/components/ui/textarea';

defineProps<{ invalid?: boolean }>();
const model = defineModel<string>({ required: true });
</script>

<template>
  <div class="grid gap-2">
    <label for="deletion-reason" class="text-sm font-medium">
      Justificativa da exclusão <span class="text-destructive" aria-hidden="true">*</span>
    </label>
    <Textarea
      id="deletion-reason"
      v-model="model"
      rows="3"
      maxlength="1000"
      required
      :aria-invalid="invalid || undefined"
      :aria-describedby="invalid ? 'deletion-reason-error' : undefined"
      placeholder="Explique por que este processo precisa ser excluído"
    />
    <p v-if="invalid" id="deletion-reason-error" class="text-sm text-destructive" role="alert">Informe a justificativa antes de excluir.</p>
  </div>
</template>
