import { ref, watch } from 'vue';

// Fundo Avenidas e quadras da tela de login, com estilos de painel em avaliação. A troca só existe em desenvolvimento;
// em produção vale o primeiro da lista.
export const LOGIN_BACKGROUNDS = [
  { id: 'placa', name: 'Placa simples', idea: 'Plaquinhas amarelas em postes sobre as quadras, acendendo devagar.' },
  { id: 'outdoor', name: 'Outdoor iluminado', idea: 'Outdoors largos com moldura e dois pés, com a luz pulsando.' },
  { id: 'led', name: 'Painel de LED', idea: 'Telas que trocam de cor de tempos em tempos, como painéis digitais trocando de anúncio.' },
  { id: 'isometrico', name: 'Isométrico', idea: 'Painéis desenhados na mesma perspectiva das ruas, alinhados à rua.' },
  { id: 'raio', name: 'Com raio', idea: 'Cada placa com o círculo do raio mínimo em perspectiva, e um anel pulsando de dentro para fora.' },
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
