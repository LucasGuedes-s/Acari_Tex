<template>
  <div>
    <Sidebar />
    <main class="content-wrapper flex-grow-1">
      <div class="container-fluid py-3">
        <div class="form col-12">

          <!-- Título -->
          <TituloSubtitulo titulo="Produção por Funcionário" subtitulo="Visualize a produção diária de cada funcionário"
            icone="fa-solid fa-chart-bar" />

          <!-- Dados do Funcionário -->
          <div v-if="funcionario" class="card shadow-lg border-2 mt-4 position-relative">
            <div class="card-header bg-light fw-bold border-bottom">
              👤 Dados do Funcionário
            </div>
            <div class="card-body d-flex flex-row align-items-center gap-3">
              <!-- Foto -->
              <img :src="funcionario.foto || 'https://via.placeholder.com/100'" alt="Foto do Funcionário"
                class="rounded-circle border shadow-sm" style="width: 100px; height: 100px; object-fit: cover;" />

              <!-- Dados ao lado -->
              <div class="flex-grow-1 text-start">
                <p class="mb-1"><b>Nome:</b> {{ funcionario.nome }}</p>
                <p class="mb-1"><b>Email:</b> {{ funcionario.email }}</p>
                <p class="mb-0"><b>Função:</b> {{ funcionario.funcao }}</p>
              </div>

              <!-- Botão -->

            </div>
            <div class="ms-auto">
              <button class="btn btn-primary" @click="abrirModal">
                Registrar Produção
              </button>
            </div>
          </div>


          <!-- Produção do Funcionário -->
          <!-- Produção do Funcionário -->
          <div v-if="producao.length" class="card shadow-sm border-0 mt-4">
            <div class="card-header bg-light fw-bold border-bottom">
              📊 Produção Registrada
            </div>
            <div class="card-body">
              <!-- Container para scroll horizontal -->
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

    <!-- Modal Customizado -->
    <div v-if="modalAberto" class="modal-background">
      <div class="modal-container">
        <div class="modal-header">
          <h2>⏱ Registrar Produção</h2>
          <span class="modal-close" @click="fecharModal">×</span>
        </div>

        <div class="modal-body">
          <!-- Cronômetro -->
          <div class="w-100 d-flex justify-content-center mb-3">
            <div :class="['cronometro-box', { running: rodando }]">
              {{ formatarTempo(tempo) }}
            </div>
          </div>

          <!-- Etapa -->
          <div class="mb-2 flex-grow-1">
            <label class="label">Etapa</label>
            <select v-model="funcaoSelecionada" class="form-select form-select-sm w-100">
              <option v-for="f in funcoes" :key="f.id_da_funcao" :value="f.etapa.id_da_funcao">
                {{ f.etapa.descricao }}
              </option>
            </select>
          </div>

          <!-- Quantidade -->
          <div class="mb-3 flex-grow-1">
            <label class="label">Quantidade Produzida</label>
            <input v-model="quantidadeProduzida" type="number" class="form-control form-control-sm" min="1" />
          </div>

          <!-- Botões cronômetro -->
          <div class="cronometro-buttons mb-3">
            <button class="btn-iniciar" @click="iniciarCronometro" :disabled="rodando">
              <i class="bi bi-play-fill me-1"></i> Iniciar
            </button>
            <button class="btn-pausar" @click="pausarCronometro" :disabled="!rodando">
              <i class="bi bi-pause-fill me-1"></i> Pausar
            </button>
            <button class="btn-resetar" @click="resetarCronometro">
              <i class="bi bi-stop-fill me-1"></i> Resetar
            </button>
          </div>


          <!-- Botão salvar -->
          <div>
            <button class="btn-save" @click="registrarProducao">Salvar Produção</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import Sidebar from '@/components/Sidebar.vue';
import TituloSubtitulo from '@/components/TituloSubtitulo.vue';
import api from '@/Axios';
import { useAuthStore } from '@/store/store';
import Swal from 'sweetalert2';

export default {
  name: 'ProducaoPorFuncionario',
  components: { Sidebar, TituloSubtitulo },
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
    fecharModal() {
      this.modalAberto = false;
      this.resetarCronometro();
      this.quantidadeProduzida = 0;
      this.funcaoSelecionada = null;
    },
    formatarMinutosDecimais(valor) {
      console.log(valor)
      const minutos = Math.floor(valor); // parte inteira
      const segundos = Math.round((valor - minutos) * 60); // parte decimal * 60
      return `${minutos}m ${segundos}s`;
    },
    async carregarDados() {
      try {
        const funcionario = await api.get(`/funcionario/${this.idFuncionario}`, {
          headers: { Authorization: this.store.pegar_token }
        });
        this.funcionario = funcionario.data.funcionario;

        const res = await api.get(`/tempo/referencia/${this.idFuncionario}`, {
          headers: { Authorization: this.store.pegar_token }
        });

        const temposObj = res.data.tempo || {};
        const tempos = Object.keys(temposObj)
          .filter(key => !isNaN(key))
          .map(key => temposObj[key]);

        this.producao = tempos.map(item => {
          const producaoPorMinuto = item.tempo_minutos
            ? item.quantidade_pecas / item.tempo_minutos
            : 0;
          const tempoDisponivel = 480;
          const eficiencia = 0.85;
          const producaoProjetada = Math.round(producaoPorMinuto * tempoDisponivel * eficiencia);

          return { ...item, producaoPorMinuto, producaoProjetada };
        });

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
        console.log(etapas.data.etapas)
      } catch (err) {
        console.error("Erro ao carregar funções", err);
      }
    },

    iniciarCronometro() {
      if (!this.rodando) {
        this.rodando = true;
        this.intervalo = setInterval(() => {
          this.tempo++;
        }, 1000);
      }
    },
    pausarCronometro() {
      clearInterval(this.intervalo);
      this.rodando = false;
    },
    resetarCronometro() {
      clearInterval(this.intervalo);
      this.tempo = 0;
      this.rodando = false;
    },
    formatarTempo(segundos) {
      const min = Math.floor(segundos / 60).toString().padStart(2, "0");
      const sec = (segundos % 60).toString().padStart(2, "0");
      return `${min}:${sec}`;
    },
    async registrarProducao() {
      try {
        const minutos = this.tempo / 60;
        await api.post("/registrar/tempo", {
          id_funcionario: this.idFuncionario,
          id_da_funcao: this.funcaoSelecionada,
          tempo_minutos: minutos,
          quantidade_pecas: this.quantidadeProduzida,
        }, {
          headers: { Authorization: this.store.pegar_token }
        });
        this.resetarCronometro();
        this.quantidadeProduzida = 0;
        this.carregarDados();
        this.fecharModal();
        Swal.fire({
          toast: true,               // ativa estilo de notificação
          position: 'top-end',       // canto superior direito
          icon: 'success',           // 'success', 'error', 'warning', 'info', 'question'
          title: 'Produção adicionada com sucesso',
          showConfirmButton: false,  // sem botão de confirmação
          timer: 5000,               // desaparece sozinho em 3s
          timerProgressBar: true,    // barra de tempo
        });
      } catch (err) {
        Swal.fire({
          toast: true,               // ativa estilo de notificação
          position: 'top-end',       // canto superior direito
          icon: 'error',           // 'success', 'error', 'warning', 'info', 'question'
          title: 'Erro ao adicionar produção',
          showConfirmButton: false,  // sem botão de confirmação
          timer: 5000,               // desaparece sozinho em 3s
          timerProgressBar: true,    // barra de tempo
        });
        console.error("Erro ao registrar produção", err);
      }
    }
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
</style>
