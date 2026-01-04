<template>
    <div class="card-grafico">
        <h3 class="titulo">
            Produção por Etapa
        </h3>
        <Bar v-if="chartData.labels.length" :data="chartDataFinal" :options="chartOptions" />
        <p v-else class="sem-dados">Sem dados para o período selecionado</p>
    </div>
</template>
<script>
import {
    Chart as ChartJS,
    BarElement,
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Tooltip,
    Legend,
} from 'chart.js';

import { Bar } from 'vue-chartjs';

ChartJS.register(
    BarElement,
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Tooltip,
    Legend
);

// Paleta de cores definida
const cores = [
    "#10B981",
    "#3B82F6",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#14B8A6",
];

export default {
    name: 'GraficoProducaoPorEtapaFuncionario',

    components: { Bar },

    props: {
        dados: {
            type: Object,
            required: true,
        },
    },

    computed: {
        chartData() {
            const dias = this.dados?.producao?.dias || [];
            const labels = dias.map(d => d.data);

            const etapasSet = new Set();
            dias.forEach(dia => {
                dia.eficiencia_por_etapa.forEach(etapa =>
                    etapasSet.add(etapa.etapa)
                );
            });

            const etapas = Array.from(etapasSet);

            const datasets = etapas.map((etapa, index) => ({
                label: etapa,
                data: dias.map(dia => {
                    const encontrada = dia.eficiencia_por_etapa.find(
                        e => e.etapa === etapa
                    );
                    return encontrada ? encontrada.quantidade_produzida : 0;
                }),
                backgroundColor: cores[index % cores.length] + 'CC',
                borderColor: cores[index % cores.length],
                borderWidth: 1,
                borderRadius: 6,
                stack: 'producao',
            }));

            return { labels, datasets };
        },

        eficienciaDataset() {
            const dias = this.dados?.producao?.dias || [];

            return {
                label: 'Eficiência (%)',
                type: 'line',
                data: dias.map(d => d.eficiencia_total_percentual),
                yAxisID: 'y1',
                borderColor: '#111827',
                backgroundColor: '#111827',
                borderWidth: 3,
                tension: 0.35,
                pointRadius: 5,
                pointBackgroundColor: '#111827',
                pointBorderColor: '#FFFFFF',
                pointBorderWidth: 2,
            };
        },

        chartDataFinal() {
            return {
                labels: this.chartData.labels,
                datasets: [
                    ...this.chartData.datasets,
                    this.eficienciaDataset,
                ],
            };
        },

        chartOptions() {
            return {
                responsive: true,
                maintainAspectRatio: false,

                interaction: {
                    mode: 'index',
                    intersect: false,
                },

                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 10,
                        },
                    },
                    tooltip: {
                        callbacks: {
                            label(context) {
                                if (context.dataset.type === 'line') {
                                    return `Eficiência: ${context.raw}%`;
                                }
                                return `${context.dataset.label}: ${context.raw} peças`;
                            },
                        },
                    },
                },

                scales: {
                    x: {
                        stacked: true,
                        grid: {
                            display: false,
                        },
                    },
                    y: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Quantidade Produzida',
                        },
                    },
                    y1: {
                        position: 'right',
                        min: 0,
                        max: 100,
                        grid: {
                            drawOnChartArea: false,
                        },
                        title: {
                            display: true,
                            text: 'Eficiência (%)',
                        },
                    },
                },
            };
        },
    },
};
</script>

<style scoped>
.card-grafico {
    background: #ffffff;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
    height: 420px;
}

.titulo {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 16px;
    color: #0A8A38;
}

.sem-dados {
    text-align: center;
    color: #777;
    margin-top: 60px;
}
</style>
