<template>
  <div class="login-background fixed inset-0" aria-hidden="true" />
</template>

<style scoped>
/* Fundo da versão anterior do login: rede de pontos e a cidade esmaecida, em tons claros.
   As boas-vindas e a despedida usam o mesmo fundo, e as animações emendam com o login.
   Fica preso à tela: se a página rolar, a imagem não muda de escala e não pula na troca.
   Camada própria: o que se anima por cima não obriga a redesenhar a imagem. */
.login-background {
  background: #edf5fa url('/login/fundo.jpg') center / cover no-repeat;
  will-change: transform;
}
</style>
