import { ref, watch } from 'vue';

// Fundos animados da tela de login em avaliação. A troca só existe em desenvolvimento;
// em produção vale o primeiro da lista.
export const LOGIN_BACKGROUNDS = [
  { id: 'mapa', name: 'Mapa vivo', idea: 'Quarteirões em perspectiva deslizando devagar; lotes acendem como veículos sendo cadastrados.' },
  { id: 'raios', name: 'Raios', idea: 'Pontos espalhados emitem círculos que se expandem: o raio mínimo de cada veículo.' },
  { id: 'cidade', name: 'Cidade em movimento', idea: 'A foto de Campo Grande com zoom muito lento e luzes piscando sobre a cidade.' },
  { id: 'avenidas', name: 'Avenidas', idea: 'Malha de ruas em perspectiva com rastros de luz passando, como o trânsito diante dos painéis.' },
  { id: 'ondas', name: 'Ondas da marca', idea: 'Os azuis da marca se movendo devagar, com linhas finas na inclinação da placa PREFCG.' },
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
