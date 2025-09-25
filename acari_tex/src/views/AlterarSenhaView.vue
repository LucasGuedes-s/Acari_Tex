<template>
  <div class="login-wrapper">
    <div class="bg-wave"></div>

    <div class="login-form-container">
      <form class="login-form" @submit.prevent="alterSenha">
        <h2 class="title">Alterar Senha 👋</h2>
        <p class="subtitle">Entre para acessar sua conta</p>
        <div class="form-group">
          <label for="username">E-mail</label>
          <input
            type="text"
            id="username"
            v-model="email"
            placeholder="Digite seu e-mail"
          />
        </div>

        <div class="form-group">
          <label for="password">Nova senha</label>
          <input
            type="password"
            id="senha"
            v-model="senha"
            placeholder="Digite sua senha"
          />
            <label for="password">Repita a nova senha</label>

            <input
            type="password"
            id="password"
            v-model="password"
            placeholder="Digite sua senha"
          />
        </div>

        <button type="submit" class="btn-login">Entrar</button>
      </form>
    </div>
  </div>
</template>

<script>
import router from "@/router";
import Swal from "sweetalert2";
import { useAuthStore } from "@/store/store.js";
import api from "@/Axios";

export default {
  name: "TelaLogin",
  data() {
    return {
      email: "",
      password: "",
      senha: ""
    };
  },

  mounted() {
    const store = useAuthStore();
    store.logout();
    return store;
  },
  methods: {
    async alterSenha() {
      try {
        if(this.senha === this.password){
            const response = await api.post("/alterar/senha",
                {
                    email: this.email,
                    novaSenha: this.password,
                },
            );
            if(response.status === 201){
                Swal.fire('Sucesso', 'Senha alterada com sucesso', 'success')
                router.push('/login')
            }

        }

      } catch (error) {
        console.error(error);
        Swal.fire({
          icon: "error",
          title: "Não foi possível alterar sua senha",
          timer: 4000,
        });
      }
    },
  },
};
</script>

<style scoped>
.login-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f5f7f6;
  position: relative;
  overflow: hidden;
  padding: 20px;
}

.bg-wave {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 220px;
  background: linear-gradient(135deg, #0d3927, #145a32);
  clip-path: ellipse(120% 100% at 50% 0%);
  z-index: 1;
}

.login-form-container {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 400px;
}

.login-form {
  background: #fff;
  border-radius: 16px;
  padding: 32px 28px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  animation: fadeIn 0.5s ease-in-out;
}

.title {
  text-align: center;
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 6px;
  color: #0d3927;
}

.subtitle {
  text-align: center;
  font-size: 14px;
  color: #666;
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 18px;
}

.form-group label {
  display: flex;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.3s;
}

.form-group input:focus {
  border-color: #145a32;
}

.btn-login {
  width: 100%;
  padding: 14px;
  background: #145a32;
  color: #fff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  font-size: 16px;
  transition: background 0.3s;
}

.btn-login:hover {
  background: #0d3927;
}

/* Animação */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsivo */
@media (max-width: 480px) {
  .title {
    font-size: 22px;
  }
  .login-form {
    padding: 24px 20px;
  }
}
</style>
