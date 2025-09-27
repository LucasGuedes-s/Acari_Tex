<template>
  <div class="d-flex flex-column flex-md-row">
    <SidebarNav />
    <main class="content-wrapper flex-grow-1">
      <div v-if="loading">
        <CarregandoTela />
      </div>

      <div v-else class="nav row justify-content-center">
        <div class="form col-12 col-md-10 col-lg-8">
          <div class="search">
            <!-- 🔎 Versão mobile -->
            <div class="search-mobile d-md-none w-100 mb-3">
              <input type="text" id="search-input" placeholder="Pesquisar nome do profissional..." v-model="pesquisa"
                class="form-control mb-2" />
              <div class="d-flex w-100 gap-2 justify-content-between">
                <button @click="cadastrar" class="btn-button w-80 py-2">Novo profissional</button>
                <button class="btn-button w-50 py-2" @click="criarEquipe">
                  Nova equipe
                </button>
              </div>
            </div>

            <!-- 💻 Versão desktop -->
            <div class="search-desktop d-none d-md-flex align-items-center gap-2 w-100 mb-3">
              <select name="Pesquisar" id="hora" v-model="equipe" class="form-select flex-shrink-0"
                style="max-width: 220px;">
                <option :value="''" disabled>Pesquisar por grupo</option>
                <option v-for="equipeItem in equipesDisponiveis" :key="equipeItem.id" :value="equipeItem.id">
                  {{ equipeItem.nome }}
                </option>
              </select>

              <input type="text" id="search-input" placeholder="Pesquisar nome do profissional..." v-model="pesquisa"
                class="form-control flex-grow-1" />

              <RouterLink to="/adicionar-profissional" class="flex-fill">
                <button class="btn-button w-100 py-2">Novo profissional</button>
              </RouterLink>
              <button class="btn-button w-100 py-2 flex-fill" @click="criarEquipe">
                Nova equipe
              </button>

              <NavBarUser class="ms-2" />
            </div>
          </div>
        </div>
      </div>

      <!-- Lista de funcionários -->
      <div class="container_profissional" v-for="funcionario in filteredProfissional" :key="funcionario.id">
        <div class="card-content">
          <div class="imagem-funcionario">
            <img :src="funcionario.foto || '/default-avatar.png'" alt="Foto do funcionário" />
          </div>
          <div class="info-funcionario">
            <div class="funcionario">Nome: {{ funcionario.nome }}</div>
            <div class="funcionario">Funções: {{ funcionario.funcoes }}</div>
            <div class="funcionario">Notas: {{ funcionario.notas }}</div>
          </div>
        </div>

        <div class="acoes-funcionario">
          <button @click="tempodeProducao(funcionario.email)">Prod. por peça</button>
          <button class="registro" @click="registrarProducao(funcionario.email, funcionario.nome)">
            Registrar Produção
          </button>
        </div>
      </div>

      <!-- Modal Registro Produção -->
      <div v-if="showModalRegistro" class="modal-background">
        <div class="modal-container registro">
          <div class="modal-header registro">
            <h2>Registrar Produção</h2>
            <img class="modal-close" @click="fecharModal" src="@/assets/close.png" alt="Fechar" />
          </div>
          <div class="modal-body registro">
            <div class="modal-info registro">
              <div class="info-row">
                <label class="label" for="peca">Peça:</label>
                <select id="peca" v-model="pecaRegistro" class="input-select">
                  <option v-for="peca in pecas" :key="peca.id_da_op" :value="peca.id_da_op">
                    {{ peca.descricao }} - {{ peca.quantidade_pecas }} peças
                  </option>
                </select>
              </div>
              <div class="info-row">
                <label class="label" for="funcao">Etapa:</label>
                <select id="funcao" v-model="funcao" class="input-select" @change="checkNovaEtapa">
                  <option v-for="etapa in etapasFiltradas" :key="etapa.id_da_funcao" :value="etapa.id_da_funcao">
                    {{ etapa.etapa.descricao }}
                  </option>
                  <option value="nova">➕ Cadastrar nova etapa</option>
                </select>
              </div>
              <!-- Se selecionar nova etapa -->
              <div v-if="funcao === 'nova'" class="info-row">
                <label class="label" for="nova-etapa">Descrição da nova etapa:</label>
                <input type="text" id="nova-etapa" v-model="novaEtapa" placeholder="Ex: Costura, Acabamento..."
                  class="input-field" />
                <button class="btn-save mt-2" @click="salvarNovaEtapa">Salvar Etapa</button>
              </div>

              <!-- Se quiser adicionar etapa já cadastrada -->
              <div v-if="funcao === 'existente'" class="info-row">
                <label class="label" for="etapas-existentes">Selecione uma etapa:</label>
                <select id="etapas-existentes" v-model="etapaExistente" class="input-select">
                  <option v-for="etapa in todasEtapas" :key="etapa.id_da_funcao" :value="etapa.id_da_funcao">
                    {{ etapa.descricao }}
                  </option>
                </select>
                <button class="btn-save mt-2" @click="associarEtapaExistente">Adicionar à peça</button>
              </div>


              <div class="info-row">
                <label class="label" for="quantidade">Quantidade produzida:</label>
                <input placeholder="Ex: 50" type="number" min="1" id="quantidade" v-model="quantidadeRegistro"
                  class="input-field" />
              </div>
            </div>

            <!-- Campo da hora (só aparece se mostrarHora = true) -->
            <div class="info-row" v-if="mostrarHora">
              <label class="label" for="hora">Hora do registro:</label>
              <select id="hora" v-model="horaRegistro" class="input-select">
                <option disabled value="">Selecione a hora</option>
                <option v-for="hora in horasFixas" :key="hora" :value="hora">
                  {{ hora }}
                </option>
              </select>
            </div>

          </div>
          <div class="modal-footer registro">
            <div class="btn-group">
              <button type="button" class="btn-cancel" @click="mostrarHora = !mostrarHora">
                {{ mostrarHora ? 'Cancelar escolha da hora' : 'Definir hora manualmente' }}
              </button>
              <button class="btn-cancel" @click="fecharModal">Cancelar</button>
            </div>
            <button class="btn-save" @click="postProdução">Registrar</button>
          </div>
          </div>
      </div>
    </main>
  </div>
