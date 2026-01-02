<template>
  <div>
    <Sidebar />
    <main class="content-wrapper flex-grow-1">
      <div class="container-fluid py-3">
        <div class="form col-12">

          <TituloSubtitulo titulo="Produção por Funcionário" subtitulo="Visualize a produção diária de cada funcionário"
            icone="fa-solid fa-chart-bar" />
          <div v-if="funcionario" class="card shadow-lg border-2 mt-4 position-relative">
            <div class="card-header bg-light fw-bold border-bottom">
              👤 Dados do Funcionário
            </div>
            <div class="card-body d-flex flex-row align-items-center gap-3">
              <img :src="funcionario.foto || 'https://via.placeholder.com/100'" alt="Foto do Funcionário"
                class="rounded-circle border shadow-sm" style="width: 100px; height: 100px; object-fit: cover;" />
              <div class="flex-grow-1 text-start">
                <p class="mb-1"><b>Nome:</b> {{ funcionario.nome }}</p>
                <p class="mb-1"><b>Email:</b> {{ funcionario.email }}</p>
                <p class="mb-0"><b>Função:</b> {{ funcionario.funcao }}</p>
              </div>
            </div>
          </div>
          <GraficoProducaoPorDia   :dados="producao" class="mt-4" />
          <div v-if="producao.length" class="card shadow-sm border-0 mt-4">
            <div class="card-header bg-light fw-bold border-bottom">
              📊 Produção Registrada
            </div>
            <div class="card-body">
              <div class="table-responsive">
                <table class="table table-sm table-striped align-middle text-center">
                  <thead class="table-primary">
                    <tr>
                      <th>Etapa</th>
                      <th>Tempo (min)</th>
                      <th>Qtd. Peças</th>
                      <th>Prod./min</th>
                      <th>Projeção Turno</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, i) in producao" :key="i">
                      <td class="text-start">{{ item.etapa?.descricao || item.observacoes }}</td>
                      <td>{{ formatarMinutosDecimais(item.tempo_minutos) }}</td>
                      <td>{{ item.quantidade_pecas }}</td>
                      <td>{{ item.producaoPorMinuto.toFixed(2) }}</td>
                      <td>{{ item.producaoProjetada }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>


        </div>
      </div>
    </main>
  </div>
</template>
<script>
import Sidebar from '@/components/Sidebar.vue';
import TituloSubtitulo from '@/components/TituloSubtitulo.vue';
import api from '@/Axios';
import { useAuthStore } from '@/store/store';
import GraficoProducaoPorDia from '@/components/GraficoProducaoPorDia.vue';

export default {
  name: 'ProducaoPorFuncionario',
  components: { Sidebar, TituloSubtitulo, GraficoProducaoPorDia },
  data() {
    return {
      modalAberto: false,
      tempo: 0,
      intervalo: null,
      rodando: false,
      quantidadeProduzida: 0,
      funcaoSelecionada: null,
      funcoes: [],
      funcionario: null,
      producao: [],
      idFuncionario: this.$route.params.emailFuncionario,
    };
  },
  setup() {
    const store = useAuthStore();
    return { store };
  },
  methods: {
    abrirModal() {
      this.modalAberto = true;
    },
    async carregarDados() {
      try {
        const funcionario = await api.get(`/funcionario/${this.idFuncionario}`, {
          headers: { Authorization: this.store.pegar_token }
        });
        this.funcionario = funcionario.data.funcionario;
        console.log(this.funcionario);
        const producao = await api.get(`/producao/funcionario/${this.idFuncionario}`, {
          headers: { Authorization: this.store.pegar_token }
        });
        this.producao = producao.data;

      } catch (err) {
        console.error('Erro ao carregar dados', err);
      }
    },
    async carregarFuncoes() {
      try {
        const etapas = await api.get('/etapas', {
          headers: { Authorization: this.store.pegar_token }
        })
        this.funcoes = etapas.data.etapas
        
      } catch (err) {
        console.error("Erro ao carregar funções", err);
      }
    },
  },
  mounted() {
    this.carregarDados();
    this.carregarFuncoes();
  }
};
</script>

<style scoped>
.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
  width: 100%;
}
.btn{
  background-color: var(--verde-escuro);
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
  max-width: 520px;
  width: 90%;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  font-family: 'Montserrat', sans-serif;
  animation: fadeInUp 0.3s ease;
  display: flex;
  flex-direction: column;
}

.modal-header {
  background: linear-gradient(90deg, #145a32, #008d3b);
  color: white;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  font-size: 20px;
  margin: 0;
  font-weight: 600;
}

.modal-close {
  width: 24px;
  height: 24px;
  cursor: pointer;
  filter: brightness(0) invert(1);
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.modal-body .info-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.table-responsive {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.table td,
.table th {
  white-space: nowrap;
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

.modal-footer {
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
}

.btn-cancel:hover {
  background: #aaa;
}

.btn-save {
  width: 100%;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: #145a32;
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

label {
  display: flex;
}

.cronometro-buttons {
  display: flex;
  gap: 10px;
  /* espaço entre os botões */
  width: 100%;
}

.cronometro-buttons button {
  flex: 1;
  /* cada botão ocupa mesma largura */
  padding: 12px 0;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s;
  color: white;
}

/* Cores dos botões */
.cronometro-buttons .btn-iniciar {
  background-color: #145a32;
}

.cronometro-buttons .btn-iniciar:hover {
  background-color: #0f4d28;
}

.cronometro-buttons .btn-pausar {
  background-color: #ffc107;
  color: #333;
}

.cronometro-buttons .btn-pausar:hover {
  background-color: #e0ac06;
}

.cronometro-buttons .btn-resetar {
  background-color: #dc3545;
}

.cronometro-buttons .btn-resetar:hover {
  background-color: #a71d2a;
}

/* Cronômetro */
.cronometro-box {
  width: 100%;
  height: 120px;
  border-radius: 12px;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  color: #333;
  box-shadow: inset 2px 2px 6px rgba(0, 0, 0, 0.1),
    inset -2px -2px 6px rgba(255, 255, 255, 0.7);
  transition: all 0.3s ease;
  margin: auto;
}

.cronometro-box.running {
  background: #e9f7ef;
  color: #145a32;
  box-shadow: inset 2px 2px 6px rgba(0, 0, 0, 0.15),
    inset -2px -2px 6px rgba(255, 255, 255, 0.9);
}

/* Botão Salvar */
.btn-save {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(90deg, #145a32, #008d3b);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: 0.3s;
}

.btn-save:hover {
  background: linear-gradient(90deg, #0f4d28, #00692b);
}

@media (max-width: 768px) {
  .content-wrapper {
    padding-left: 0px;
  }
}
@media (min-width: 768px) and (max-width: 1024px) {
    .content-wrapper {
        padding-left: 0px;
    }
}
</style>
