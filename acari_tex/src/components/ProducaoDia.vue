<template>
  <div class="profissionais-container">
    
<div class="topo">
  <div class="topo-header">
    <h2>Produção por Profissional</h2>

    <div class="filtro-data">
      <label>Data</label>
      <input
        type="date"
        v-model="dataSelecionada"
        @change="emitirData"
      />
    </div>
  </div>

  <div class="cards-resumo">
    <div class="card-resumo">
      <span>Eficiência Média</span>
      <strong>{{ eficienciaMedia }}</strong>
    </div>

    <div class="card-resumo">
      <span>Funcionários</span>
      <strong>{{ funcionariosOrdenados.length }}</strong>
    </div>
  </div>
</div>

    <!-- LISTA -->
    <div class="lista-scroll">
      <div
        v-for="(func, index) in funcionariosOrdenados"
        :key="index"
        class="card-funcionario"
        :class="getRankingClasse(index)"
      >
        <!-- HEADER -->
        <div class="header" @click="toggleExpand(index)">
          
          <!-- RANK -->
          <div class="ranking">
            {{ getRankingIcon(index) }}
          </div>

          <img class="avatar" :src="func.foto" />

          <div class="info">
            <strong>{{ func.nome }}</strong>
          </div>

          <div class="dados">
            <span
              class="eficiencia"
              :class="getClasseEficiencia(func)"
            >
              {{ func.eficiencia_pessoal }}
            </span>

            <span class="pecas">{{ func.total_pecas || 0 }} peças</span>
          </div>
        </div>

        <!-- EXPANDIDO -->
        <transition name="fade">
          <div v-if="expandido === index" class="expandido">

            <!-- ETAPAS -->
            <div class="secao">
              <h4>Produção por etapas</h4>
              <div v-for="(etapa, i) in func.etapas" :key="i" class="etapa">
                <span>{{ etapa.descricao }}</span>
                <span>{{ etapa.pecas_produzidas }}</span>
              </div>
            </div>

            <!-- PRODUÇÃO POR HORA -->
            <div class="secao">
              <h4>Produção por Hora</h4>

              <div v-if="func.producaoPorHora?.length" class="grid-horas">
                <div
                  v-for="(hora, i) in func.producaoPorHora"
                  :key="i"
                  class="hora-box"
                >
                  <strong>{{ hora.hora }}h</strong>
                  <span>{{ hora.total }} peças</span>

                  <div
                    class="barra"
                    :style="{ width: calcularBarra(hora.quantidade) + '%' }"
                  ></div>
                </div>
              </div>

              <div v-else class="sem-dados">
                Sem dados
              </div>
            </div>

          </div>
        </transition>

      </div>
    </div>

  </div>
</template>

<script>
export default {
  props: {
    producaoDados: Object,
  },

  data() {
    return {
      expandido: null,
      dataSelecionada: null,
    };
  },

  computed: {
    funcionariosOrdenados() {
      return [...(this.producaoDados?.producao?.producaoDia?.funcionarios || [])]
        .map((f) => ({
          ...f,
          eficienciaNumerica: parseFloat(f.eficiencia_pessoal) || 0,
        }))
        .sort((a, b) => b.eficienciaNumerica - a.eficienciaNumerica);
    },

    eficienciaMedia() {
      return this.producaoDados?.producao?.producaoDia?.eficienciaMediaTurma || 0;
    },
  },

  methods: {
    toggleExpand(index) {
      this.expandido = this.expandido === index ? null : index;
    },

    emitirData() {
      this.$emit("filtrar-data", this.dataSelecionada);
    },

    getClasseEficiencia(func) {
      const media = this.eficienciaMedia;
      const valor = func.eficienciaNumerica;

      if (valor >= media + 5) return "alta";
      if (valor >= media - 5) return "media";
      return "baixa";
    },

    calcularBarra(qtd) {
      const max = Math.max(
        ...this.funcionariosOrdenados.flatMap(f =>
          f.producaoPorHora?.map(h => h.quantidade) || []
        )
      );

      if (!max) return 0;

      return (qtd / max) * 100;
    },

    getRankingIcon(index) {
      if (index === 0) return "🥇";
      if (index === 1) return "🥈";
      if (index === 2) return "🥉";
      return index + 1;
    },

    getRankingClasse(index) {
      if (index === 0) return "top1";
      if (index === 1) return "top2";
      if (index === 2) return "top3";
      return "";
    },
  },
};
</script>

<style scoped>
h4{
    font-size: 16px;
    margin: 10px;
    display: flex;
}
.profissionais-container {
  padding: 20px;
  background: #ffffff;
  border-radius: 10px;
}

.topo {
  margin-bottom: 20px;
}

/* HEADER */
.topo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.topo-header h2 {
  font-size: 22px;
  color: #2c3e50;
  font-weight: 600;
}

/* INPUT DATA */
.filtro-data {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  color: #777;
}

.filtro-data input {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #ddd;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: 0.2s;
}

.filtro-data input:hover {
  border-color: #3498db;
}

.filtro-data input:focus {
  outline: none;
  border-color: #3498db;
}

/* CARDS DE RESUMO */
.cards-resumo {
  display: flex;
  gap: 10px;
}

/* CARD */
.card-resumo {
  background: #0A8A38;
  color: white;
  padding: 12px 16px;
  border-radius: 12px;
  min-width: 160px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

.card-resumo strong {
  display: block;
  font-size: 18px;
  margin-top: 4px;
}
/* LISTA */
.lista-scroll {
  max-height: 500px;
  overflow-y: auto;
}

/* CARD */
.card-funcionario {
  background: #eaeaea;
  border-radius: 14px;
  margin-bottom: 10px;
  padding: 10px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  transition: 0.2s;
}

.card-funcionario:hover {
  transform: translateY(-2px);
}

/* RANKING */
.top1 {
  border-left: 5px solid gold;
}

.top2 {
  border-left: 5px solid silver;
}

.top3 {
  border-left: 5px solid #cd7f32;
}

.ranking {
  font-size: 18px;
  margin-right: 8px;
}

/* HEADER */
.header {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.info {
  flex: 1;
  margin-left: 10px;
  display: flex;
}
.hora-box span {
  font-size: 14px;
}
.dados {
  text-align: right;
}

/* EFICIÊNCIA */
.eficiencia {
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
  margin: 10px;
}

.eficiencia.alta {
  background: #e6f9f0;
  color: #1abc9c;
}

.eficiencia.media {
  background: #fff8e6;
  color: #f39c12;
}

.eficiencia.baixa {
  background: #fdecea;
  color: #e74c3c;
}

/* EXPANDIDO */
.expandido {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #eee;
}

/* ETAPAS */
.etapa {
  display: flex;
  justify-content: space-between;
  background: #f7f9fb;
  padding: 6px;
  border-radius: 6px;
  margin-top: 4px;
  font-size: 12px;
}

/* HORAS */
.grid-horas {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 6px;
}

.hora-box {
  background: #f0f3f7;
  border-radius: 8px;
  padding: 8px;
  text-align: center;
}

.hora-box span {
  display: block;
  font-weight: bold;
}

.barra {
  height: 4px;
  background: #3498db;
  margin-top: 5px;
  border-radius: 4px;
}

/* ANIMAÇÃO */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.25s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>