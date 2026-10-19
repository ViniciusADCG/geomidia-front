import { ref, watch } from 'vue';

// Forma de escrever "GeoMídia" ao lado do símbolo, em avaliação.
// A troca só existe em desenvolvimento; em produção vale a primeira da lista.
export const WORDMARK_VARIANTS = [
  { id: 'duas-cores', name: 'Duas cores', idea: '"Geo" no azul-escuro e "Mídia" no azul-claro, como na logo original.' },
  { id: 'peso', name: 'Peso misto', idea: '"Geo" em negrito e "Mídia" em peso normal, numa cor só.' },
  { id: 'descritor', name: 'Com descritor', idea: 'O nome com a linha "Gestão de mídia exterior", que diz o que o sistema faz.' },
  { id: 'empilhado', name: 'Empilhado', idea: '"Geo" sobre "Mídia", em duas linhas compactas ao lado do símbolo.' },
  { id: 'placa', name: 'Na placa', idea: 'O nome dentro de uma placa inclinada com contorno amarelo, como a placa PREFCG.' },
] as const;

export type WordmarkVariantId = typeof WORDMARK_VARIANTS[number]['id'];

const STORAGE_KEY = 'geomidia_wordmark_variant';
const DEFAULT: WordmarkVariantId = WORDMARK_VARIANTS[0].id;

function readStored(): WordmarkVariantId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return WORDMARK_VARIANTS.some((item) => item.id === stored) ? (stored as WordmarkVariantId) : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

const selectedId = ref<WordmarkVariantId>(import.meta.env.DEV ? readStored() : DEFAULT);

watch(selectedId, (id) => {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Sem armazenamento a escolha vale só para esta aba.
  }
});

export function useWordmarkVariant() {
  return { selectedId, variants: WORDMARK_VARIANTS };
}
