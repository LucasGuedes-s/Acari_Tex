<template>
  <div class="d-flex flex-column flex-md-row">
    <SidebarNav />
    <main class="content-wrapper flex-grow-1">
      <div v-if="loading">
        <CarregandoTela />
      </div>
      <div v-if="loading === false" class="nav row justify-content-center">
        <div class="form col-12 col-md-10 col-lg-8  ">
          <div class="search">
            <select name="Pesquisar" id="hora" v-model="equipe">
              <option value="" disabled>Pesquisar por grupo</option>
              <option v-for="equipe in equipesDisponiveis" :key="equipe.id" :value="equipe.id">{{ equipe.nome }}</option>

            </select>
            <input type="text" id="search-input" placeholder="Pesquisar nome do profissional..." v-model="pesquisa">
            <RouterLink to="/adicionar-profissional"><button class="btn-button">Novo profissional</button></RouterLink>
            <button class="btn-button" @click="criarEquipe">Nova equipe</button>

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
          <!-- <button @click="producao(funcionario.email)">Produção</button>-->
          <button  @click="getFuncionario(funcionario.email)">Ver mais</button>
          <button class="demitir" @click="demitirFuncionario()">Demitir</button>
          <button class="registro" @click="registrarProducao(funcionario.email, funcionario.nome)">Registrar
            Produção</button>
        </div>

        <!-- Modal do Funcionário -->
<div v-if="showModalFuncionario" class="modal-background">
  <div class="modal-container">
    <!-- Cabeçalho -->
    <div class="modal-header">
      <h2>Detalhes do Funcionário</h2>
      <img class="modal-close" @click="showModalFuncionario = false" src="@/assets/close.png" alt="Fechar" />
    </div>

    <!-- Conteúdo principal -->
    <div class="modal-body">
      <!-- Foto -->
      <div class="modal-foto">
        <img :src="funcionario.foto || '/default-avatar.png'" alt="Foto do Funcionário" />
      </div>

      <!-- Dados -->
      <div class="modal-info">
        <div class="info-row">
          <span class="label">Nome:</span>
          <span class="value">{{ funcionario.nome }}</span>
        </div>
        <div class="info-row">
          <span class="label">ID:</span>
          <span class="value">{{ funcionario.id }}</span>
        </div>
        <div class="info-row">
          <span class="label">Funções:</span>
          <span class="value">{{ funcionario.funcoes }}</span>
        </div>
        <div class="info-row">
          <span class="label">Aniversário:</span>
          <span class="value">{{ funcionario.aniversario }}</span>
        </div>
        <div class="info-row">
          <span class="label">PIS:</span>
          <span class="value">{{ funcionario.pis }}</span>
        </div>
        <div class="info-row">
          <span class="label">PIX:</span>
          <span class="value">{{ funcionario.pix }}</span>
        </div>
        <div class="info-row">
          <span class="label">Notas:</span>
          <span class="value">{{ funcionario.notas }}</span>
        </div>
      </div>
    </div>
  </div>
