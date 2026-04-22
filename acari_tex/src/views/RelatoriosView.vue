<template>
    <div class="detalhes-pecas-page">
        <SidebarNav />
        <carregandoTela v-if="loading" />

        <main v-else class="content-wrapper flex-grow-1">
            <div class="container-fluid py-4">

                <TituloSubtitulo titulo="Relatórios de Produção"
                    subtitulo="Acompanhe o progresso e estatísticas das peças em produção" />

                <!-- FILTROS -->
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

                    <div class="col-md-4 mb-2">
                        <input class="form-control" @click="gerarPDF" type="button" value="Gerar PDF">
                    </div>
                </div>

                <!-- TABELA -->
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead>
                            <tr>
                                <th>Descrição</th>
                                <th>Status</th>
                                <th>Quantidade</th>
                                <th>Data</th>
                                <th style="width: 260px;">Ações</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr v-for="peca in pecasFiltradas" :key="peca.id">

                                <td>{{ peca.descricao }}</td>

                                <td>
                                    <span class="status-text" :class="'status-' + peca.status">
                                        {{ traduzStatus(peca.status) }}
                                    </span>
                                </td>

                                <td>{{ peca.quantidade_pecas }}</td>

                                <td>{{ formatarData(peca.data_do_pedido) }}</td>

                                <td class="text-center">
                                    <div class="dropdown">
                                        <button class="btn-menu" type="button" data-bs-toggle="dropdown">
                                            ⋮
                                        </button>

                                        <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                                            <li>
                                                <button class="dropdown-item"
                                                    @click="$router.push(`/pecas/${peca.id_da_op}`)">
                                                    🔍 Detalhar
                                                </button>
                                            </li>

                                            <li>
                                                <button class="dropdown-item" @click="abrirDuplicarModal(peca)">
                                                    📄 Duplicar
                                                </button>
                                            </li>

                                            <li>
                                                <hr class="dropdown-divider">
                                            </li>

                                            <li>
                                                <button class="dropdown-item text-danger"
                                                    @click="deletarPeca(peca.id_da_op)">
                                                    🗑️ Excluir
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
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
import carregandoTela from '@/components/carregandoTela.vue';
import { gerarPDF } from '@/utils/functions/GerarPDF';
import router from '@/router';
import { toValue } from 'vue';

export default {
    name: 'DetalhesPecas',

    components: {
        SidebarNav,
        TituloSubtitulo,
        carregandoTela
    },

    setup() {
        const store = useAuthStore();
        const usuario = store.pegar_usuario;
        return { store, usuario };
    },

    data() {
        return {
            loading: true,
            pecas: [],
            filtroDescricao: '',
            filtroStatus: '',
        };
    },

    computed: {
        pecasFiltradas() {
            const todasPecas = Object.keys(this.pecas).flatMap(status =>
                this.pecas[status].map(peca => ({ ...peca, status }))
            );

            return todasPecas.filter(peca =>
                (!this.filtroDescricao || peca.descricao.toLowerCase().includes(this.filtroDescricao.toLowerCase())) &&
                (!this.filtroStatus || peca.status === this.filtroStatus)
            );
        },
    },

    methods: {
        verificarAutenticacao() {
            const token = this.store.pegar_token;
            const usuario = this.store.pegar_usuario;

            if (!token || !usuario) {
                router.push('/');
            }
        },

        traduzStatus(status) {
            const mapa = {
                nao_iniciado: 'Não iniciadas',
                em_progresso: 'Em andamento',
                coleta: 'Aguardando coleta',
                finalizado: 'Concluídas',
            };
            return mapa[status] || status;
        },

        formatarData(dataStr) {
            return new Date(dataStr).toLocaleDateString('pt-BR');
        },

        async gerarPDF() {
            const pecasPuras = toValue(this.pecas);
            await gerarPDF(pecasPuras, 'Relatório de produção');
        },

        async fetchPecas() {
            this.loading = true;
            const token = this.store.pegar_token;

            const { data } = await api.get('/pecas', {
                headers: { Authorization: `${token}` },
            });

            this.pecas = data.peca;
            this.loading = false;
        },

        async deletarPeca(pecaId) {
            Swal.fire({
                title: 'Confirmação',
                text: 'Deseja excluir esta peça?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sim',
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

                Swal.fire('Excluído!', 'Sucesso.', 'success');
                this.fetchPecas();

            } catch {
                Swal.fire('Erro', 'Falha ao excluir.', 'error');
            }
        },

        async abrirDuplicarModal(peca) {
            const { value: formValues } = await Swal.fire({
                title: 'Duplicar OP',
                html:
                    `<input id="nome" class="swal2-input" placeholder="Novo nome">` +
                    `<input id="qtd" type="number" class="swal2-input" placeholder="Quantidade">`,
                showCancelButton: true,
                confirmButtonText: 'Duplicar',
                preConfirm: () => {
                    const nome = document.getElementById('nome').value;
                    const quantidade = document.getElementById('qtd').value;

                    if (!nome || !quantidade) {
                        Swal.showValidationMessage('Preencha tudo');
                        return false;
                    }

                    return { nome, quantidade };
                }
            });

            if (formValues) {
                this.duplicarOP(peca, formValues);
            }
        },

        async duplicarOP(peca, dados) {
            const token = this.store.pegar_token;

            try {
                console.log(dados);
                const response = await api.post(`/duplicar/op/${peca.id_da_op}`, {
                    descricao: dados.nome,
                    quantidade: Number(dados.quantidade)
                }, {
                    headers: { Authorization: `${token}` },
                });
                console.log(response);
                Swal.fire('Sucesso!', 'OP duplicada.', 'success');
                this.fetchPecas();

            } catch {
                Swal.fire('Erro', 'Não foi possível duplicar.', 'error');
            }
        },
    },

    mounted() {
        this.verificarAutenticacao();
        this.fetchPecas();
    },
};
</script>

<style scoped>
.content-wrapper {
    flex-grow: 1;
    padding-left: 200px;
}

/* FILTROS */
.filtros input,
.filtros select {
    padding: 10px;
    border-radius: 8px;
    border: 1px solid #dcdde1;
}

/* STATUS */
.status-text {
    font-weight: 600;
}

.status-nao_iniciado {
    color: #e74c3c;
}

.status-em_progresso {
    color: #2980b9;
}

.status-coleta {
    color: #f39c12;
}

.status-finalizado {
    color: var(--verde-escuro);
}

/* BOTÕES */
.btn {
    background-color: var(--verde-escuro);
    color: white;
}

.btn:hover {
    background-color: var(--verde-claro);
}

.duplicar {
    background-color: #00640a;
}

.duplicar:hover {
    background-color: #00521b;
}

.excluir {
    background-color: #e74c3c;
}

tr {
    text-align: -webkit-left;
}

/* BOTÃO 3 PONTINHOS */
.btn-menu {
    background: transparent;
    float: left;
    border: none;
    font-size: 20px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: background 0.2s;
}

.btn-menu:hover {
    background: #f1f2f6;
}

/* DROPDOWN */
.dropdown-menu {
    border-radius: 10px;
    border: none;
    padding: 8px;
    min-width: 160px;
}

.dropdown-item {
    border-radius: 6px;
    padding: 8px 12px;
    transition: background 0.2s;
    font-size: 14px;
}

.dropdown-item:hover {
    background: #f5f6fa;
}

.dropdown-item.text-danger:hover {
    background: #fdecea;
}

/* RESPONSIVO */
@media (max-width: 768px) {
    .content-wrapper {
        padding-left: 0;
    }
}
</style>