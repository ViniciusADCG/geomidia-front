import { ref, watch } from 'vue';

// Layouts da tela de login em avaliação. A troca só existe em desenvolvimento;
// em produção vale o primeiro da lista.
export const LOGIN_VARIANTS = [
  { id: 'dividida', name: 'Dividida', idea: 'A atual: foto da cidade com as marcas à esquerda, formulário à direita.' },
  { id: 'cartao', name: 'Cartão sobre a cidade', idea: 'A foto ocupa a tela inteira e o formulário fica num cartão branco no centro.' },
  { id: 'faixa', name: 'Faixa institucional', idea: 'Página branca com faixa azul e as marcas oficiais no topo, como os portais de governo.' },
  { id: 'mapa', name: 'Mapa', idea: 'Fundo de quadras em perspectiva, o mesmo desenho do símbolo, com o formulário à direita.' },
  { id: 'painel', name: 'Painel escuro', idea: 'Formulário num painel azul-noturno à esquerda e a foto grande ao lado.' },
  { id: 'minimalista', name: 'Minimalista', idea: 'Fundo claro, símbolo grande no centro e as marcas oficiais pequenas no rodapé.' },
] as const;

export type LoginVariantId = typeof LOGIN_VARIANTS[number]['id'];

const STORAGE_KEY = 'geomidia_login_variant';
const DEFAULT: LoginVariantId = LOGIN_VARIANTS[0].id;

function readStored(): LoginVariantId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return LOGIN_VARIANTS.some((item) => item.id === stored) ? (stored as LoginVariantId) : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

const selectedId = ref<LoginVariantId>(import.meta.env.DEV ? readStored() : DEFAULT);

watch(selectedId, (id) => {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Sem armazenamento a escolha vale só para esta aba.
  }
});

export function useLoginVariant() {
  return { selectedId, variants: LOGIN_VARIANTS };
}
