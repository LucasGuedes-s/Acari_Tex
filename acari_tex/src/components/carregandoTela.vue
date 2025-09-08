<template>
  <div class="carregando-container">
    <div ref="animacao" class="animacao"></div>
    <p class="texto">Carregando...</p>
  </div>
</template>

<style scoped>
.carregando-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 0px;
}

.animacao {
  width: 200px;
  height: 200px;
}

.texto {
  font-size: 1.2rem;
  font-weight: 500;
  color: #374151; /* cinza elegante */
  letter-spacing: 1px;
  animation: piscar 1.5s infinite ease-in-out;
}

@keyframes piscar {
  0% { opacity: 0.3; }
  50% { opacity: 1; }
  100% { opacity: 0.3; }
}
</style>

<script>
import lottie from "lottie-web";
import animacaoJson from "@/assets/animations/carregando.json"; // seu JSON

export default {
  mounted() {
    lottie.loadAnimation({
      container: this.$refs.animacao,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData: animacaoJson,
      assetsPath: "/animations/images/" // 👈 caminho das imagens
    });
  }
};
</script>
<style scoped></style>