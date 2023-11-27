<template>
  <div class="login-container">
    <form class="login-form" @submit.prevent="getlogin">
      <h2>Login</h2>
      <div class="form-group">
        <label for="username">CNPJ:</label>
        <input type="text" id="username" v-model="cnpj" />
      </div>
      <div class="form-group">
        <label for="password">Password:</label>
        <input type="password" id="password" v-model="password" />
      </div>
      <button type="submit" click="getlogin">Login</button>
      <p class="mb-5 pb-lg-2">Não tem acesso? <a href="/cadastro">Registre-se</a></p>
    </form>
    <img src="@/assets/imagem.png" alt="Login Image">
  </div>
</template>
<script>
import router from '@/router';
import Axios from 'axios'
import Swal from 'sweetalert2'

export default {
  name: 'HomeAcariTex',
  data() {
    return {
      cnpj: null,
      password: ""
    }
  },
  methods: {
    async getlogin() {
      await Axios.post("http://localhost:3333/user/login", {
        user: {
          cnpj: this.cnpj,
          senha: this.password,
        }
      }).then(response => {
        console.log(response.status)
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
  margin-top: 80px;
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
  height: auto;
  margin-right: 20px;
}

@media screen and (max-width: 600px) {
  img {
    display: none;
  }
}
</style>