<template>
  <div class="container-nao-autorizado">
    <div class="nao-autorizado-container d-flex flex-column justify-content-center align-items-center">
      <img src="@/assets/naoautorizado.png" alt="Ícone" class="imagem"/>
      <p class="text-center mt-2">
        Você não possui autorização para acessar esta página.<br />
        Faça login para continuar.
      </p>
      <button class="botao btn-primary mt-3" @click="voltarLogin">
        Voltar para Login
      </button>
    </div>
  </div>
</template>

<script>
import router from '@/router';

export default {
  name: "NaoAutorizado",
  methods: {
    voltarLogin() {
      router.push('/');
    }
  }
};
</script>

<style scoped>
.container-nao-autorizado {
  background-color: rgb(255, 255, 255);
  max-width: 100%;
}
.nao-autorizado-container {
  height: 100vh;
  text-align: center;
}
.botao{
  background-color: #2e7d32;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.imagem {
  width: 450px;
  height: 450px;
}

h1 {
  font-weight: bold;
}

p {
  color: #555;
  max-width: 400px;
}

button {
  padding: 0.5rem 1.5rem;
  font-size: 1rem;
}
</style>