</div>

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
import CarregandoTela from '@/components/carregandoTela.vue';

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
      loading: true,
      equipesDisponiveis: []

    }
  },
  components: {
    SidebarNav,
    NavBarUser,
    CarregandoTela
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
        this.showModalRegistro = false;
        Swal.fire({
          icon: 'success',
          title: 'Produção registrada com sucesso!',
          timer: 4000,
        });
        console.log(response.data);
        this.getPecasProducao();
      }).catch(error => {
        console.error(error);
        Swal.fire({
          icon: 'erro',
          title: 'Erro ao carregar a produção',
          timer: 4000,
        })
      })
    },
    async getPecasProducao() {
      this.loading = true;
      const token = this.store.pegar_token;
      api.get(`/pecas`, {
        headers: {
          Authorization: `${token}` // Enviando o token no cabeçalho
        }
      }).then(response => {
        this.pecas = response.data.peca.em_progresso;
        this.etapas = response.data.peca.em_progresso.map(peca => peca.etapas);
        this.loading = false;

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
    async buscarEquipes() {
      try {
        const token = this.store.pegar_token
        const { data } = await api.get('/equipes', {
          headers: { Authorization: `${token}` }
        })
        this.equipesDisponiveis = data.equipes
        console.log('Equipes carregadas:', this.equipesDisponiveis)
      } catch (error) {
        console.error('Erro ao carregar equipes:', error)
      }
    },
    async criarEquipe() {
      const funcionarios = this.funcionarios ?? [];

      const checkboxesHtml = funcionarios
        .map(
          f => `
          <div style="text-align:left; margin:4px 0;">
            <label style="cursor:pointer; display:flex; align-items:center; gap:6px;">
              <input type="checkbox" value="${f.email}" style="transform: scale(1.2);">
              ${f.nome || f.email}
            </label>
          </div>
        `
        )
        .join('');

      const { value: formValues } = await Swal.fire({
        title: 'Criar nova equipe',
        html: `
          <input id="nome-equipe" 
       class="swal2-input" 
       placeholder="Nome da equipe" 
       style="margin:0 0 15px 0; width:100%; max-width:400px; box-sizing:border-box; display:block; margin-left:auto; margin-right:auto;">

      <div id="usuarios-equipe" 
          style="max-height:200px; width:100%; max-width:400px; overflow-y:auto; border:1px solid #ccc; 
                  padding:8px; border-radius:6px; text-align:left; box-sizing:border-box; margin:0 auto;">
        ${checkboxesHtml}
      </div>

        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Criar equipe',
        width: 500,
        preConfirm: () => {
          const nome = (document.getElementById('nome-equipe')?.value || '').trim();
          const checked = Array.from(document.querySelectorAll('#usuarios-equipe input[type="checkbox"]:checked'))
            .map(c => c.value);

          if (!nome) {
            Swal.showValidationMessage('O nome da equipe é obrigatório');
            return false;
          }
          if (!checked.length) {
            Swal.showValidationMessage('Selecione ao menos um usuário');
            return false;
          }
          return { nome, funcionarioEmails: checked };
        }
      });

      if (!formValues) return;

      try {
        Swal.fire({ title: 'Criando equipe...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const token = this.store?.pegar_token || '';
        await api.post('/equipes', formValues, {
          headers: token ? { Authorization: token } : {}
        });
        Swal.close();
        Swal.fire('Sucesso', 'Equipe criada com sucesso!', 'success');

        this.$emit('equipe-criada', formValues);

        if (typeof this.fetchEquipes === 'function') {
          await this.fetchEquipes();
        }
      } catch (err) {
        Swal.close();
        console.error('Erro ao criar equipe:', err);
        Swal.fire('Erro', err.response?.data?.message || err.message || 'Não foi possível criar a equipe.', 'error');
      }
    }

  },
  mounted() {
    this.getFuncionarios();
    this.getPecasProducao();
    this.buscarEquipes();
  }
}
</script>

<style scoped>
.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
  width: 100%;
}

.nav {
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

.btn-button {
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
.modal-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-container {
  background: #fff;
  border-radius: 16px;
  max-width: 600px;
  width: 90%;
  box-shadow: 0 8px 20px rgba(0,0,0,0.25);
  overflow: hidden;
  animation: fadeIn 0.3s ease-out;
  font-family: 'Montserrat', sans-serif;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #008d3b;
  color: white;
  padding: 15px 20px;
}

.modal-header h2 {
  margin: 0;
  font-size: 22px;
}

.modal-close {
  width: 24px;
  height: 24px;
  cursor: pointer;
  filter: brightness(0) invert(1);
}

.modal-body {
  display: flex;
  padding: 20px;
  gap: 20px;
  flex-wrap: wrap;
}

.modal-foto img {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #008d3b;
}

.modal-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 16px;
}

.label {
  font-weight: 600;
  color: #555;
}

.value {
  color: #333;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 15px 20px;
  background-color: #f5f5f5;
}

.btn-close {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background-color: #008d3b;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-close:hover {
  background-color: #00692b;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

label {
  align-self: self-start;

}

.search {
  display: flex;
  align-items: center;
  gap: 10px;
  /* espaçamento entre os itens */
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
  flex: 1;
  /* ocupa menos espaço */
  max-width: 150px;
  /* limite */
  padding: 10px 20px;
  background-color: #008d3b;
  border: 1px solid #008d3b;
  color: #ffffff;
  border-radius: 5px;
  cursor: pointer;
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  white-space: nowrap;
  /* evita quebrar texto */
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


.search input,
select {
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
  .modal-body {
    flex-direction: column;
    align-items: center;
    text-align: left; /* mantém alinhamento à esquerda */
  }

  .modal-info {
    width: 100%;
  }

  .info-row {
    flex-direction: row; /* label e value lado a lado */
    justify-content: space-between;
    flex-wrap: wrap; /* quebra linha se necessário */
    gap: 8px;
  }

  .label {
    flex: 0 0 40%; /* label ocupa 40% do espaço */
  }

  .value {
    flex: 1 1 55%; /* value ocupa o restante */
    text-align: left;
  }
  .nav {
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