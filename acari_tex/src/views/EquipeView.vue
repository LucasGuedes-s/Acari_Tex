<template>
  <div>
    <h1>Minha Equipe</h1>
    <div>
      <AdicionarFuncionario />
    </div>
    <div>
      <div class="conteiner" v-for="item in funcionarios" :key="item.id">
        <img :src="item.foto">
        <div class="funcionario">Nome: {{ item.nome_do_funcionario }}</div>
        <div class="funcionario">Funções: {{ item.funcoes }}</div>
        <div class="funcionario">PIX: {{ item.pix }}</div>
        <div class="funcionario">Notas: {{ item.notas }}</div>
        <div class="button-container" @click="demitirFuncionario()">
          <span class="tooltip-demitir">Demitir</span>
        </div>
        <section class="buttons">
          <div class="button-container">
            <span class="tooltip" @click="getFuncionario(item.id)">Detalhar</span>
          </div>
          <div class="button-container" @click="registro(item.id, item.nome_do_funcionario)">
            <span class="tooltip">Registro</span>
          </div>
        </section>
      </div>
      <conteiner>
        <div v-if="showModalFuncionario" class="modal-background">
          <div class="modal-content">
            <img class="img-close" @click="showModalFuncionario = false" src="@/assets/close.png" />
            <div class="funcionario-modal">
              <h1>Funcionário: {{ funcionario.nome_do_funcionario  }}</h1>
              <div class="funcionario-modal">ID: {{ funcionario.id }}</div>
              <div class="funcionario-modal">Funções: {{ funcionario.funcoes }}</div>
              <div class="funcionario-modal">aniversario: {{ funcionario.aniversario }}</div>
              <div class="funcionario-modal">PIS: {{ funcionario.pis }}</div>
              <div class="funcionario-modal">PIX: {{ funcionario.pix }}</div>
              <div class="funcionario-modal">aniversario: {{ funcionario.aniversario }}</div>
              <div class="funcionario-modal">Notas: {{ funcionario.estoque }}</div>
            </div>
          </div>
        </div>
      </conteiner >
      <conteiner v-if="showModalRegistro" class="modal-background">
        <div class="modal-content" >
            <img class="img-close" @click="showModalRegistro = false" src="@/assets/close.png" />
            <div class="funcionario-modal">
              <h1>Registro de funcionário: {{ registroFuncionario }}</h1>
              <div>
                <label>Registro de funcionário: </label>
                <select>
                  <option>15 min</option>
                  <option>1h</option>
                  <option>2h</option>
                  <option>3h</option>
                  <option>Meio dia</option>
                  <option>O dia inteiro</option>
                </select>
              </div>
              <div class="button-container">
                <span class="tooltip">Registrar Horas extras</span>
              </div>
              <div class="button-container">
                <span class="tooltip">Registrar falta</span>
              </div>
            </div>
          </div>
      </conteiner>
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
      showModalFuncionario: false,
      showModalRegistro: false,
      registroFuncionario: null,
      nome: null,
      idade: null,
      funcoes: null,
      aniversario: null,
      identidade: null,
      cpf: null,
      pis: null,
      pix: null,
      notas: null,
      funcionarios: null,
      funcionario: null
    }
  },
  components: {
    SidebarNav,
    AdicionarFuncionario
  },
  methods: {
    async registro(id, nome_do_funcionario) {
      this.showModalRegistro = true
      this.registroFuncionario = nome_do_funcionario
      console.log(nome_do_funcionario)
      console.log(id)
      
      /*Axios.get(`http://localhost:3333/Funcionario/${id}`)
        .then(response => {
          console.log(response.status)
          console.log(response.data.funcionario)
          this.funcionario = response.data.funcionario
          this.showModalFuncionario = true

        })
        .catch(error => {
          console.error(error);
        });*/
    },
    async getFuncionario(id) {
      Axios.get(`http://localhost:3333/Funcionario/${id}`)
        .then(response => {
          console.log(response.status)
          console.log(response.data.funcionario)
          this.funcionario = response.data.funcionario
          this.showModalFuncionario = true

        })
        .catch(error => {
          console.error(error);
        });
    },
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
label {
  display: inline-block;
  font-weight: bold;
}
select{
  width: 370px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-size: 14px;
}

.modal-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

/* Estilo para a div de conteúdo do modal */
.modal-content {
  background-color: #fff;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.5);
  max-width: 500px;
  width: 100%;
}

.funcionario-modal {
  background-color: #f8f8f8;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 10px;
  font-size: 16px;
  color: #333;
}

.funcionario-modal:nth-child(even) {
  background-color: #f2f2f2;
}
.img-close {
  position: absolute;
  top: 20px;
  right: 20px;
  cursor: pointer;
}

</style>

  