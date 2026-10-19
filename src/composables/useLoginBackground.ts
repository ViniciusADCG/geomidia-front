import { ref, watch } from 'vue';

// Fundo da tela de login: avenidas e quadras com placas de raio que surgem quando um carro passa. A troca só existe em desenvolvimento;
// em produção vale o primeiro da lista.
export const LOGIN_BACKGROUNDS = [
  { id: 'discreta', name: 'Discreta', idea: '8 carros; cerca de metade faz surgir uma placa com raio ao passar, que dura 6 segundos.' },
  { id: 'destaque', name: 'Destaque na passagem', idea: '6 carros; todos fazem surgir uma placa, com um anel que se expande e assenta no raio.' },
  { id: 'calma', name: 'Calma', idea: '5 carros lentos com rastros longos; a placa sobe do chão, o raio se desenha e ela fica 10 segundos.' },
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
