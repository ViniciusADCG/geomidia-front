import { ref, watch } from 'vue';

// Variações do fundo animado Avenidas da tela de login, em avaliação. A troca só existe em desenvolvimento;
// em produção vale o primeiro da lista.
export const LOGIN_BACKGROUNDS = [
  { id: 'avenidas', name: 'Avenidas', idea: 'A base escolhida: malha de ruas em perspectiva com rastros de luz passando.' },
  { id: 'rush', name: 'Hora do rush', idea: 'O dobro de carros, mais rápidos e com mais amarelo; ruas mais visíveis.' },
  { id: 'noite', name: 'Noite calma', idea: 'Poucos carros, lentos, com rastros longos que brilham ao se cruzar.' },
  { id: 'paineis', name: 'Avenidas com painéis', idea: 'O mesmo trânsito e painéis amarelos acendendo nos cruzamentos: os veículos de mídia.' },
  { id: 'quadras', name: 'Avenidas e quadras', idea: 'Quarteirões preenchidos entre as ruas, como no símbolo, com o trânsito passando.' },
] as const;

export type LoginBackgroundId = typeof LOGIN_BACKGROUNDS[number]['id'];

const STORAGE_KEY = 'geomidia_login_background';
const DEFAULT: LoginBackgroundId = LOGIN_BACKGROUNDS[0].id;

function readStored(): LoginBackgroundId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return LOGIN_BACKGROUNDS.some((item) => item.id === stored) ? (stored as LoginBackgroundId) : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

const selectedId = ref<LoginBackgroundId>(import.meta.env.DEV ? readStored() : DEFAULT);

watch(selectedId, (id) => {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Sem armazenamento a escolha vale só para esta aba.
  }
});

export function useLoginBackground() {
  return { selectedId, variants: LOGIN_BACKGROUNDS };
}
