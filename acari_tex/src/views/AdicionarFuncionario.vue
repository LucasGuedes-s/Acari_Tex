<template>
  <div class="d-flex">
    <Sidebar />
    <main class="content-wrapper flex-grow-1">
      <div class="container-fluid">
        <div class="row justify-content-center mt-2">
          <div class="form col-12 col-md-10 col-lg-8">
            <TituloSubtitulo titulo="Cadastro de novo funcionário" subtitulo="Preencha os dados abaixo" />

            <!-- Etapa 1: Dados Pessoais -->
            <div v-if="etapa === 1" class="section">
              <div class="form-group">
                <label for="nome">Nome completo:</label>
                <input v-model="novoFuncionario.nome" id="nome" type="text" class="form-control" placeholder="Digite o nome" required />
              </div>
              <div class="form-group">
                <label for="email">E-mail:</label>
                <input v-model="novoFuncionario.email" id="email" type="email" class="form-control" placeholder="Digite o e-mail" required />
              </div>
              <button @click="proximaEtapa" class="btn btn-primary btn-block">Próximo</button>
            </div>

            <!-- Etapa 2: Dados de Função -->
            <div v-if="etapa === 2" class="section">
              <h3 class="section-title">2. Função do Funcionário</h3>
              <div class="form-group">
                <label for="funcao">Função:</label>
                <select v-model="novoFuncionario.funcao" id="funcao" class="form-control">
                  <option v-for="funcao in funcoesDisponiveis" :key="funcao" :value="funcao">{{ funcao }}</option>
                </select>
              </div>
              <div class="form-group">
                <label for="permissao">Permissão:</label>
                <select v-model="novoFuncionario.permissao" id="permissao" class="form-control">
                  <option v-for="perm in permissoes" :key="perm" :value="perm">{{ perm }}</option>
                </select>
              </div>
              <button @click="proximaEtapa" class="btn btn-primary btn-block">Próximo</button>
              <button @click="etapa--" class="btn btn-secondary btn-block">Voltar</button>
            </div>

            <!-- Etapa 3: Revisão -->
            <div v-if="etapa === 3" class="section">
              <h3 class="section-title">3. Revisão</h3>
              <p><strong>Nome:</strong> {{ novoFuncionario.nome }}</p>
              <p><strong>Email:</strong> {{ novoFuncionario.email }}</p>
              <p><strong>Função:</strong> {{ novoFuncionario.funcao }}</p>
              <p><strong>Permissão:</strong> {{ novoFuncionario.permissao }}</p>

              <button @click="cadastrarFuncionario" class="btn btn-success btn-block">Cadastrar Funcionário</button>
              <button @click="etapa--" class="btn btn-secondary btn-block">Voltar</button>
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
import axios from 'axios'
import Swal from 'sweetalert2'
import { useAuthStore } from '@/store/store'

export default {
  components: {
    Sidebar,
    TituloSubtitulo
  },
  setup() {
    const store = useAuthStore()
    return { store }
  },
  data() {
    return {
      etapa: 1,
      novoFuncionario: {
        nome: '',
        senha: '',
        funcao: '',
        permissao: ''
      },
      funcoesDisponiveis: ['Corte', 'Costura', 'Acabamento', 'Supervisor'],
      permissoes: ['Admin', 'Gestor', 'Funcionário']
    }
  },
  methods: {
    proximaEtapa() {
      this.etapa++
    },
    async cadastrarFuncionario() {
      try {
        const token = this.store.pegar_token
        const response = await axios.post('http://localhost:3333/adicionar/funcionario', {
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
  .main-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
  }
  
  .content-wrapper {
    padding-left: 200px; /* Espaço para a sidebar */
    width: 100%;
  }
  
  .form-container {
    width: 100%;
    max-width: 100%;
  }
  
  .section {
    background-color: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 20px;
  }
  
  .section-title {
    font-size: 1.5rem;
    color: #555;
    font-weight: 400;
    margin-top: 5px;
  }
  
  .form {
    width: 100%;
  }
  
  .form-group {
    margin-bottom: 20px;
  }
  
  .form-control {
    width: 100%;
    padding: 12px;
    border-radius: 10px;
    border: 1px solid #ddd;
    font-size: 1.1rem;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
    transition: border-color 0.3s ease;
  }
  
  .form-control:focus {
    border-color: #00692b;
    box-shadow: 0 0 10px rgba(0, 105, 43, 0.2);
  }
  
  .label {
    display: flex;
  }
  
  /* Botões */
  button {
    padding: 12px;
    border-radius: 8px;
    font-size: 1.1rem;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  label {
    font-weight: 600;
    margin-bottom: 5px;
    justify-self: left;
    display: block;
  }
  
  .btn-block {
    width: 100%;
  }
  
  .btn-primary {
    background-color: #00692b;
    color: white;
    border: none;
  }
  
  .btn-primary:hover {
    background-color: #004d1a;
  }
  
  .btn-secondary {
    background-color: #bfbfbf;
    color: white;
    border: none;
  }
  
  .btn-secondary:hover {
    background-color: #8f8f8f;
  }
  
  .btn-success {
    background-color: #28a745;
    color: white;
    border: none;
  }
  
  .btn-success:hover {
    background-color: #218838;
  }
  
  .btn-danger {
    background-color: #dc3545;
    color: white;
    border: none;
  }
  
  .btn-danger:hover {
    background-color: #c82333;
  }
  
  /* Contêineres Drag-and-Drop */
  .drag-drop-container {
    display: flex;
    gap: 20px;
    margin-bottom: 30px;
  }
  
  .predefined-container,
  .drop-container {
    flex: 1;
    background: #e3f2fd;
    padding: 20px;
    border-radius: 10px;
    min-height: 250px;
    border: 2px dashed #00692b;
  }
  
  .predefined-container {
    background: #e1f5fe;
  }
  
  .drop-container {
    background: #f1f8e9;
  }
  
  .draggable-box {
    background: #008c3e;
    color: white;
    padding: 12px;
    border-radius: 8px;
    text-align: center;
    cursor: grab;
    margin: 8px 0;
    transition: transform 0.2s ease;
  }
  
  .draggable-box:hover {
    transform: scale(1.05);
  }
  
  /* Botões de Remover */
  .remove-btn {
    margin-left: auto;
    font-size: 16px;
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 50%;
    padding: 5px 10px;
    cursor: pointer;
  }
  
  .remove-btn:hover {
    background-color: #c82333;
  }
  
  /* Responsividade */
  @media (max-width: 768px) {
    .content-wrapper {
      padding-left: 80px; /* Ajusta o padding quando a tela for pequena */
    }
    
    .form {
      width: 100%; /* Garante que o formulário ocupe toda a largura */
    }
    
    .drag-drop-container {
      flex-direction: column; /* Alinha os contêineres em coluna em telas pequenas */
    }
    
    .predefined-container,
    .drop-container {
      margin-bottom: 20px; /* Adiciona margem para separar os contêineres */
    }
    
    .row {
      margin-left: 0; /* Remove margem desnecessária */
    }
  }
  </style>
  