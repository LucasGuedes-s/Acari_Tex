<template>
  <div class="grafico-producao">
    <div class="filtros mb-4 p-4 bg-white rounded-xl shadow-md border border-gray-100">
      <h3 class="text-xl font-extrabold text-green-700 mb-4 border-b pb-2">
        Progresso por Etapa de Produção
      </h3>
      
      <label class="font-semibold text-gray-700 mb-1 block">
        Selecionar Ordem de Produção (OP):
      </label>
      <select
        v-model="pecaSelecionadaNome"
        class="form-select border border-gray-300 focus:border-green-500 p-2 rounded-lg w-full md:w-2/3 lg:w-1/2 transition duration-150 ease-in-out"
      >
        <option 
          v-for="op in pecasDisponiveis" 
          :key="op.peca" 
          :value="op.peca"
        >
          {{ op.peca }} — Total: {{ op.total }} / Meta: {{ op.meta }}
        </option>
      </select>
      
      <p v-if="dadosOp.peca" class="text-sm text-gray-500 mt-3 p-2 bg-green-50 rounded-md border border-green-200">
        OP Atual: <span class="font-bold text-green-700">{{ dadosOp.peca }}</span> — Meta Total: <span class="font-bold">{{ dadosOp.meta }}</span>
      </p>
    </div>

    <div class="grafico-container bg-white p-6 rounded-xl shadow-md">
      <canvas ref="chartCanvas" v-show="temDados" style="height: 350px;"></canvas>

      <p v-if="!temDados" class="sem-dados text-lg">
        Sem dados de etapas disponíveis para a OP selecionada.
      </p>
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue"; 
import Chart from "chart.js/auto";
import api from "@/Axios";
import { useAuthStore } from "@/store/store";

export default {
  name: "GraficoProducaoEtapas",

  setup() {
    const chartCanvas = ref(null);
    const chartInstance = ref(null);
    const temDados = ref(true);
    
    const pecasDisponiveis = ref([]); 
    const pecaSelecionadaNome = ref(null); 
    const dadosOp = ref({}); 

    const CORES = {
        PRODUZIDO: "#10B981", 
        META_FUNDO: "#E5E7EB", 
        EXCEDIDO: "#F59E0B",
    };

    const destruirGrafico = () => {
      if (chartCanvas.value) {
        const existingChart = Chart.getChart(chartCanvas.value);
        if (existingChart) {
             try {
                existingChart.destroy();
            } catch (error) {
                console.error("Erro ao destruir gráfico existente via getChart:", error);
            }
        }
      }
      chartInstance.value = null;
    };
    
    const agruparDadosPorEtapa = (historico) => {
      if (!historico) return [];
      
      const agrupamento = historico.reduce((acc, item) => {
        const etapa = item.etapa;
        const quantidade = item.quantidade;
        
        if (!acc[etapa]) {
          acc[etapa] = 0;
        }
        acc[etapa] += quantidade;
        return acc;
      }, {});

      return Object.keys(agrupamento).map(etapa => ({
        etapa: etapa,
        total: agrupamento[etapa]
      }));
    };

    const atualizarGrafico = () => {
      destruirGrafico();

      const { historico, meta, peca } = dadosOp.value;
      
      if (!historico || historico.length === 0 || !meta) {
        temDados.value = false;
        return;
      }
      
      const etapasAgrupadas = agruparDadosPorEtapa(historico);
      const metaTotal = meta || 0;
      
      const labels = etapasAgrupadas.map(e => e.etapa);
      const produzidos = etapasAgrupadas.map(e => e.total);
      
      const restantesParaMeta = produzidos.map(p => Math.max(0, metaTotal - p));
      
      const maximoEixo = metaTotal * 1.1; 

      temDados.value = true;

      nextTick(() => { 
        if (!chartCanvas.value) return;
        const ctx = chartCanvas.value.getContext("2d");
        if (!ctx) return;

        chartInstance.value = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "Restante para Meta Total",
                        data: restantesParaMeta,
                        backgroundColor: CORES.META_FUNDO,
                        stack: "ProducaoStack",
                    },
                    {
                        label: "Peças Processadas",
                        data: produzidos,
                        backgroundColor: produzidos.map(p => p > metaTotal ? CORES.EXCEDIDO : CORES.PRODUZIDO),
                        stack: "ProducaoStack", 
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                
                scales: {
                    x: {
                        stacked: true,
                        title: { display: true, text: "Peças Processadas / Meta Total" },
                        beginAtZero: true,
                        max: maximoEixo, 
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                    },
                },

                plugins: {
                    title: {
                        display: true,
                        text: `Progresso da OP: ${peca}`,
                        font: { size: 18, weight: "bold" },
                    },
                    tooltip: {
                        callbacks: {
                            afterBody: function(context) {
                                const index = context[0].dataIndex;
                                const produzidoEtapa = produzidos[index];
                                const excedido = Math.max(0, produzidoEtapa - metaTotal);

                                let info = `\nMeta Final da OP: ${metaTotal}`;
                                if (excedido > 0) {
                                     info += `\nExcedido: ${excedido}`;
                                }
                                return info;
                            },
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.x;
                                
                                if (label === "Restante para Meta Total") {
                                    return `Progresso da Etapa: ${produzidos[context.dataIndex]} / ${metaTotal}`;
                                }
                                return `${label}: ${value} peças`;
                            }
                        }
                    },
                    legend: {
                        position: "top", 
                        labels: { usePointStyle: false },
                    },
                },
            },
        });
      });
    };
    
    const fetchData = async () => {
      try {
        const token = useAuthStore().pegar_token;
        const res = await api.get("/producao/estabelecimento", {
          headers: { Authorization: `${token}` },
        });

        const producoes = res.data.producao || {};
        
        const dadosArray = Object.values(producoes);
        
        pecasDisponiveis.value = dadosArray; 

        if (dadosArray.length > 0) {
            pecaSelecionadaNome.value = dadosArray[0].peca; 
        } else {
             temDados.value = false;
        }
        
      } catch (error) {
        console.error("Erro ao buscar dados da produção:", error);
        temDados.value = false;
      }
    };

    watch(pecaSelecionadaNome, (novoNome) => {
        if (novoNome) {
            const opSelecionada = pecasDisponiveis.value.find(p => p.peca === novoNome);
            if (opSelecionada) {
                dadosOp.value = opSelecionada;
            }
        }
    }, { immediate: true });

    watch(dadosOp, atualizarGrafico, { deep: true });

    onMounted(fetchData);
    onBeforeUnmount(destruirGrafico); 

    return { chartCanvas, temDados, dadosOp, pecasDisponiveis, pecaSelecionadaNome };
  },
};
</script>

<style scoped>
.grafico-producao {
  max-width: 100%;
  margin: 0 auto;
}
.sem-dados {
  text-align: center;
  padding: 50px 0;
  color: #6c757d;
  font-size: 16px;
  font-style: italic;
}
label{
  display: flex;
}
</style>