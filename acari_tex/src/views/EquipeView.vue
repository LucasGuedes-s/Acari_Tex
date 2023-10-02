<template>
  <div>
    <h1>Minha Equipe</h1>
    <div>
      <AdicionarFuncionario />
    </div>
    <div>
      <div class="conteiner" v-for="item in funcionarios" :key="item.id">
        <img src="@/assets/pessoa.svg">
        <div class="funcionario">Nome: {{ item.nome_do_funcionario }}</div>
        <div class="funcionario">Funções: {{ item.funcoes }}</div>
        <div class="funcionario">PIX: {{ item.pix }}</div>
        <div class="funcionario">Notas: {{ item.notas }}</div>
        <div class="button-container" @click="demitirFuncionario()">
          <span class="tooltip-demitir">Demitir</span>
        </div>
        <section class="buttons">
          <div class="button-container">
            <span class="tooltip">Detalhar</span>
          </div>
          <div class="button-container">
            <span class="tooltip">Registrar Falta</span>
          </div>
        </section>
      </div>
    </div>
    <div>
      <SidebarNav />
    </div>
    <section>
      <h1></h1>
    </section>
  </div>
</template>
<script>
import SidebarNav from '@/components/Sidebar.vue';
import AdicionarFuncionario from '@/components/AdicionarFuncionario.vue';
import Axios from 'axios'
import Swal from 'sweetalert2'

export default {
  name: 'funcionarios-equipe',
  data() {
    return {
      nome: null,
      idade: null,
      funcoes: null,
      aniversario: null,
      identidade: null,
      cpf: null,
      pis: null,
      pix: null,
      notas: null,
      funcionarios: null
    }
  },
  components: {
    SidebarNav,
    AdicionarFuncionario
  },
  methods: {
    async getFuncionarios() {
      Axios.get(`http://localhost:3333/Funcionarios`)
        .then(response => {
          console.log(response.status)
          console.log(response.data.funcionarios)
          this.funcionarios = response.data.funcionarios
        })
        .catch(error => {
          console.error(error);
        });
    },
    async demitirFuncionario() {
      Swal.fire({
        title: 'Confirmar Demissão',
        text: 'Tem certeza de que deseja demitir este funcionário?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#00692b',
        confirmButtonText: 'Sim, demitir!',
        cancelButtonText: 'Cancelar'
      })
    }
  },
  mounted() {
    this.getFuncionarios();
  }

}
</script>
<style scoped>
.conteiner {
  display: inline-block;
  background-color: #ffff;
  padding: 30px;
  margin: 10px auto;
  width: 50%;
  border-radius: 20px;
}

.conteiner img {
  width: 100px;
  float: left;
}

.buttons {
  display: -webkit-box;
}

.tooltip {
  display: flex;
  margin: 10px 10px 0px 0;
  border-radius: 30px;
  align-items: center;
  cursor: pointer;
  float: right;
  padding: 10px;
  background-color: #00692b;
  color: #fff;
}

.tooltip-demitir {
  display: flex;
  margin: 10px 10px 0px 0;
  border-radius: 30px;
  align-items: center;
  cursor: pointer;
  float: right;
  padding: 10px;
  background-color: #b80000;
  color: #fff;
}

.funcionario {
  font-size: 18px;
  display: flex;
  flex-direction: row;
  padding: 5px;
  padding-left: 25px;
  align-items: center;
}
</style>

  