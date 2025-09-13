<template>
  <div class="login-wrapper">
    <!-- Lado esquerdo: Imagem -->
    <div class="login-image">
      <img src="@/assets/img.png" alt="Imagem de Login" />
    </div>

    <!-- Lado direito: Formulário -->
    <div class="login-form-container">

      <form class="login-form" @submit.prevent="getlogin">
        <h2 class="text-center mb-4">Bem-vindo</h2>

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
          <label for="password">Senha</label>
          <input
            type="password"
            id="password"
            v-model="password"
            placeholder="Digite sua senha"
          />
        </div>

        <button type="submit" class="btn-login">Entrar</button>
        <!-- 
        <p class="text-center mt-3">
          Não tem acesso?
          <RouterLink to="/cadastro">Registre-se</RouterLink>
        </p>-->
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
    };
  },
  methods: {
    async getlogin() {
      try {
        const response = await api.post("/user/login", {
          usuario: {
            email: this.email,
            senha: this.password,
          },
        });

        const authStore = useAuthStore();
        authStore.setToken(response.headers.authorization);
        authStore.setUsuario(response.data.usuario);

        router.push("/Dashboard");
      } catch (error) {
        console.error(error);
        Swal.fire({
          icon: "error",
          title: "E-mail ou senha incorretos",
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
  min-height: 100vh;
  background-color: #dedede;
}

/* Lado esquerdo - Imagem */
.login-image {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-image img {
  max-width: 80%;
  height: auto;
}

/* Lado direito - Formulário */
.login-form-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background-color: #fff;
  padding: 40px;
}

.login-form {
  max-width: 600px;
  margin: 0 auto;
}

.login-form h2 {
  font-size: 28px;
  font-weight: 600;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: flex;
  margin-bottom: 6px;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.btn-login {
  width: 100%;
  padding: 12px;
  background-color: black;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: 0.2s;
}

.btn-login:hover {
  background-color: #1f1f1f;
}

.text-center {
  text-align: center;
}

a {
  color: black;
  font-weight: 500;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

/* Responsividade */
@media screen and (max-width: 768px) {
  .login-wrapper {
    flex-direction: column;
  }

  .login-image {
    display: none;
  }

  .login-form-container {
    flex: none;
    width: 100%;
    min-height: 100vh;
  }
}
</style>
