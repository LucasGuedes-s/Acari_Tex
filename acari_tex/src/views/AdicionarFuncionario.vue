<template>
  <div class="d-flex flex-column flex-md-row">
    <Sidebar />
    <main class="content-wrapper flex-grow-1">
      <div class="container-fluid my-4 mt-md-0 mt-3">
        <div class="row justify-content-center mt-3">
          <div class="col-12">
            <TituloSubtitulo titulo="Cadastro de novo funcionário"
              subtitulo="Preencha os dados abaixo para cadastrar um novo membro na sua equipe" />

            <div class="section card shadow-sm p-4 mb-4">
              <h4 class="section-title mb-3">Dados do Funcionário</h4>

              <div class="row mb-4">
                <div class="col-md-6">
                  <label for="nome">Nome completo:</label>
                  <input v-model="novoFuncionario.nome" id="nome" type="text" class="form-control"
                    placeholder="Digite o nome" required />
                </div>
                <div class="col-md-6">
                  <label for="idade">Idade:</label>
                  <input v-model.number="novoFuncionario.idade" id="idade" type="number" min="16" class="form-control"
                    placeholder="Idade" required />
                </div>
              </div>

              <div class="row mb-3">
                <div class="col-md-6">
                  <label for="email">E-mail:</label>
                  <input v-model="novoFuncionario.email" id="email" type="email" class="form-control"
                    placeholder="Digite o e-mail" required />
                </div>
                <div class="col-md-6">
                  <label for="funcao">Função principal:</label>
                  <select v-model="novoFuncionario.funcao" id="funcao" class="form-control">
                    <option disabled value="">Selecione uma função</option>
                    <option v-for="funcao in funcoesDisponiveis" :key="funcao" :value="funcao">{{ funcao }}</option>
                  </select>
                </div>
              </div>
              <div class="row mb-3">
                <div class="col-md-6">
                  <label for="permissao">Permissão:</label>
                  <select v-model="novoFuncionario.permissao" id="permissao" class="form-control">
                    <option disabled value="">Selecione uma permissão</option>
                    <option v-for="perm in permissoes" :key="perm" :value="perm">{{ perm }}</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label for="foto">Foto:</label>
                  <input @change="uploadFoto" id="foto" type="file" accept="image/*" class="form-control" />
                  <div v-if="novoFuncionario.foto" class="mt-2 text-center">
                    <img :src="novoFuncionario.foto" alt="Pré-visualização" class="preview-img" />
                  </div>
                </div>
              </div>

              <!-- Outras funções -->
              <div class="form-group mb-3">
                <label for="funcoes">Outras funções (opcional):</label>
                <input v-model="novoFuncionario.funcoes" id="funcoes" type="text" class="form-control"
                  placeholder="Ex: Corte, Acabamento" />
              </div>


              <div class="d-flex justify-content-end">
                <button @click="cadastrarFuncionario" class="btn btn-success">Cadastrar Funcionário</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import Sidebar from '@/components/Sidebar.vue'
import TituloSubtitulo from '@/components/TituloSubtitulo.vue'
import router from '@/router'
import Swal from 'sweetalert2'
import { useAuthStore } from '@/store/store'
import api from '@/Axios'

export default {
  components: { Sidebar, TituloSubtitulo },
  setup() {
    const store = useAuthStore()
    return { store }
  },
  data() {
    return {
      novoFuncionario: {
        nome: '',
        email: '',
        idade: null,
        foto: '',
        funcao: '',
        funcoes: '',
        permissao: '',
        equipe: ''
      },
      funcoesDisponiveis: ['Corte', 'Costura', 'Acabamento', 'Supervisor'],
      permissoes: ['Admin', 'Gestor', 'Funcionário'],
      equipesDisponiveis: []
    }
  },
  mounted() {
    this.buscarEquipes()
  },
  methods: {
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
    async uploadFoto(event) {
      const file = event.target.files[0]
      if (!file) return

      const formData = new FormData()
      formData.append('file', file)

      try {
        const token = this.store.pegar_token
        const { data } = await api.post('/upload/foto', formData, {
          headers: {
            Authorization: `${token}`,
            'Content-Type': 'multipart/form-data'
          }
        })
        this.novoFuncionario.foto = data.url // backend retorna a URL da foto
      } catch (error) {
        console.error('Erro ao enviar foto:', error)
        Swal.fire('Erro', 'Não foi possível fazer upload da foto.', 'error')
      }
    },
    async cadastrarFuncionario() {
      try {
        const token = this.store.pegar_token
        const response = await api.post('/adicionar/funcionario', {
          funcionario: this.novoFuncionario
        }, {
          headers: { Authorization: `${token}` }
        })

        if (response.status === 201) {
          Swal.fire({
            icon: 'success',
            title: 'Funcionário cadastrado com sucesso!',
            timer: 2000,
            showConfirmButton: false
          })
          router.push('/MinhaEquipe')
        }
      } catch (error) {
        console.error('Erro ao cadastrar funcionário:', error)
        Swal.fire('Erro', 'Erro ao cadastrar. Verifique os dados.', 'error')
      }
    }
  }
}
</script>

<style scoped>
.content-wrapper {
  padding-left: 200px;
  width: 100%;
}

.section-title {
  font-size: 1.3rem;
  color: #00692b;
  font-weight: 600;
}

.preview-img {
  max-width: 150px;
  border-radius: 8px;
  border: 2px solid #ddd;
}
label {
  display: flex;
  color: #616161;
  font-weight: 600;
  margin-top: 5px;
  display: flex;
}

@media (max-width: 768px) {
  .d-flex {
    flex-direction: column;
    height: auto;
  }

  .content-wrapper {
    padding-left: 0px;
    z-index: 0;
  }
}
</style>
