<template>
  <div class="admin-wrapper">
    <h1 class="titulo">Administração</h1>
    <p class="subtitulo">Página de teste do módulo de controle interno</p>

    <div class="card-teste">
      <p><strong>Usuário:</strong> {{ usuario?.nome }} ({{ usuario?.email }})</p>
      <p>
        <strong>superAdmin no navegador:</strong>
        {{ usuario?.superAdmin ? "sim" : "não" }}
      </p>

      <p>
        <strong>Resposta do servidor (/admin/ping):</strong>
        <span :class="['status', estado]">{{ mensagem }}</span>
      </p>

      <button class="btn-testar" @click="testarPing" :disabled="carregando">
        {{ carregando ? "Testando..." : "Testar novamente" }}
      </button>
    </div>
  </div>
</template>

<script>
import api from "@/Axios";
import { useAuthStore } from "@/store/store.js";

export default {
  name: "AdminView",
  data() {
    return {
      usuario: null,
      carregando: false,
      estado: "",
      mensagem: "Aguardando...",
    };
  },
  mounted() {
    const authStore = useAuthStore();
    this.usuario = authStore.pegar_usuario;
    this.testarPing();
  },
  methods: {
    async testarPing() {
      this.carregando = true;
      this.estado = "";
      this.mensagem = "Aguardando...";
      try {
        const authStore = useAuthStore();
        // O token já vem como "Bearer <jwt>": não acrescentar "Bearer" de novo.
        const response = await api.get("/admin/ping", {
          headers: { Authorization: authStore.pegar_token },
        });
        this.estado = "ok";
        this.mensagem = `OK (${response.status}) ${JSON.stringify(response.data)}`;
      } catch (error) {
        this.estado = "erro";
        const status = error.response?.status;
        this.mensagem = status
          ? `Erro ${status}: ${error.response?.data?.message || "sem mensagem"}`
          : "Sem resposta do servidor";
      } finally {
        this.carregando = false;
      }
    },
  },
};
</script>

<style scoped>
.admin-wrapper {
  min-height: 100vh;
  padding: 40px 20px;
  background: #f5f7f6;
}
.titulo {
  color: #0d3927;
  font-size: 28px;
  font-weight: 700;
}
.subtitulo {
  color: #666;
  margin-bottom: 24px;
}
.card-teste {
  max-width: 560px;
  margin: 0 auto;
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  text-align: left;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}
.status.ok {
  color: #145a32;
  font-weight: 600;
}
.status.erro {
  color: #b3261e;
  font-weight: 600;
}
.btn-testar {
  margin-top: 12px;
  padding: 10px 18px;
  background: #145a32;
  color: #fff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
}
.btn-testar:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>