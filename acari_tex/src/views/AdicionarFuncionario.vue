<template>
  <div class="d-flex flex-column flex-md-row">
    <Sidebar />
    <main class="content-wrapper flex-grow-1">
      <div class="container-fluid my-4 mt-md-0 mt-3">
        <div class="row justify-content-center mt-3">
          <div class="col-12">
            <TituloSubtitulo 
              titulo="Cadastro de novo funcionário"
              subtitulo="Preencha os dados abaixo para cadastrar um novo membro na sua equipe" 
            />

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
                  <input @change="selecionarFoto" id="foto" type="file" accept="image/*" class="form-control" />
                  <div v-if="previewFoto" class="mt-2 text-center">
                    <img :src="previewFoto" alt="Pré-visualização" class="preview-img" />
                  </div>
                </div>
              </div>

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
        funcao: '',
        funcoes: '',
        permissao: '',
        equipe: '',
        fotoUrl: null 
      },
      previewFoto: null, 
      fotoSelecionada: null,
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
        this.equipesDisponiveis = data.equipes || []
      } catch (error) {
        console.error('Erro ao carregar equipes:', error)
        Swal.fire('Erro', 'Não foi possível carregar as equipes.', 'error')
      }
    },

    selecionarFoto(event) {
      const file = event.target.files[0]
      if (!file) return
      this.fotoSelecionada = file
      this.previewFoto = URL.createObjectURL(file)
    },

    async uploadFoto() {
      if (!this.fotoSelecionada) return null

      try {
        const token = this.store.pegar_token
        const formData = new FormData()
        formData.append('file', this.fotoSelecionada)

        const response = await api.post('/upload/foto', formData, {
          headers: {
            Authorization: `${token}`,
            'Content-Type': 'multipart/form-data'
          }
        })

        return response.data.fileUrl
      } catch (error) {
        console.error('Erro ao enviar imagem:', error)
        Swal.fire('Erro', 'Não foi possível enviar a imagem.', 'error')
        return null
      }
    },

    async cadastrarFuncionario() {
      try {
        const token = this.store.pegar_token
        Swal.fire({
          title: 'Cadastrando funcionário...',
          text: 'Aguarde um momento.',
          allowOutsideClick: false,
          allowEscapeKey: false,
          didOpen: () => {
            Swal.showLoading()
          }
        })
        // 1️⃣ Envia a imagem primeiro
        const fotoUrl = await this.uploadFoto()
        if (fotoUrl) this.novoFuncionario.fotoUrl = fotoUrl
        const response = await api.post('/adicionar/funcionario', this.novoFuncionario, {
          headers: {
            Authorization: `${token}`,
            'Content-Type': 'application/json'
          }
        })
        Swal.close()

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
  color: var(--verde-escuro);
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
