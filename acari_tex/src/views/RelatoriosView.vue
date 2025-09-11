<template>
    <div class="detalhes-pecas-page">
        <SidebarNav />
        <main class="content-wrapper flex-grow-1">
            <div class="container-fluid py-4">
                <TituloSubtitulo titulo="Relatórios de Produção"
                    subtitulo="Acompanhe o progresso e estatísticas das peças em produção" />

                <div class="filtros row mb-4">
                    <div class="col-md-4 mb-2">
                        <input type="text" class="form-control" placeholder="Buscar por descrição..."
                            v-model="filtroDescricao" />
                    </div>
                    <div class="col-md-4 mb-2">
                        <select class="form-control" v-model="filtroStatus">
                            <option value="">Todos os status</option>
                            <option value="nao_iniciado">Não iniciadas</option>
                            <option value="em_progresso">Em andamento</option>
                            <option value="coleta">Aguardando coleta</option>
                            <option value="finalizado">Concluídas</option>
                        </select>
                    </div>
                    <!--
                    <div class="col-md-4 mb-2">
                        <input type="date" class="form-control" v-model="filtroData" />
                    </div>  -->
                </div>

                <div class="row">
                    <div class="col-md-4 mb-3" v-for="peca in pecasFiltradas" :key="peca.id">
                        <div class="card p-3 shadow-sm h-100">
                            <h5>{{ peca.descricao }}</h5>
                            <p>Status:
                                <span class="status-text" :class="'status-' + peca.status">
                                    {{ traduzStatus(peca.status) }}
                                </span>
                            </p>

                            <p>Quantidade: {{ peca.quantidade }}</p>
                            <p>Data de Criação: {{ formatarData(peca.data_do_pedido) }}</p>
                            <div class="mt-3 d-flex flex-row gap-2">
                                <button 
                                    class="btn w-50" 
                                    @click="$router.push(`/pecas/${peca.id_da_op}`)">
                                    Ver estatísticas
                                </button>

                                <button 
                                    class="btn excluir w-50" 
                                    @click="deletarPeca(peca.id_da_op)">
                                    Excluir
                                </button>
                                </div>

                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<script>
import SidebarNav from '@/components/Sidebar.vue';
import { useAuthStore } from '@/store/store';
import TituloSubtitulo from '@/components/TituloSubtitulo.vue';
import api from '@/Axios';
import Swal from 'sweetalert2';

