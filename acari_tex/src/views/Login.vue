<template>
  <LoginNav />
  <div class="login-container">
    <img src="@/assets/img.png" alt="Login Image">

    <form class="login-form" @submit.prevent="getlogin">
      <h2>Login</h2>
      <div class="form-group">
        <label for="username">E-mail:</label>
        <input type="text" id="username" v-model="email" />
      </div>
      <div class="form-group">
        <label for="password">Password:</label>
        <input type="password" id="password" v-model="password" />
      </div>
      <button type="submit" click="getlogin">Login</button>
      <p class="mb-5 pb-lg-2">Não tem acesso? <a href="/cadastro">Registre-se</a></p>
    </form>
  </div>
</template>
<script>
import router from '@/router';
import Swal from 'sweetalert2'
import { useAuthStore } from '@/store/store.js';
import LoginNav from '@/components/NavLogin.vue';
import api from '@/Axios';

export default {
  name: 'HomeAcariTex',
  components: {
    LoginNav,
  },
  data() {
    return {
      email: null,
      password: ""
    }
  },
  methods: {
    async getlogin() {
      await api.post("/user/login", {
        usuario: {
          email: this.email,
          senha: this.password,
        }
      }).then(response => {
        const authStore = useAuthStore();

        console.log(response.data.usuario)
        console.log(response.headers.authorization);
        authStore.setToken(response.headers.authorization );
        authStore.setUsuario(response.data.usuario);

        router.push('/Dashboard')

    }).catch( error =>{
      console.error(error);
        Swal.fire({
          icon: 'erro',
          title: 'CNPJ ou senha incorretos',
          timer: 4000,
        })
      })
    }
  }
}
</script>
<style scoped>

.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
}

.login-form {
  width: 400px;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: #fff;
}

.login-form h2 {
  margin-top: 0;
}

.form-group {
  margin-bottom: 10px;
}

.form-group label {
  text-align: left;
  display: block;
  margin-bottom: 5px;
}

.form-group input {
  width: 95%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

button[type="submit"] {
  display: block;
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 5px;
  background-color: black;
  color: #fff;
  cursor: pointer;
}

:hover button {
  background-color: #1f1f1f;
}

img {
  max-width: 40%;
  padding: 40px;
  height: auto;
  margin-right: 20px;
}

@media screen and (max-width: 600px) {
  img {
    display: none;
  }
}
</style>