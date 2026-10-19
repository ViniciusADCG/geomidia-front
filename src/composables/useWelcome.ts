import { ref } from 'vue';

// Liga a animação de boas-vindas (WelcomeOverlay). O login chama play() ao entrar.
const active = ref(false);

export function useWelcome() {
  return {
    active,
    play: () => { active.value = true; },
    finish: () => { active.value = false; },
  };
}
