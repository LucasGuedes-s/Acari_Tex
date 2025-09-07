<template>
  <div class="d-flex flex-column flex-md-row">
    <SidebarNav />
    <main class="content-wrapper flex-grow-1">
        <div class="nav row justify-content-center">
          <div class="form col-12 col-md-10 col-lg-8  ">
            <div class="search">
                <select name="Pesquisar" id="hora" v-model="profissional">
                  <option value="" disabled>Pesquisar por grupo</option>
                  <option value="08:00">Equipe1</option>
                  <option value="09:00">Equipe2</option>
                  <option value="10:00">Equipe3</option>
                </select>
                <input type="text" id="search-input" placeholder="Pesquisar nome do profissional..." v-model="pesquisa">
                <RouterLink to="/adicionar-profissional"><button class="btn-button">Novo profissional</button></RouterLink>

                <NavBarUser class="nav" />
            </div>
          </div>
        </div>
      <div class="container_profissional" v-for="funcionario in filteredProfissional" :key="funcionario.id">
        <div class="card-content">
          <div class="imagem-funcionario">
            <img :src="funcionario.foto" alt="Foto do funcionário" />
          </div>
          <div class="info-funcionario">
            <div class="funcionario">Nome: {{ funcionario.nome }}</div>
            <div class="funcionario">Funções: {{ funcionario.funcoes }}</div>
            <div class="funcionario">Notas: {{ funcionario.notas }}</div>
          </div>
        </div>

        <div class="acoes-funcionario">
          <button @click="producao(funcionario.email)">Produção</button>
          <button class="demitir" @click="demitirFuncionario()">Demitir</button>
          <button class="registro" @click="registrarProducao(funcionario.email, funcionario.nome)">Registrar
            Produção</button>
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
      <!-- Modal de Edição -->
      <div v-if="showModal" class="modal-overlay">
        <div class="modal-content">
          <h2>Editar Profissional</h2>

          <label for="nome">Nome:</label>
          <input type="text" id="nome_funcionario" name="nome" v-model="consultaEdit.nome">


          <label for="email">Email:</label>
          <input type="email" id="email_prof" name="email" v-model="consultaEdit.email">

          <label for="telefone">Telefone:</label>
          <input type="tel" id="telefone_prof" name="telefone" v-model="consultaEdit.telefone">

          <label for="pix">PIX:</label>
          <input type="text" id="pix" name="pix" v-model="consultaEdit.pix">

          <label for="imagem">Adicionar Imagem:</label>
          <input type="file" id="imagem_prof" name="imagem" @change="handleFileUpload">

          <div class="modal-buttons">
            <button @click="salvarEdicao">Salvar</button>
            <button @click="fecharModal">Cancelar</button>
          </div>
        </div>
      </div>
      <div v-if="showModalRegistro" class="modal-overlay">
        <div class="modal-content">
          <h2>Registrar Produção - {{ funcionario }}</h2>
          <label for="peca">Peça:</label>
          <select id="peca" v-model="pecaRegistro">
            <option v-for="peca in pecas" :key="peca.id_da_op" :value="peca.id_da_op">
              {{ peca.descricao }}
            </option>
          </select>

          <!-- Selecionar a etapa da peça -->
          <label for="funcao">Etapa da produção:</label>
          <select id="funcao" v-model="funcao">
            <option v-for="etapa in etapasFiltradas" :key="etapa.id_da_funcao" :value="etapa.id_da_funcao">
              {{ etapa.etapa.descricao }}
            </option>
          </select>

          <label for="quantidade">Quantidade:</label>
          <input type="number" id="quantidade" v-model="quantidadeRegistro">

          <label for="hora">Hora do registro</label>
          <select name="" id="hora" v-model="horaRegistro">
            <option value="08:00">08:00</option>
            <option value="09:00">09:00</option>
            <option value="10:00">10:00</option>
            <option value="11:00">11:00</option>
            <option value="12:00">12:00</option>
            <option value="13:00">13:00</option>
            <option value="14:00">14:00</option>
            <option value="15:00">15:00</option>
            <option value="16:00">16:00</option>
            <option value="17:00">17:00</option>
            <option value="18:00">18:00</option>
            <option value="1h extra">1h extra</option>
            <option value="outro">Outro</option>
          </select>

          <div class="modal-buttons">
            <button @click="fecharModal">Cancelar</button>
            <button @click="postProdução">Registrar</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
<script>
import SidebarNav from '@/components/Sidebar.vue';
import Swal from 'sweetalert2'
import { useAuthStore } from '@/store/store';
import NavBarUser from '@/components/NavBarUser.vue';
import api from '@/Axios';

