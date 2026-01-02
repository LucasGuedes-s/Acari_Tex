<template>
  <div>
    <Sidebar />

    <main class="content-wrapper flex-grow-1">
      <div class="container-fluid py-3">

        <TituloSubtitulo
          titulo="Produção por Funcionário"
          subtitulo="Apontamento diário por horário"
          icone="fa-solid fa-clipboard-list"
        />

        <!-- DADOS FUNCIONÁRIO -->
        <div v-if="funcionario" class="card shadow-sm mt-4">
          <div class="card-body d-flex gap-3 align-items-center">
            <img
              :src="funcionario.foto || 'https://via.placeholder.com/100'"
              class="rounded-circle"
              style="width:100px;height:100px"
            />
            <div>
              <p><b>Nome:</b> {{ funcionario.nome }}</p>
              <p><b>Email:</b> {{ funcionario.email }}</p>
              <p><b>Função:</b> {{ funcionario.funcao }}</p>
            </div>
          </div>
        </div>

        <!-- SELEÇÃO DA PEÇA -->
        <div class="card shadow-sm mt-4">
          <div class="card-body">
            <label class="fw-bold">Peça (OP)</label>
            <select v-model="pecaSelecionada" class="form-select">
              <option disabled value="">Selecione a peça</option>
              <option
                v-for="p in pecas"
                :key="p.id_da_op"
                :value="p"
              >
                {{ p.descricao }}
              </option>
            </select>
          </div>
        </div>

        <!-- TABELA FIXA -->
        <div v-if="pecaSelecionada" class="card shadow-sm mt-4">
          <div class="card-header fw-bold">
            📋 Produção do dia
          </div>

          <div class="card-body table-responsive">
            <table class="table table-sm text-center align-middle">
              <thead class="table-primary">
                <tr>
                  <th>Hora</th>
                  <th>Etapa</th>
                  <th>Qtd Produzida</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="(linha, i) in tabelaProducao"
                  :key="i"
                  :class="{ 'linha-preenchida': linha.quantidade_pecas > 0 }"
                >

                  <td>
                    <span class="hora-badge">
                      {{ linha.hora }}
                    </span>
                  </td>
                  <td>
                    <select
                      class="form-select form-select-sm"
                      v-model="linha.id_da_funcao"
                    >
                      <option disabled value="">Selecione</option>
                      <option
                        v-for="e in pecaSelecionada.etapas"
                        :key="e.id"
                        :value="e.id_da_funcao"
                      >
                        {{ e.etapa.descricao }}
                      </option>
                    </select>
                  </td>

                  <td>
                    <input
                      type="number"
                      min="0"
                      class="form-control form-control-sm"
                      v-model.number="linha.quantidade_pecas"
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            <div class="text-end mt-3">
              <button class="btn btn-success" @click="salvarProducaoDoDia">
                💾 Salvar produção do dia
              </button>
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
import api from '@/Axios'
import { useAuthStore } from '@/store/store'
import Swal from 'sweetalert2'

