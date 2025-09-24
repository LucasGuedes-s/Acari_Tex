<template>
  <div class="d-flex">
    <Sidebar />
    <main class="content-wrapper flex-grow-1">
      <div class="container-fluid">
        <div class="row justify-content-center mt-2">
          <div class="form col-12 col-md-10 col-lg-8">
            <TituloSubtitulo
              titulo="Produção por Funcionário"
              subtitulo="Visualize e registre a produção diária de cada funcionário"
              icone="fa-solid fa-chart-bar"
            />

            <!-- Dados do Funcionário -->
            <div v-if="funcionario" class="card p-3 mt-3 shadow-sm">
              <h5>👤 Dados do Funcionário</h5>
              <p><b>Nome:</b> {{ funcionario.nome }}</p>
              <p><b>Email:</b> {{ funcionario.email }}</p>
              <p><b>Função:</b> {{ funcionario.funcao }}</p>
            </div>

            <!-- Produção do Funcionário -->
            <div v-if="producao.length" class="card p-3 mt-3 shadow-sm">
              <h5>📊 Produção Registrada</h5>
              <table class="table table-striped">
                <thead>
                  <tr>
                    <th>Etapa</th>
                    <th>Tempo (min)</th>
                    <th>Qtd. Peças</th>
                    <th>Produção/min</th>
                    <th>Projeção Turno</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, i) in producao" :key="i">
                    <td>{{ item.etapa }}</td>
                    <td>{{ item.tempo_minutos }}</td>
                    <td>{{ item.quantidade_pecas }}</td>
                    <td>{{ (item.quantidade_pecas / item.tempo_minutos).toFixed(2) }}</td>
                    <td>{{ calcularProjecao(item) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Formulário para registrar novo tempo -->
            <div class="card p-3 mt-3 shadow-sm">
              <h5>📝 Registrar Produção</h5>
              <form @submit.prevent="registrarTempo">
                <div class="mb-3">
                  <label class="form-label">Etapa</label>
                  <input v-model="novoTempo.etapa" class="form-control" required />
                </div>
                <div class="mb-3">
                  <label class="form-label">Tempo (minutos)</label>
                  <input v-model.number="novoTempo.tempo_minutos" type="number" min="1" class="form-control" required />
                </div>
                <div class="mb-3">
                  <label class="form-label">Quantidade de Peças</label>
                  <input v-model.number="novoTempo.quantidade_pecas" type="number" min="1" class="form-control" required />
                </div>
                <button type="submit" class="btn btn-primary">Salvar</button>
              </form>
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

export default {
  name: 'ProducaoPorFuncionario',
  components: { Sidebar, TituloSubtitulo },
  props: {
    emailFuncionario: { type: String, default: '' }
  },
  data() {
    return {
      funcionario: null,
      producao: [],
      novoTempo: {
        etapa: '',
        tempo_minutos: null,
        quantidade_pecas: null
      }
    };
  },
  methods: {
    async carregarDados() {
      
      try {
        const { data: funcionario } = await api.get(`/funcionario/${this.emailFuncionario}`);
        this.funcionario = funcionario;
        const { data: producao } = await api.get(`/tempo-referencia/${this.emailFuncionario}`);
        this.producao = producao;
      } catch (err) {
        console.error('Erro ao carregar dados', err);
      }
    },
    calcularProjecao(item) {
      const producaoPorMinuto = item.quantidade_pecas / (item.tempo_minutos * 60);
      const tempoDisponivel = 480; // 8h de turno
      const eficiencia = 0.85;
      return Math.round(producaoPorMinuto * tempoDisponivel * eficiencia);
    },
    async registrarTempo() {
      try {
        await api.post('/tempo-referencia', {
          id_funcionario: this.emailFuncionario,
          tempo_minutos: this.novoTempo.tempo_minutos,
          quantidade_pecas: this.novoTempo.quantidade_pecas,
          observacoes: `Etapa: ${this.novoTempo.etapa}`,
          registradoPor: this.emailFuncionario,
          id_da_funcao: 1 // pode ser dinâmico se você tiver funções mapeadas
        });

        this.novoTempo = { etapa: '', tempo_minutos: null, quantidade_pecas: null };
        this.carregarDados(); // recarregar tabela
      } catch (err) {
        console.error('Erro ao registrar tempo', err);
      }
    }
  },
  mounted() {
    this.carregarDados();
  }
};
</script>

<style scoped>
.content-wrapper {
  padding-left: 200px;
  width: 100%;
}

.d-flex {
  display: flex;
  flex-direction: row;
  height: 100vh;
}

.form {
  width: 100%;
}
</style>
