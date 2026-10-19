import { computed, ref, watch } from 'vue';

import { MARK_VARIANTS, markDataUrl } from '@/components/brand/geomidia-marks';

// Escolha da logo em avaliação. Só existe em desenvolvimento; em produção fica a logo atual.
const STORAGE_KEY = 'geomidia_logo_variant';
const CURRENT = 'atual';

function readStored(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? CURRENT;
  } catch {
    return CURRENT;
  }
}

const selectedId = ref(import.meta.env.DEV ? readStored() : CURRENT);

watch(selectedId, (id) => {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Sem armazenamento a escolha vale só para esta aba.
  }
  updateFavicon();
});

function updateFavicon() {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) return;
  const variant = MARK_VARIANTS.find((item) => item.id === selectedId.value);
  link.type = variant ? 'image/svg+xml' : 'image/png';
  link.href = variant ? markDataUrl(variant) : '/Logocircular-arredondado.png';
}

if (import.meta.env.DEV) updateFavicon();

export function useLogoVariant() {
  const variant = computed(() => MARK_VARIANTS.find((item) => item.id === selectedId.value) ?? null);
  return { selectedId, variant, variants: MARK_VARIANTS, currentId: CURRENT };
}