export default {
  name: 'ProducaoPorFuncionario',
  components: { Sidebar, TituloSubtitulo },

  data() {
    return {
      funcionario: null,
      pecas: [],
      pecaSelecionada: null,

      horariosFixos: [
        "07:00", "08:00", "09:00", "10:00",
        "11:00", "11:30", "12:00", "13:00",
        "14:00", "15:00", "16:00", "17:00",
        "17:30", "18:00"
      ],

      tabelaProducao: [],
      idFuncionario: this.$route.params.emailFuncionario
    }
  },

  setup() {
    const store = useAuthStore()
    return { store }
  },

  watch: {
    pecaSelecionada() {
      if (!this.pecaSelecionada) return

      // monta tabela fixa automaticamente
      this.tabelaProducao = this.horariosFixos.map(hora => ({
        hora,
        id_da_funcao: null,
        quantidade_pecas: null
      }))
    }
  },

  methods: {
    async carregarDados() {
      const res = await api.get(`/funcionario/${this.idFuncionario}`, {
        headers: { Authorization: this.store.pegar_token }
      })
      this.funcionario = res.data.funcionario
      console.log(this.funcionario)
    },

    async carregarPecas() {
      const { data } = await api.get('/pecas', {
        headers: { Authorization: this.store.pegar_token }
      })
      this.pecas = data.peca.em_progresso
      console.log(this.pecas)
    },

    async salvarProducaoDoDia() {
      const producoes = this.tabelaProducao
        .filter(l => l.id_da_funcao && l.quantidade_pecas > 0)
        .map(l => ({
          id_da_op: this.pecaSelecionada.id_da_op,
          id_da_funcao: l.id_da_funcao,
          quantidade_pecas: l.quantidade_pecas,
          hora_registro: l.hora,
          id_funcionario: this.idFuncionario
        }))

      if (!producoes.length) {
        Swal.fire('Atenção', 'Nenhuma produção informada', 'warning')
        return
      }

      await api.post('/producao/lote', { producoes }, {
        headers: { Authorization: this.store.pegar_token }
      })

      Swal.fire('Sucesso', 'Produção do dia salva!', 'success')
    }
  },

  mounted() {
    this.carregarDados()
    this.carregarPecas()
  }
}
</script>


<style scoped>
.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
  width: 100%;
}

.btn {
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
/* =========================
   CONTAINER DA TABELA
========================= */
.table-responsive {
  background: #f5f7f9;
  padding: 16px;
  border-radius: 14px;
}

/* =========================
   TABELA BASE
========================= */
.table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 10px;
  background: transparent;
  font-family: 'Montserrat', sans-serif;
}

/* =========================
   CABEÇALHO
========================= */
.table thead th {
  background: transparent;
  color: #5c6b73;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 6px 10px;
  border: none;
}

/* =========================
   LINHAS (CARD HORIZONTAL)
========================= */
.table tbody tr {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

/* Hover */
.table tbody tr:hover {
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

/* Células */
.table tbody td {
  padding: 14px 12px;
  font-size: 13px;
  color: #2f2f2f;
  border: none;
}

/* Arredondamento lateral */
.table tbody tr td:first-child {
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
}

.table tbody tr td:last-child {
  border-top-right-radius: 12px;
  border-bottom-right-radius: 12px;
}

/* =========================
   LINHA PREENCHIDA
========================= */
.linha-preenchida {
  background: #f0f9f4 !important;
  border-left: 4px solid #198754;
}

/* =========================
   HORA
========================= */
.hora-badge {
  display: inline-block;
  min-width: 64px;
  padding: 6px 10px;
  background: #eef1f4;
  color: #344054;
  font-weight: 600;
  font-size: 13px;
  border-radius: 8px;
}

/* =========================
   SELECT E INPUT
========================= */
.form-select-sm,
.form-control-sm {
  width: 100%;
  height: 36px;
  border-radius: 8px;
  border: 1px solid #d0d5dd;
  background: #ffffff;
  font-size: 13px;
  padding: 6px 10px;
  transition: all 0.15s ease;
}

/* Focus */
.form-select-sm:focus,
.form-control-sm:focus {
  outline: none;
  border-color: #198754;
  box-shadow: 0 0 0 2px rgba(25, 135, 84, 0.15);
}

/* Quantidade centralizada */
.form-control-sm[type="number"] {
  text-align: center;
  font-weight: 600;
}

/* =========================
   BOTÃO SALVAR
========================= */
.btn-success {
  background: #198754;
  border: none;
  border-radius: 10px;
  padding: 10px 26px;
  font-size: 14px;
  font-weight: 600;
}

.btn-success:hover {
  background: #157347;
}

/* =========================
   RESPONSIVO
========================= */
@media (max-width: 768px) {
  .table {
    border-spacing: 0 6px;
  }

  .table tbody td {
    padding: 10px 8px;
  }
}

</style>
