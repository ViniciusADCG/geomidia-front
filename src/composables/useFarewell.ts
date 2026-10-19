import { ref } from 'vue';

// Transição do painel de volta ao login ao sair ("Cidade sai do logo"): a cidade se abre num círculo
// a partir do logo da faixa até cobrir o painel, o símbolo vai ao centro com a despedida, a sessão é
// encerrada e o cartão do login aparece saindo do desfoque. O App chama leave(), encerra a sessão,
// vai para /login e chama arrive().

// leaving: a animação está cobrindo o painel; arriving: o login já está na tela e o cartão está voltando.
export type FarewellPhase = 'idle' | 'leaving' | 'arriving';

// Quanto tempo leva para cobrir o painel e para o cartão do login voltar.
export const LEAVE_MS = 1900;
export const ARRIVE_MS = 650;

const phase = ref<FarewellPhase>('idle');
// Nome mostrado na despedida, guardado antes de a sessão ser encerrada.
const userName = ref<string | null>(null);

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useFarewell() {
  return {
    phase,
    userName,
    // Cobre o painel e resolve quando a tela já mostra só o fundo do login.
    leave: (name: string | null) => new Promise<void>((resolve) => {
      if (prefersReducedMotion()) {
        resolve();
        return;
      }
      userName.value = name;
      phase.value = 'leaving';
      window.setTimeout(resolve, LEAVE_MS);
    }),
    // O login já está na tela: o cartão volta e a animação termina.
    arrive: () => {
      if (phase.value !== 'leaving') return;
      phase.value = 'arriving';
      window.setTimeout(() => { phase.value = 'idle'; }, ARRIVE_MS);
    },
  };
}