export default {
  name: 'funcionarios-equipe',
  setup() {
    const store = useAuthStore();
    return { store };
  },
  computed: {
    etapasFiltradas() {
      return this.etapas
        .flat() // Junta os subarrays em um único array
        .filter(etapa => etapa.id_da_op === this.pecaRegistro);
    },
    filteredProfissional() {
        return this.funcionarios.filter(funcionario =>
            funcionario.nome.toLowerCase().includes(this.pesquisa.toLowerCase())
        );
    }
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
      funcionarios: [],
      funcionario: null,
      pecas: [],
      etapas: [],
      pecaRegistro: null,
      quantidadeRegistro: null,
      horaRegistro: null,
      funcao: null,
      pesquisa: '',
      profissional: '',
    }
  },
  components: {
    SidebarNav,
    NavBarUser
  },
  methods: {
    async producao(email) {
      this.$router.push({ name: 'ProducaoFuncionario', params: { emailFuncionario: email } })
    },
    async fecharModal() {
      this.showModalRegistro = false;
    },
    async registrarProducao(id, funcionrio) {
      this.registroFuncionario = id
      this.funcionario = funcionrio
      this.showModalRegistro = true
    },
    async postProdução() {
      const token = this.store.pegar_token;

      await api.post("/registrar/producao", {
        id_da_op: this.pecaRegistro,
        id_funcionario: this.registroFuncionario,
        id_da_funcao: this.funcao,
        quantidade_pecas: this.quantidadeRegistro,
        hora_registro: this.horaRegistro,
      }, {
        headers: {
          Authorization: `${token}` // Enviando o token no cabeçalho
        }
      }).then(response => {
        console.log(response.data);
        this.showModalRegistro = false;
        Swal.fire({
          icon: 'success',
          title: 'Produção registrada com sucesso!',
          timer: 4000,
        });
        this.getPecasProducao();
      }).catch(error => {
        console.error(error);
        Swal.fire({
          icon: 'erro',
          title: 'CNPJ ou senha incorretos',
          timer: 4000,
        })
      })
    },
    async getPecasProducao() {
      const token = this.store.pegar_token;
      api.get(`/pecas`, {
        headers: {
          Authorization: `${token}` // Enviando o token no cabeçalho
        }
      })
        .then(response => {
          this.pecas = response.data.peca.em_progresso;
          this.etapas = response.data.peca.em_progresso.map(peca => peca.etapas);
          console.log(this.etapas);
        })
        .catch(error => {
          console.error(error);
        });
    },
    async getFuncionario(id) {
      api.get(`/Funcionario/${id}`)
        .then(response => {
          this.funcionario = response.data.funcionario
          this.showModalFuncionario = true
        })
        .catch(error => {
          console.error(error);
        });
    },
    async getFuncionarios() {
      const token = this.store.pegar_token;

      api.get(`/Funcionarios`, {
        headers: {
          Authorization: `${token}` // Enviando o token no cabeçalho
        }
      })
        .then(response => {
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
    this.getPecasProducao();
  }

}
</script>
<style scoped>
.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
  width: 100%;
}
.nav{
  padding: 1rem;
  display: flex;
  justify-content: end;
}
.form {
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

.card-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
.btn-button{
    padding: 10px 20px;
    background-color: white;
    border: 1px solid #84E7FF;
    color: #7E7E7E;
    border-radius: 5px;
    cursor: pointer;
    font-family: 'Montserrat', sans-serif;
    font-size: 14px;
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

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content h2 {
  color: #008d3b;
  margin-bottom: 2px;
  font-size: 30px;
  margin-top: 2px;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 60%;
  display: flex;
  flex-direction: column;
  gap: 15px;
  border: 2px solid #84E7FF;
  box-shadow: 0 4px 10px -1px rgba(0, 0, 0, 0.10);
}

.modal-content input,
.modal-content textarea,
.modal-content select {
  padding: 10px;
  border: 1px solid #D9D9D9;
  border-radius: 4px;
  background-color: white;
  font-size: 16px;
  color: #7E7E7E;
  width: 100%;
  box-sizing: border-box;
  outline: none;
  box-shadow: none;
  font-family: 'Montserrat', sans-serif;
  line-height: 1.5;
  text-align: justify;
  resize: none;
}

.modal-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  gap: 20px;
}

.modal-buttons button {
  flex: 1;
  padding: 10px 20px;
  border-radius: 4px;
  background-color: #F5F5F5;
  color: #7E7E7E;
  border: 1px solid #D9D9D9;
  font-size: 14px;
  cursor: pointer;
  font-family: 'Montserrat', sans-serif;
}

label {
  align-self: self-start;

}

.search {
  display: flex;
  align-items: center;
  gap: 10px; /* espaçamento entre os itens */
  margin-bottom: 20px;
}

.search input {
  padding: 10px 20px;
  font-size: 14px;
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
  font-family: 'Montserrat', sans-serif;
}

.search select {
  max-width: 180px;
  border: 1px solid #008d3b;
  padding: 12px 15px;
  border: none;
  border-radius: 8px;
  background-color: white;
  cursor: pointer;
  box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
}

.search .btn-button {
  flex: 1; /* ocupa menos espaço */
  max-width: 150px; /* limite */
  padding: 10px 20px;
  background-color: #008d3b;
  border: 1px solid #008d3b;
  color: #ffffff;
  border-radius: 5px;
  cursor: pointer;
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  white-space: nowrap; /* evita quebrar texto */
}

input {
  width: 100%;
  padding: 10px 20px;
  font-size: 16px;
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
}


.search input, select{
    padding: 10px 50px;
    width: 100%;
    border: none;
    background-color: white;
    cursor: pointer;
    border-radius: 8px;
    box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
    font-family: 'Montserrat', sans-serif;
    font-size: 14px;
}


  @media (max-width: 600px) {
    .nav{
      display: none;
    }
  .card-content {
    flex-direction: row;
    align-items: center;
  }

  .modal-content {
    width: 90%;
  }

  .content-wrapper {
    padding-left: 0px;
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