export default {
    name: 'DetalhesPecas',
    components: { SidebarNav, TituloSubtitulo },
    setup() {
        const store = useAuthStore();
        return { store };
    },
    data() {
        return {
            pecas: [],
            filtroDescricao: '',
            filtroStatus: '',
            filtroData: '',
            pecaSelecionada: null,
            pecaChartData: [['Hora', 'Produção']],
            chartOptions: {
                title: 'Produção por hora',
                curveType: 'function',
                legend: { position: 'bottom' },
            },
        };
    },
    computed: {
        pecasFiltradas() {
            // transforma objeto {status: [...] } em array
            const todasPecas = Object.keys(this.pecas).flatMap(status =>
                this.pecas[status].map(peca => ({ ...peca, status }))
            );

            return todasPecas.filter(peca => {
                return (!this.filtroDescricao || peca.descricao.toLowerCase().includes(this.filtroDescricao.toLowerCase()))
                    && (!this.filtroStatus || peca.status === this.filtroStatus)
                    && (!this.filtroData || peca.criado_em.startsWith(this.filtroData));
            });
        },
    },
    methods: {
        traduzStatus(status) {
            const mapa = {
                nao_iniciado: 'Não iniciadas',
                em_progresso: 'Em andamento',
                coleta: 'Aguardando coleta',
                finalizado: 'Concluídas',
            };
            return mapa[status] || status;
        },
        statusClass(status) {
            return {
                'badge bg-danger': status === 'nao_iniciado',
                'badge bg-primary': status === 'em_progresso',
                'badge bg-warning': status === 'coleta',
                'badge bg-success': status === 'finalizado',
            };
        },
        formatarData(dataStr) {
            return new Date(dataStr).toLocaleDateString('pt-BR');
        },
        async fetchPecas() {
            const token = this.store.pegar_token;
            const { data } = await api.get('/pecas', {
                headers: { Authorization: `${token}` },
            });
            this.pecas = data.peca
            console.log(data.peca)
        },
        async deletarPeca(pecaId) {
            Swal.fire({
                title: 'Confirmação',
                text: 'Tem certeza que deseja excluir esta peça? Esta ação não pode ser desfeita.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sim, excluir',
                cancelButtonText: 'Cancelar',
            }).then((result) => {
                if (result.isConfirmed) {
                    this.confirmarDelecao(pecaId);
                }
            });
        },
        async confirmarDelecao(pecaId) {
            const token = this.store.pegar_token;

            try {
                await api.post(`/deletar/peca/${pecaId}`, {}, {
                    headers: { Authorization: `${token}` },
                });

                // Remover peça da lista localmente
                this.pecas = Object.fromEntries(
                    Object.entries(this.pecas).map(([status, lista]) => [
                        status,
                        lista.filter(peca => peca.id !== pecaId)
                    ])
                );

                Swal.fire('Excluído!', 'A peça foi excluída com sucesso.', 'success');
                this.fetchPecas(); 
            } catch (error) {
                console.error("Erro ao excluir peça:", error);
                Swal.fire('Erro', 'Ocorreu um erro ao tentar excluir a peça.', 'error');    
            }
        },
        async selecionarPeca(peca) {
            this.pecaSelecionada = peca;
            const token = this.store.pegar_token;

            try {
                const res = await api.get(`/estatisticas/${peca.id_da_op}`, {
                    headers: { Authorization: `${token}` },
                });

                const stats = res.data.estatisticas;

                // Combina dados da peça com estatísticas
                this.pecaSelecionada = {
                    ...peca,
                    ...stats,
                };

                // Gráfico
                if (stats.producaoPorEtapa && Object.keys(stats.producaoPorEtapa).length > 0) {
                    this.pecaChartData = [
                        ['Etapa', 'Produzido'],
                        ...Object.entries(stats.producaoPorEtapa).map(([etapa, qtd]) => [etapa, qtd])
                    ];
                } else {
                    // sempre exibir algo
                    this.pecaChartData = [
                        ['Etapa', 'Produzido'],
                        ['Nenhuma produção', 0]
                    ];
                }
            } catch (error) {
                console.error("Erro ao buscar estatísticas:", error);
                this.pecaChartData = [
                    ['Etapa', 'Produzido'],
                    ['Erro ao carregar', 0]
                ];
            }
        },
    },
    mounted() {
        this.fetchPecas();
    },
};
</script>

<style scoped>
.content-wrapper {
    flex-grow: 1;
    padding-left: 200px;
}

.bnt {
    margin: 0;
}

/* Filtros */
.filtros input,
.filtros select {
    width: 100%;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid #dcdde1;
    background-color: #fff;
    font-size: 0.95rem;
    transition: all 0.2s;
}

.filtros input:focus,
.filtros select:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 6px rgba(74, 144, 226, 0.3);
}

/* Cards mais clean */
.card {
    border-radius: 12px;
    transition: all 0.3s;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    background: #fff;
    padding: 20px;
}

.card:hover {
    transform: translateY(-6px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}

.card h5 {
    font-weight: 600;
    font-size: 1.1rem;
    margin-bottom: 0.6rem;
    color: #333;
}

.card p {
    margin: 0.2rem 0;
    font-size: 0.95rem;
    color: #555;
}

/* Status apenas com cor no texto */
.status-text {
    font-weight: 600;
}

.status-nao_iniciado {
    color: #e74c3c;
}

/* vermelho */
.status-em_progresso {
    color: #2980b9;
}

/* azul */
.status-coleta {
    color: #f39c12;
}

/* amarelo */
.status-finalizado {
    color: #27ae60;
}

/* Botão */
.btn-primary {
    display: block;
    width: 100%;
    text-align: center;
    background-color: #4a90e2;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    transition: all 0.2s;
}

.btn-primary:hover {
    background-color: #357ab8;
}
.excluir{
    background-color: #e74c3c;
    color: white;
}
/* Animações */
@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

@keyframes slideIn {
    from {
        transform: translateY(-30px);
        opacity: 0;
    }

    to {
        transform: translateY(0);
        opacity: 1;
    }
}

/* Responsividade */
@media (max-width: 768px) {
    .content-wrapper {
        padding-left: 0px;
    }
}
</style>
