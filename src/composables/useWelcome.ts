import { ref } from 'vue';

// Transição do login para o painel ("Pino pousa"): o cartão se achata numa linha amarela, o símbolo
// se monta sobre o mesmo fundo animado com a saudação e voa até o logo da faixa, enquanto o menu
// lateral entra pela esquerda. O login chama leave() e depois play().

// leaving: o cartão do login está saindo; greeting: saudação sobre o fundo; landing: símbolo indo ao logo.
export type WelcomePhase = 'idle' | 'leaving' | 'greeting' | 'landing';

// Quanto tempo o cartão leva para sair da tela.
export const LEAVE_MS = 650;

const phase = ref<WelcomePhase>('idle');

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useWelcome() {
  return {
    phase,
    // Tira o cartão do login e resolve quando ele já saiu da tela.
    leave: () => new Promise<void>((resolve) => {
      phase.value = 'leaving';
      window.setTimeout(resolve, prefersReducedMotion() ? 0 : LEAVE_MS);
    }),
    play: () => { phase.value = 'greeting'; },
    land: () => { phase.value = 'landing'; },
    finish: () => { phase.value = 'idle'; },
  };
}
