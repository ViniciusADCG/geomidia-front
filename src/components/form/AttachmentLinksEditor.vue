<template>
  <fieldset class="grid gap-3 rounded-md border p-4">
    <legend class="px-1 font-medium">Links dos anexos</legend>
    <p class="-mt-1 text-sm text-muted-foreground">Fotos, documentos, PDFs ou outros arquivos relacionados.</p>

    <div class="flex gap-2">
      <Input
        v-model="draft"
        inputmode="url"
        placeholder="https://..."
        aria-label="Novo link de anexo"
        @keydown.enter.prevent="add"
      />
      <Button type="button" variant="secondary" :disabled="!draft.trim()" @click="add">
        <Plus />
        Adicionar
      </Button>
    </div>

    <ul v-if="modelValue.length" class="divide-y rounded-md border">
      <li v-for="(link, index) in modelValue" :key="`${link}-${index}`" class="flex items-center gap-2 py-1 pr-1 pl-3">
        <a
          :href="link"
          target="_blank"
          rel="noopener noreferrer"
          class="flex min-w-0 flex-1 items-center gap-2 rounded-sm py-1.5 text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ExternalLink class="size-4 shrink-0" aria-hidden="true" />
          <span class="truncate">{{ link }}</span>
        </a>
        <Button type="button" variant="ghost" size="icon-sm" :aria-label="`Remover ${link}`" @click="remove(index)">
          <X />
        </Button>
      </li>
    </ul>
    <p v-else class="text-sm text-muted-foreground">Nenhum link adicionado.</p>
  </fieldset>
</template>

<script setup lang="ts">
import { ExternalLink, Plus, X } from '@lucide/vue';
import { ref } from 'vue';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizeAttachmentLink } from '@/utils/attachment-links';

const props = defineProps<{ modelValue: string[] }>();
const emit = defineEmits<{ 'update:modelValue': [links: string[]] }>();

const draft = ref('');

function add() {
  const link = normalizeAttachmentLink(draft.value);
  if (!link) return;
  if (!props.modelValue.includes(link)) emit('update:modelValue', [...props.modelValue, link]);
  draft.value = '';
}

function remove(index: number) {
  emit('update:modelValue', props.modelValue.filter((_, current) => current !== index));
}
</script>
