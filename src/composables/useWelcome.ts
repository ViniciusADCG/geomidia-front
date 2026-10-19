import { ref, watch } from 'vue';

// Animação de boas-vindas depois do login. "active" liga a animação; as versões em avaliação
// são trocadas pelo seletor de desenvolvimento. Em produção vale a primeira da lista.
export const WELCOME_VARIANTS = [
  { id: 'cartao', name: 'Cartão que expande', idea: 'O cartão do login cresce até ocupar a tela, fica azul e mostra a saudação.' },
  { id: 'cortina', name: 'Cortina inclinada', idea: 'Uma faixa azul com borda amarela, na inclinação da placa PREFCG, atravessa a tela com a saudação.' },
  { id: 'simbolo', name: 'Símbolo se montando', idea: 'As camadas do símbolo caem uma a uma, o pino pousa e a saudação aparece.' },
  { id: 'aviso', name: 'Aviso no painel', idea: 'O painel abre direto e um aviso desliza no topo com sol ou lua e o que há pendente.' },
  { id: 'ceu', name: 'Céu do horário', idea: 'O céu do momento: sol nascendo de manhã, sol se pondo à tarde, lua e estrelas à noite.' },
] as const;

export type WelcomeVariantId = typeof WELCOME_VARIANTS[number]['id'];

const STORAGE_KEY = 'geomidia_welcome_variant';
const DEFAULT: WelcomeVariantId = WELCOME_VARIANTS[0].id;

function readStored(): WelcomeVariantId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return WELCOME_VARIANTS.some((item) => item.id === stored) ? (stored as WelcomeVariantId) : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

const selectedId = ref<WelcomeVariantId>(import.meta.env.DEV ? readStored() : DEFAULT);
const active = ref(false);

watch(selectedId, (id) => {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Sem armazenamento a escolha vale só para esta aba.
  }
});

export function useWelcome() {
  return {
    selectedId,
    variants: WELCOME_VARIANTS,
    active,
    play: () => { active.value = true; },
    finish: () => { active.value = false; },
  };
}
