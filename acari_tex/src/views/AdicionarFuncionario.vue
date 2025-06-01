<template>
    <div class="d-flex">
      <Sidebar />
      <main class="content-wrapper flex-grow-1">
        <div class="container-fluid">
          <div class="row justify-content-center mt-5">
            <!-- Contêiner de Formulário -->
            <div class="form col-12 col-md-10 col-lg-8">
              <!-- Contêiner de Título e Subtítulo -->
              <TituloSubtitulo titulo="Cadastro de novo funcionario" subtitulo="Preencha as informações abaixo" />
  
              <!-- Etapa 1 -->
              <div v-if="etapa === 1" class="section">
                <div class="form-group">
                  <label for="descricao">Descrição:</label>
                  <input v-model="novaPeca.descricao" id="descricao" type="text" class="form-control" placeholder="Digite a descrição" required />
                </div>
                <div class="form-group">
                  <label for="quantidade">Quantidade de Peças:</label>
                  <input v-model.number="novaPeca.quantidade_pecas" id="quantidade" type="number" class="form-control" placeholder="Quantidade" required />
                </div>
                <div class="form-group">
                  <label for="quantidade">Data de entrega:</label>
                  <input v-model="novaPeca.data_entrega" id="data" type="Date" class="form-control" placeholder="data" required />
                </div>
                <div class="form-group">
                  <label for="fornecedor">Pedido por:</label>
                  <select v-model="novaPeca.pedido_por" id="fornecedor" class="form-control">
                    <option v-for="fornecedor in fornecedoresRecentes" :key="fornecedor">{{ fornecedor }}</option>
                  </select>
                </div>
                <button @click="proximaEtapa" class="btn btn-primary btn-block">Próximo</button>
              </div>
  
              <!-- Etapa 2 -->
              <div v-if="etapa === 2" class="section">
                <h3 class="section-title">2. Processo de Produção</h3>
                <div class="drag-drop-container">
                  <div class="predefined-container">
                    <h4>Locais Pré-definidos</h4>
                    <div v-for="local in locaisPredefinidos" :key="local" class="draggable-box" draggable="true" @dragstart="onDragStart(local)">
                      {{ local }}
                    </div>
                  </div>
                  <div class="drop-container" @dragover.prevent @drop="onDrop">
                    <h4>Locais Selecionados</h4>
                    <div v-for="(local, index) in novaPeca.producao" :key="index" class="draggable-box" draggable="true" @dragstart="onDragStart(local)">
                      {{ local }}
                      <button @click="removerLocal(index)" class="btn btn-danger btn-sm remove-btn">
                        <i class="bi bi-x-lg"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <button @click="proximaEtapa" class="btn btn-primary btn-block">Próximo</button>
                <button @click="etapa--" class="btn btn-secondary btn-block">Voltar</button>
              </div>
  
              <!-- Etapa 3 -->
              <div v-if="etapa === 3" class="section">
                <h3 class="section-title">3. Revisão e Cadastro</h3>
                <p><strong>Descrição:</strong> {{ novaPeca.descricao }}</p>
                <p><strong>Quantidade:</strong> {{ novaPeca.quantidade_pecas }}</p>
                <p><strong>Pedido por:</strong> {{ novaPeca.pedido_por }}</p>
                <p><strong>Processo de Produção:</strong> {{ novaPeca.producao.join(' → ') }}</p>
  
                <button @click="adicionarPeca" class="btn btn-success btn-block">Cadastrar Peça</button>
                <button @click="etapa--" class="btn btn-secondary btn-block">Voltar</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </template>
  
  <script>
  import Sidebar from '@/components/Sidebar.vue';
  import TituloSubtitulo from '@/components/TituloSubtitulo.vue'; // Importando o componente
  import router from '@/router';
  import axios from 'axios';
  import { useAuthStore } from '@/store/store';
  import Swal from 'sweetalert2'
  
  export default {
    components: {
      Sidebar,
      TituloSubtitulo // Registrando o componente
    },
    setup() {
      const store = useAuthStore();
      return { store };
    },
    data() {
      return {
        etapa: 1,
        novaPeca: {
          descricao: "",
          quantidade_pecas: null,
          pedido_por: "",
          data_entrega: null,
          producao: []
        },
        fornecedoresRecentes: ["Fornecedor A", "Fornecedor B", "Fornecedor C"],
        locaisPredefinidos: ["Corte", "Costura", "Acabamento", "Embalagem"],
        draggedItem: null
      };
    },
    methods: {
      proximaEtapa() {
        this.etapa++;
      },
  
      async adicionarPeca() {
        try {
          const token = this.store.pegar_token;
  
          // Enviar a requisição para o backend com os dados da peça
          const response = await axios.post('http://localhost:3333/adicionar/peca', {
            peca:{
  
            descricao: this.novaPeca.descricao,
            quantidade_pecas: this.novaPeca.quantidade_pecas,
            pedido_por: this.novaPeca.pedido_por,
            data_entrega: this.novaPeca.data_entrega,
            etapas: this.novaPeca.producao // Passando as etapas do processo de produção
            }
          }, {
            headers: {
              'Authorization': `${token}` // Enviar o token de autenticação
            }
          });
  
          // Exibir mensagem de sucesso
          if (response.status === 201) {
            Swal.fire({
                icon: 'success',
                title: 'Nova peça adicionada com sucesso!',
                text: 'Sua peça foi adicionada',
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false
            })
            router.push('/dashboard');
            this.etapa = 1;
            this.novaPeca = { descricao: "", quantidade_pecas: null, pedido_por: "", producao: [] };
          }
        } catch (error) {
          console.error("Erro ao cadastrar a peça:", error);
          alert("Erro ao cadastrar a peça. Tente novamente.");
        }
  },
      removerLocal(index) {
        this.novaPeca.producao.splice(index, 1);
      },
      onDragStart(local) {
        this.draggedItem = local;
      },
      onDragOver(event) {
        event.preventDefault();
      },
      onDrop(index) {
        if (this.draggedItem) {
          const currentIndex = this.novaPeca.producao.indexOf(this.draggedItem);
          if (currentIndex !== -1) {
            this.novaPeca.producao.splice(currentIndex, 1);
          }
          this.novaPeca.producao.splice(index, 0, this.draggedItem);
        }
        this.draggedItem = null;
      }
    }
  };
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
  