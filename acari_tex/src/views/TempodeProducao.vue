<template>
  <div>
    <Sidebar />
    <carregandoTela v-if="carregando" />
    <main class="content-wrapper" v-else>
      <div class="container-fluid py-3">

        <TituloSubtitulo titulo="Produção por Funcionário" subtitulo="Apontamento diário por horário"
          icone="fa-solid fa-clipboard-list" />

        <!-- DADOS FUNCIONÁRIO -->
        <div v-if="funcionario" class="card shadow-sm mt-4">
          <div class="card-body d-flex gap-3 align-items-center">
            <img :src="funcionario.foto || 'https://via.placeholder.com/100'" class="rounded-circle" width="100"
              height="100" />
            <div>
              <p><b>Nome:</b> {{ funcionario.nome }}</p>
              <p><b>Email:</b> {{ funcionario.email }}</p>
              <p><b>Função:</b> {{ funcionario.funcao }}</p>
            </div>
          </div>
        </div>

        <div class="card shadow-sm mt-4">
          <div class="card-body">
            <div class="row g-3">

              <!-- PEÇA -->
              <div class="col-md-6">
                <label class="fw-bold mb-2">Peça (OP) - Registro em lote</label>
                <select v-model="pecaSelecionada" class="form-select">
                  <option disabled value="">Selecione a peça</option>
                  <option v-for="p in pecas" :key="p.id_da_op" :value="p">
                    {{ p.descricao }}
                  </option>
                </select>
              </div>

              <!-- ETAPA PADRÃO -->
              <div class="col-md-6">
                <label class="fw-bold mb-2">
                  Etapa padrão <small class="text-muted">(opcional)</small>
                </label>
                <select v-model="etapaPadrao" class="form-select" :disabled="!pecaSelecionada">
                  <option value="">— Não definir etapa padrão —</option>
                  <option v-for="e in pecaSelecionada?.etapas || []" :key="e.id_da_funcao" :value="e.id_da_funcao">
                    {{ e.etapa.descricao }}
                  </option>
                </select>
              </div>

            </div>
          </div>
        </div>


        <!-- PRODUÇÃO DO DIA -->
        <div v-if="pecaSelecionada" class="card shadow-sm mt-4">
          <div class="card-header fw-bold">
            📋 Produção do dia
          </div>

          <div class="card-body">
            <div class="producao-grid">

              <div v-for="(slot, index) in tabelaProducao" :key="index" class="producao-slot" :class="{
                preenchido: slot.quantidade_pecas > 0,
                'ja-registrado': slot.jaRegistrado
              }">
                <div class="slot-hora">
                  {{ slot.hora }}
                </div>

                <select v-model="slot.id_da_funcao">
                  <option disabled value="">Etapa</option>
                  <option v-for="e in pecaSelecionada.etapas" :key="e.id_da_funcao" :value="e.id_da_funcao">
                    {{ e.etapa.descricao }}
                  </option>
                </select>

                <input type="number" min="0" placeholder="Qtd" v-model.number="slot.quantidade_pecas"
                  @input="aplicarEtapaPadrao(slot)" />

              </div>

            </div>

            <div class="text-end mt-4">
              <button class="btn btn-success" @click="salvarProducaoDoDia">
                💾 Salvar produção do dia
              </button>
            </div>
          </div>
        </div>
        <GraficoProducaoPorDia :dados="producao" class="mb-4 mt-4" />
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
import carregandoTela from '@/components/carregandoTela.vue'
import GraficoProducaoPorDia from '@/components/GraficoProducaoPorDia.vue'

export default {
  name: 'ProducaoPorFuncionario',
  components: { Sidebar, TituloSubtitulo, carregandoTela, GraficoProducaoPorDia },

  data() {
    return {
      funcionario: null,
      pecas: [],
      pecaSelecionada: null,
      producao: [],
      etapaPadrao: null,
      horariosFixos: [
        "07:00", "08:00", "09:00", "10:00",
        "11:00", "11:30", "12:00", "13:00",
        "14:00", "15:00", "16:00", "17:00",
        "17:30", "18:00"
      ],
      carregando: false,
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
      if (!this.pecaSelecionada || !this.funcionario) return

      this.tabelaProducao = this.horariosFixos.map(hora => ({
        hora,
        id_da_funcao: null,
        quantidade_pecas: null,
        jaRegistrado: false
      }))

      this.funcionario.producao_funcionario.forEach(producao => {
        const slot = this.tabelaProducao.find(
          s => s.hora === producao.hora_registro
        )

        if (slot) {
          slot.id_da_funcao = producao.id_da_funcao
          slot.quantidade_pecas = producao.quantidade_pecas
          slot.jaRegistrado = true
        }
      })
    }
  },

  methods: {
    aplicarEtapaPadrao(slot) {
      if (!slot.id_da_funcao && this.etapaPadrao) {
        slot.id_da_funcao = this.etapaPadrao
      }
    },
    async carregarDados() {
      this.carregando = true
      const res = await api.get(`/funcionario/${this.idFuncionario}`, {
        headers: { Authorization: this.store.pegar_token }
      })
      this.funcionario = res.data.funcionario
      this.carregando = false
    },

    async carregarPecas() {
      const { data } = await api.get('/pecas', {
        headers: { Authorization: this.store.pegar_token }
      })
      this.pecas = data.peca.em_progresso
    },
    async producaoFuncionario() {
      const { data } = await api.get(`/producao/funcionario/${this.idFuncionario}`, {
        headers: { Authorization: this.store.pegar_token }
      })
      this.producao = data
      console.log(this.producao)
    },
    async salvarProducaoDoDia() {
      this.carregando = true
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
      this.carregando = false
      this.carregarPecas()
    }
  },

  mounted() {
    this.carregarDados()
    this.carregarPecas()
    this.producaoFuncionario()
  }
}
</script>


<style scoped>
p {
  display: flex;
}

.content-wrapper {
  padding-left: 200px;
}

@media (max-width: 768px) {
  .content-wrapper {
    padding-left: 0;
  }
}

/* GRID PRINCIPAL */
.producao-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

/* SLOT DE HORÁRIO */
.producao-slot {
  width: 180px;
  background: #ffffff;
  border: 1px solid #e4e7ec;
  border-radius: 14px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.2s ease;
}

/* SLOT PREENCHIDO */
.producao-slot.preenchido {
  border-color: #198754;
  background: #f0f9f4;
}

/* HORA */
.slot-hora {
  text-align: center;
  font-weight: 700;
  font-size: 13px;
  background: #eef2f6;
  color: #344054;
  border-radius: 999px;
  padding: 4px 0;
}

/* SELECT */
.producao-slot select {
  height: 34px;
  border-radius: 10px;
  border: 1px solid #d0d5dd;
  font-size: 13px;
}

/* INPUT */
.producao-slot input {
  height: 34px;
  border-radius: 10px;
  border: 1px solid #d0d5dd;
  text-align: center;
  font-weight: 600;
}

/* FOCUS */
.producao-slot select:focus,
.producao-slot input:focus {
  outline: none;
  border-color: #198754;
  box-shadow: 0 0 0 3px rgba(25, 135, 84, 0.15);
}

/* Slot já registrado */
.producao-slot.ja-registrado {
  background: #eef4ff;
  border-color: #4c6ef5;
}

/* Hora destacada */
.producao-slot.ja-registrado .slot-hora {
  background: #4c6ef5;
  color: #fff;
}
</style>