</template>

<script>
import SidebarNav from '@/components/Sidebar.vue'
import Swal from 'sweetalert2'
import { useAuthStore } from '@/store/store'
import NavBarUser from '@/components/NavBarUser.vue'
import api from '@/Axios'
import CarregandoTela from '@/components/carregandoTela.vue'

export default {
  name: 'funcionarios-equipe',
  setup() {
    const store = useAuthStore()
    return { store }
  },
  data() {
    return {
      showModalFuncionario: false,
      showModalRegistro: false,
      registroFuncionario: null,
      funcionarios: [],
      funcionario: null,
      mostrarHora: false,
      horaRegistro: "",
      pecas: [],
      horasFixas: [
        "06:00", "07:00", "08:00", "09:00", "10:00",
        "11:00", "12:00", "13:00", "14:00", "15:00",
        "16:00", "17:00", "18:00", "19:00", "20:00",
        "21:00", "22:00"
      ],
      etapas: [],
      pecaRegistro: null,
      quantidadeRegistro: null,
      funcao: null,
      pesquisa: '',
      loading: true,
      equipesDisponiveis: [],
      equipe: '',
      novaEtapa: '',
      todasEtapas: [],
      etapaExistente: null,
      selectedEquipeEmails: new Set()
    }
  },
  computed: {
    etapasFiltradas() {
      return this.etapas.flat().filter(etapa => etapa.id_da_op === this.pecaRegistro)
    },

    filteredProfissional() {
      const pesquisa = this.pesquisa?.trim().toLowerCase()
      const equipeSelecionadaAtiva = !!this.equipe // true se selecionada
      const emailsSet = this.selectedEquipeEmails // Set com emails em lowercase

      return this.funcionarios.filter(f => {
        const nome = (f.nome || '').toLowerCase()
        const email = (f.email || '').toLowerCase().trim()

        // filtro por nome: só aplica quando tem pesquisa
        const matchNome = pesquisa ? nome.includes(pesquisa) : true

        // filtro por equipe: se equipe selecionada e conjunto vazio -> não retorna ninguém
        if (equipeSelecionadaAtiva) {
          if (!emailsSet || emailsSet.size === 0) return false // equipe sem usuários
          return matchNome && emailsSet.has(email)
        }

        // sem equipe selecionada: apenas filtro por nome
        return matchNome
      })
    }
  },
  watch: {
    equipe(newVal) {
      this.updateSelectedEquipeEmails(newVal)
    }
  },
  methods: {
    checkNovaEtapa() {
      if (this.funcao === 'nova') {
        this.novaEtapa = ''
      }
      if (this.funcao === 'existente') {
        this.etapaExistente = null
        this.buscarTodasEtapas() // carrega lista completa de etapas do sistema
      }
    },

    async salvarNovaEtapa() {
      try {
        const { data } = await api.post('/adicionar/etapa', {
          descricao: this.novaEtapa,
          id_da_op: this.pecaRegistro,
        }, {
          headers: { Authorization: this.store.pegar_token }
        })

        Swal.fire('Sucesso', 'Etapa cadastrada com sucesso!', 'success')
        this.funcao = data.etapa.id_da_funcao
        await this.getPecasProducao() // atualiza lista
      } catch (err) {
        console.error(err)
        Swal.fire('Erro', 'Erro ao cadastrar etapa.', 'error')
      }
    },

    async buscarTodasEtapas() {
      try {
        const { data } = await api.get('/etapas', {
          headers: { Authorization: this.store.pegar_token }
        })
        this.todasEtapas = data.etapas
      } catch (err) {
        console.error(err)
        Swal.fire('Erro', 'Erro ao carregar etapas existentes.', 'error')
      }
    },
    resetRegistroModal() {
      this.pecaRegistro = null;
      this.funcao = null;
      this.quantidadeRegistro = null;
      this.horaRegistro = "";
    },
    async validarToken() {
      if (!this.store.pegar_token) {
        Swal.fire('Não autorizado', 'Sua sessão expirou. Faça login novamente.', 'warning')
        this.$router.push('/nao-autorizado')
        return false
      }
      return true
    },
    async cadastrar() {
      this.$router.push('/adicionar-profissional')
    },
    async tempodeProducao(email) {
      this.$router.push({
        name: 'tempoProducao',
        params: { emailFuncionario: email }
      })
    },

    async getFuncionarios() {
      if (!(await this.validarToken())) return
      try {
        const { data } = await api.get('/Funcionarios', {
          headers: { Authorization: this.store.pegar_token }
        })
        this.funcionarios = (data.funcionarios || []).map(u => ({
          ...u,
          email: u.email ? String(u.email).toLowerCase().trim() : ''
        }))
      } catch (err) {
        console.error(err)
        Swal.fire('Erro', 'Erro ao carregar funcionários.', 'error')
      }
    },

    async getPecasProducao() {
      try {
        const { data } = await api.get('/pecas', {
          headers: { Authorization: this.store.pegar_token }
        })
        this.pecas = data.peca.em_progresso
        console.log(this.pecas)
        this.etapas = data.peca.em_progresso.map(p => p.etapas)
      } catch (err) {
        console.error(err)
        Swal.fire('Erro', 'Erro ao carregar peças.', 'error')
      } finally {
        this.loading = false
      }
    },

    async postProdução() {
      try {
        //const agora = new Date();
        //const horaRegistro = String(agora.getHours()).padStart(2, '0') + ":00";
        const horaRegistro = this.horaRegistro ||
          (String(new Date().getHours()).padStart(2, '0') + ":00");
        await api.post('/registrar/producao', {
          id_da_op: this.pecaRegistro,
          id_funcionario: this.registroFuncionario,
          id_da_funcao: this.funcao,
          quantidade_pecas: this.quantidadeRegistro,
          hora_registro: horaRegistro
        }, {
          headers: { Authorization: this.store.pegar_token }
        })
        this.showModalRegistro = false
        Swal.fire('Sucesso', 'Produção registrada com sucesso!', 'success')
        this.resetRegistroModal()
        this.getPecasProducao()
      } catch (err) {
        console.log(err)
        this.resetRegistroModal()
        console.error(err.response.data.error)
        Swal.fire('Erro', `Erro ao registrar produção. ${err.response.data.error}, 
        Já foram produzidos ${err.response.data.jaProduzido} a essa peça`, 'error')
      }
    },

    // normaliza os objetos de equipe e constrói _emails (lista lowercased)
    normalizeEquipe(e) {
      const rels = e.usuarios || []
      const emails = rels
        .map(rel => {
          // tenta várias formas que já vimos no backend:
          if (rel?.usuario?.email) return rel.usuario.email
          if (rel?.usuarioEmail) return rel.usuarioEmail
          if (rel?.email) return rel.email
          // se rel.usuario for string (pouco provável) tente isso:
          if (typeof rel.usuario === 'string') return rel.usuario
          return null
        })
        .filter(Boolean)
        .map(em => String(em).toLowerCase().trim())

      return { ...e, _emails: emails }
    },

    // atualiza selectedEquipeEmails conforme id selecionado
    updateSelectedEquipeEmails(equipeId) {
      if (!equipeId) {
        this.selectedEquipeEmails = new Set()
        return
      }
      const eq = this.equipesDisponiveis.find(x => String(x.id) === String(equipeId))
      if (!eq) {
        this.selectedEquipeEmails = new Set()
        return
      }
      // se normalizeEquipe já criou _emails, usa; se não, cria agora
      const emails = eq._emails || (this.normalizeEquipe(eq)._emails || [])
      this.selectedEquipeEmails = new Set(emails)
    },

    async buscarEquipes() {
      try {
        const { data } = await api.get('/equipes', {
          headers: { Authorization: this.store.pegar_token }
        })
        // normaliza todas as equipes assim que chegam
        this.equipesDisponiveis = (data.equipes || []).map(e => this.normalizeEquipe(e))
        // atualiza conjunto caso já haja equipe selecionada
        this.updateSelectedEquipeEmails(this.equipe)
      } catch (err) {
        console.error(err)
        Swal.fire('Erro', 'Erro ao carregar equipes.', 'error')
      }
    },

    registrarProducao(id, funcionario) {
      this.registroFuncionario = id
      this.funcionario = funcionario
      this.showModalRegistro = true
    },

    fecharModal() {
      this.resetRegistroModal()
      this.showModalRegistro = false
    },
    criarEquipe() {
      this.$router.push('/minha-equipe')
    }
  },
  mounted() {
    this.getFuncionarios()
    this.getPecasProducao()
    this.buscarEquipes()
  },
  components: {
    SidebarNav,
    NavBarUser,
    CarregandoTela
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
  background-color: #ffffff;
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
  color: #333;
  transition: background-color 0.3s;
  width: 180px;
}

.acoes-funcionario button:hover {
  background-color: #ccc;
}

.acoes-funcionario .registro {
  background-color: var(--verde-escuro);
  color: white;
}

.acoes-funcionario .registro:hover {
  background-color: #00692b;
}

.modal-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
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
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  animation: fadeIn 0.3s ease-out;
  font-family: 'Montserrat', sans-serif;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--verde-escuro);
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
  background-color: var(--verde-escuro);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-close:hover {
  background-color: #00692b;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

label {
  align-self: self-start;
  display: flex;
}

.search {
  display: flex;
  align-items: center;
  gap: 10px;
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
  padding: 10px 15px;
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
  padding: 10px 20px;
  background-color: var(--verde-escuro);
  border: 1px solid #008d3b;
  color: #ffffff;
  border-radius: 5px;
  cursor: pointer;
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  white-space: nowrap;
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
    text-align: left;
  }

  .label {
    flex: 0 0 40%;
  }

  .value {
    flex: 1 1 55%;
    text-align: left;
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
    z-index: 0;
  }

  .acoes-funcionario {
    flex-direction: row;
    align-items: center;
    justify-content: center;
    margin-top: 1rem;
    gap: 8px;
  }

  .acoes-funcionario button {
    flex: 1;
    font-size: 14px;
    width: auto;
  }

  .search {
    margin-bottom: 0px;
  }
  .info-row{
    display: block;
  }
  .input-field,
  .input-select {
    width: 100% !important;
  }

  .modal-footer.registro {
    flex-direction: column;
    gap: 10px;
  }

  .modal-footer.registro button {
    width: 100%; 
    font-size: 12px;
  }

  .modal-footer.registro .btn-group {
    display: flex;
    gap: 10px;
    width: 100%;
  }

  .modal-footer.registro .btn-group button {
    flex: 1; /* divide igualmente o espaço */
  }
}

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

  .acoes-funcionario button {
    width: 140px;
  }
}

.input-field,
.input-select {
  width: 100%;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.input-field:focus,
.input-select:focus {
  outline: none;
  border-color: #008d3b;
  box-shadow: 0 0 0 2px rgba(0, 141, 59, 0.2);
}

.modal-container.registro {
  background: #fff;
  border-radius: 16px;
  max-width: 520px;
  width: 90%;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  font-family: 'Montserrat', sans-serif;
  animation: fadeInUp 0.3s ease;
  flex-direction: column;
}

.modal-header.registro {
  background: linear-gradient(90deg, #145a32, #008d3b);
  color: white;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header.registro h2 {
  font-size: 20px;
  margin: 0;
  font-weight: 600;
}

.modal-body.registro {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}


.modal-footer.registro {
  padding: 15px 20px;
  background: #f7f7f7;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel {
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  background: #ccc;
  color: #333;
  font-weight: 600;
  cursor: pointer;
  transition: 0.3s;
  margin: 5px;
}

.btn-cancel:hover {
  background: #aaa;
}

.btn-save {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: var(--verde-escuro);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: 0.3s;
}

.btn-save:hover {
  background: #006f2e;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>