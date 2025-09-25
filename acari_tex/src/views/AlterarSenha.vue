<template>
  <div class="d-flex vh-100">
    <!-- Lado esquerdo (verde com logo) -->
    <div class="col-12 col-md-6 bg-green d-flex flex-column justify-content-center align-items-center text-white p-4">
      <img src="@/assets/Logofundo.png" alt="Logo" class="logo mb-3" />
      <h2 class="fw-bold text-center">Bem-vindo de volta</h2>
      <p class="text-center mt-2">
        Solicite a alteração de senha e recupere seu acesso.
      </p>
    </div>

    <!-- Lado direito (formulário) -->
    <div class="col-12 col-md-6 d-flex justify-content-center align-items-center bg-light">
      <div class="card shadow p-4 w-75" style="max-width: 400px;">
        <h4 class="text-center mb-3">Esqueceu sua senha?</h4>
        <p class="text-center text-muted mb-4">
          Informe seu e-mail e enviaremos um link para redefinir sua senha.
        </p>

        <form @submit.prevent="solicitarAlteracao">
          <div class="mb-3">
            <label for="email" class="form-label">E-mail</label>
            <input
              type="email"
              v-model="email"
              class="form-control"
              id="email"
              placeholder="Digite seu e-mail"
              required
            />
          </div>

          <button type="submit" class="btn w-100 botao" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            Solicitar Alteração
          </button>
        </form>

        <div v-if="mensagem" class="alert alert-info mt-3 text-center">
          {{ mensagem }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import api from '@/Axios';
import Swal from 'sweetalert2';

export default {
  name: "TelaSolicitarSenha",
  data() {
    return {
      email: "",
      loading: false,
      mensagem: "",
    };
  },
  methods: {
    async solicitarAlteracao() {
      this.loading = true;
      this.mensagem = "";
      const email = ""
      try {
        const res = await api.post(`/solicitar/alteracao-senha/${email}`)
        if(res.data.status === 201){
          Swal.fire('Sucesso', 'Foi enviado ao seu E-mail o link de alteração', 'success')
        }
        else{
          Swal.fire('Erro', `Erro ao solicitar alteração de senha`)
        }
      } catch (error) {
        Swal.fire('Erro', `Erro ao solicitar alteração de senha`)
        this.mensagem = "Ocorreu um erro. Tente novamente mais tarde.";
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.bg-green {
  background-color: var(--verde-escuro); /* verde escuro elegante */
}

.logo {
  max-width: 180px;
}
label{
  display: flex;
}
.botao{
  background-color: var(--verde-escuro);
  color: white;
}
</style>
