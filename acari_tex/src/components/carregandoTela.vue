<template>
  <div class="flex flex-col items-center justify-center">
    <div ref="animacao" style="width: 200px; height: 200px;"></div>
    <p class="mt-2">Carregando produção...</p>
  </div>
</template>

/* eslint-disable vue/multi-word-component-names */
<script>
import lottie from "lottie-web";
import animacaoEsteira from "@/assets/animations/esteira.json";

export default {
  name: "Carregando-tela",
  mounted() {
    lottie.loadAnimation({
      container: this.$refs.animacao,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData: animacaoEsteira,
    });
  },
};
</script>
