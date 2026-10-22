<template>
  <div v-if="visible" role="status" aria-live="polite" class="fixed inset-0 z-[3000] overflow-hidden">
    <div ref="backdrop" class="absolute inset-0">
      <LoginBackground />
    </div>

    <div :class="cn('absolute inset-0 grid place-items-center px-6 text-center', darkScene ? 'text-white' : 'text-brand-night')">
      <div class="flex flex-col items-center">
        <span ref="symbol" class="relative block size-36" aria-hidden="true">
          <span ref="darkMark" class="absolute inset-0 [&>svg]:size-full" v-html="darkSvg" />
          <span v-if="!darkScene" ref="lightMark" class="absolute inset-0 opacity-0 [&>svg]:size-full" v-html="lightSvg" />
        </span>
        <p ref="text" class="mt-6 text-4xl font-semibold tracking-tight opacity-0 sm:text-5xl">{{ message }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import { geomidiaSymbolSvg } from '@/components/brand/geomidia-marks';
import LoginBackground from '@/components/login/LoginBackground.vue';
import { isNightAt, isPhoneScreen, sceneHour, useSceneHourSetting } from '@/components/login/login-scenes';
import { cn } from '@/lib/utils';
import { useFarewell } from '@/composables/useFarewell';
import { farewellMessage } from '@/lib/greeting';

// Animação de saída ("Cidade sai do logo"): o fundo claro do login se abre num círculo a partir do logo
// da faixa até cobrir o painel, e o símbolo vai do logo ao centro com a despedida. Quando termina, o
// App encerra a sessão e abre o login, que tem o mesmo fundo; esta camada some sem emenda.
const farewell = useFarewell();

// À noite, texto e símbolo em branco. Lido ao abrir a animação.
const hourSetting = useSceneHourSetting();
const darkScene = ref(false);
const backdrop = ref<HTMLElement | null>(null);
const symbol = ref<HTMLElement | null>(null);
const darkMark = ref<HTMLElement | null>(null);
const lightMark = ref<HTMLElement | null>(null);
const text = ref<HTMLElement | null>(null);

const visible = computed(() => farewell.phase.value === 'leaving');
const message = computed(() => farewellMessage(farewell.userName.value));
// O símbolo sai do logo na versão da faixa azul e chega ao centro na versão para fundo claro.
const darkSvg = geomidiaSymbolSvg('onDark');
const lightSvg = geomidiaSymbolSvg('onLight');
const EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';

// O logo da faixa, de onde a cidade e o símbolo saem. No celular não há logo do GeoMídia na barra.
function logoRect(): DOMRect | null {
  const rect = document.querySelector('[data-welcome-target] > div > span')?.getBoundingClientRect();
  return rect && rect.width > 0 ? rect : null;
}

function play() {
  const rect = logoRect();
  const at = rect ? `${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px` : '50% 50%';
  backdrop.value?.animate(
    [{ clipPath: `circle(0px at ${at})` }, { clipPath: `circle(150% at ${at})` }],
    { duration: 900, easing: EASE, fill: 'both' },
  );

  const element = symbol.value;
  if (element) {
    const to = element.getBoundingClientRect();
    element.style.transformOrigin = 'top left';
    element.animate(
      rect
        ? [{ transform: `translate(${rect.left - to.left}px, ${rect.top - to.top}px) scale(${rect.width / to.width})` }, { transform: 'none' }]
        : [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'none' }],
      { duration: 900, easing: EASE, fill: 'both' },
    );
    if (!darkScene.value) darkMark.value?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, easing: EASE, fill: 'both' });
    lightMark.value?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, easing: EASE, fill: 'both' });
    element.animate([{ opacity: 1 }, { opacity: 0 }], { delay: 1650, duration: 350, easing: 'ease-in', fill: 'forwards' });
  }

  text.value?.animate(
    [
      { opacity: 0, transform: 'translateY(12px)', offset: 0 },
      { opacity: 1, transform: 'none', offset: 0.2 },
      { opacity: 1, transform: 'none', offset: 0.8 },
      { opacity: 0, transform: 'none', offset: 1 },
    ],
    { delay: 900, duration: 1000, easing: 'ease-out', fill: 'both' },
  );
}

watch(visible, async (shown) => {
  if (!shown) {
    document.documentElement.classList.remove('welcome-hide-mark');
    return;
  }
  darkScene.value = !isPhoneScreen() && isNightAt(sceneHour(hourSetting.value));
  document.documentElement.classList.add('welcome-hide-mark');
  await nextTick();
  play();
});
</script>
