<template>
  <div>
    <NavBarUser />
    <SidebarNav />
    <main class="content-wrapper flex-grow-1">
      <div class="container_profissional" v-for="item in funcionarios" :key="item.id">
        <div class="card-content">
          <div class="imagem-funcionario">
            <img :src="item.foto" alt="Foto do funcionário" />
          </div>
          <div class="info-funcionario">
            <div class="funcionario">Nome: {{ item.nome }}</div>
            <div class="funcionario">Funções: {{ item.funcoes }}</div>
            <div class="funcionario">Notas: {{ item.notas }}</div>
          </div>
        </div>

        <div class="acoes-funcionario">
          <button @click="getFuncionario(item.id)">Detalhar</button>
          <button class="demitir" @click="demitirFuncionario()">Demitir</button>
          <button class="registro" @click="registrarProducao(item.id)">Registrar Produção</button>
        </div>

        <conteiner>
          <div v-if="showModalFuncionario" class="modal-background">
            <div class="modal-content">
              <img class="img-close" @click="showModalFuncionario = false" src="@/assets/close.png" />
              <div class="funcionario-modal">
                <h1>Funcionário: {{ funcionario.nome_do_funcionario }}</h1>
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
        </conteiner>
      </div>
    </main>
  </div>
</template>
<script>
import SidebarNav from '@/components/Sidebar.vue';
import Axios from 'axios'
import Swal from 'sweetalert2'
import NavBarUser from '@/components/NavBarUser.vue';
import { useAuthStore } from '@/store/store';

export default {
  name: 'funcionarios-equipe',
  setup() {
    const store = useAuthStore();
    return { store };
  },
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
    NavBarUser,

  },
  methods: {
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
      const token = this.store.pegar_token;

      Axios.get(`http://localhost:3333/Funcionarios`, {
        headers: {
          Authorization: `${token}` // Enviando o token no cabeçalho
        }
      })
        .then(response => {
          console.log(response.status);
          console.log(response.data.funcionarios);
          this.funcionarios = response.data.funcionarios;
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
.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
  /* Espaço para a sidebar */
  width: 100%;
}

.container_profissional {
  margin: 1rem;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 12px;
  background-color: #f9f9f9;
  display: flex;
  flex-direction: column;
}

/* Bloco com imagem e informações */
.card-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.imagem-funcionario img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
}

.info-funcionario {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}

/* Bloco com os botões */
.acoes-funcionario {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.acoes-funcionario button {
  padding: 0.4rem 0.9rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  background-color: #eee;
  transition: background-color 0.3s;
  width: 180px;
}

.acoes-funcionario button:hover {
  background-color: #ccc;
}

.acoes-funcionario .demitir {
  background-color: #eee;
}
.acoes-funcionario .registro {
  background-color: #008d3b;
  color: white;
}

.acoes-funcionario .registro:hover {
  background-color: #00692b;
}
.acoes-funcionario .demitir:hover {
  background-color: #ff484b;
  color: white;
}

/* Responsividade para celular */
@media (max-width: 600px) {
  .card-content {
    flex-direction: row;
    align-items: center;
  }

  .content-wrapper {
    padding-left: 80px;
    /* Remove a margem lateral */
    z-index: 0;
  }

  .acoes-funcionario {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-top: 1rem;
  }

  .acoes-funcionario button {
    width: 90%;
  }
}

/* Responsivo para telas maiores */
@media (min-width: 601px) {
  .container_profissional {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }

  .card-content {
    flex: 1;
    align-items: center;
  }

  .acoes-funcionario {
    flex-direction: column;
    justify-content: center;
    align-items: flex-end;
    margin-left: 1rem;
  }

  .acoes-funcionario button {
    width: 140px;
  }
}
</style>