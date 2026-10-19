import { ref, watch } from 'vue';

// Formatação do nome "GeoMídia" (em duas cores) ao lado do símbolo, em avaliação.
// A troca só existe em desenvolvimento; em produção vale a primeira da lista.
export const WORDMARK_VARIANTS = [
  { id: 'base', name: 'Base', idea: 'Como está hoje: negrito, letras levemente juntas.' },
  { id: 'forte', name: 'Extra forte', idea: 'Peso maior, um pouco maior e mais junto. Ganha presença de marca.' },
  { id: 'suave', name: 'Suave', idea: 'Peso médio e espaçamento normal. Mais leve, combina com o texto da interface.' },
  { id: 'ciano', name: 'Ciano do pino', idea: '"Mídia" no mesmo ciano do miolo do pino, ligando o nome ao símbolo.' },
  { id: 'hierarquia', name: 'Hierarquia', idea: 'Nome maior e legenda menor, com o traço amarelo inclinado antes da legenda.' },
] as const;

export type WordmarkVariantId = typeof WORDMARK_VARIANTS[number]['id'];

const STORAGE_KEY = 'geomidia_wordmark_format';
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
