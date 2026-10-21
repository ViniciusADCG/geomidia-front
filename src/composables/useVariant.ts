import { ref, watch, type Ref } from 'vue';

// Variantes em teste: a escolha fica no localStorage e é compartilhada entre os componentes,
// para trocar no painel de teste (VariantLab) e ver o efeito na hora.
const refs = new Map<string, Ref<string>>();

export function useVariant(key: string, fallback: string): Ref<string> {
  const existing = refs.get(key);
  if (existing) return existing;

  let stored: string | null = null;
  try { stored = localStorage.getItem(key); } catch { /* sem localStorage: fica o padrão */ }
  const value = ref(stored ?? fallback);
  watch(value, (next) => {
    try { localStorage.setItem(key, next); } catch { /* idem */ }
  });
  refs.set(key, value);
  return value;
}
