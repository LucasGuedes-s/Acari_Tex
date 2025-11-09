<template>
    <div class="etapas-page">
        <SidebarNav />
        <carregandoTela v-if="loading" />

        <main v-else class="content-wrapper flex-grow-1">
            <div class="container-fluid py-4">
                <TituloSubtitulo titulo="⚙️ Etapas" subtitulo="Gerencie as etapas de produção cadastradas" />

                <div class="row">
                    <div class="col-12">
                        <div v-if="etapas.length === 0" class="text-center text-muted py-3">
                            Nenhuma etapa cadastrada ainda.
                        </div>

                        <div v-else class="row g-3 justify-content-center">
                            <div v-for="etapa in etapas" :key="etapa.id_da_funcao" class="col-12">
                                <div class="card shadow-sm border-0 h-100 etapa-card">
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between align-items-start">
                                            <div>
                                                <h5 class="fw-bold mb-1">{{ etapa.descricao }}</h5>
                                                <p class="text-muted mb-0">
                                                    ⏱ {{ etapa.tempo_padrao ? etapa.tempo_padrao + ' min' : 'Sem tempo padrão' }}
                                                </p>
                                            </div>
                                            <div class="d-flex gap-2 align-items-center">
                                                <button class="btn-icon time" title="Tempo Padrão">
                                                    <i class="bi bi-clock"></i>
                                                </button>

                                                <button class="btn-icon edit" @click="abrirModalEditar(etapa)"
                                                    title="Editar">
                                                    <i class="bi bi-pencil"></i>
                                                </button>

                                                <button class="btn-icon delete"
                                                    @click="confirmarExclusao(etapa.id_da_funcao)" title="Excluir">
                                                    <i class="bi bi-trash3"></i>
                                                </button>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- MODAL DE EDIÇÃO -->
                <div class="modal fade" id="modalEditarEtapa" tabindex="-1" aria-labelledby="modalEditarEtapaLabel"
                    aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content border-0 rounded-3 shadow">
                            <div class="modal-header bg-light">
                                <h5 class="modal-title" id="modalEditarEtapaLabel">Editar Etapa</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"
                                    aria-label="Fechar"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label class="form-label">Descrição</label>
                                    <input v-model="etapaEdicao.descricao" type="text" class="form-control" />
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Tempo Padrão (min)</label>
                                    <input v-model.number="etapaEdicao.tempo_padrao" type="number"
                                        class="form-control" />
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary"
                                    data-bs-dismiss="modal">Cancelar</button>
                                <button type="button" class="btn btn-success" @click="salvarEdicao">Salvar</button>
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
import carregandoTela from '@/components/carregandoTela.vue';
import { useAuthStore } from '@/store/store';
import api from '@/Axios';
import Swal from 'sweetalert2';
import { Modal } from 'bootstrap';
import TituloSubtitulo from '@/components/TituloSubtitulo.vue';

export default {
    name: 'EtapasView',
    components: {
        SidebarNav,
        carregandoTela,
        TituloSubtitulo
    },
    data() {
        return {
            etapas: [],
            etapaEdicao: { id_da_funcao: null, descricao: '', tempo_padrao: null },
            modalEditar: null,
            loading: true,
        };
    },
    setup() {
        const store = useAuthStore();
        return { store };
    },
    methods: {
        async buscarEtapas() {
            try {
                const token = this.store.pegar_token;
                const { data } = await api.get('/etapas/estabelecimento', {
                    headers: { Authorization: `${token}` },
                });
                this.etapas = data.etapa || [];
            } catch (error) {
                console.error('Erro ao buscar etapas:', error);
            } finally {
                this.loading = false;
            }
        },

        abrirModalEditar(etapa) {
            this.etapaEdicao = { ...etapa };
            if (!this.modalEditar) {
                this.modalEditar = new Modal(document.getElementById('modalEditarEtapa'));
            }
            this.modalEditar.show();
        },

        async salvarEdicao() {
            try {
                const token = this.store.pegar_token;
                await api.put(`/etapas/${this.etapaEdicao.id_da_funcao}`, this.etapaEdicao, {
                    headers: { Authorization: `${token}` },
                });
                Swal.fire('Sucesso', 'Etapa atualizada com sucesso!', 'success');
                this.modalEditar.hide();
                this.buscarEtapas();
            } catch (error) {
                console.error('Erro ao salvar edição:', error);
                Swal.fire('Erro', 'Não foi possível salvar a etapa.', 'error');
            }
        },

        async confirmarExclusao(id) {
            const confirm = await Swal.fire({
                title: 'Excluir Etapa?',
                text: 'Esta ação não pode ser desfeita!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sim, excluir',
                cancelButtonText: 'Cancelar',
            });

            if (confirm.isConfirmed) {
                try {
                    const token = this.store.pegar_token;
                    await api.delete(`/etapas/${id}`, {
                        headers: { Authorization: `${token}` },
                    });
                    Swal.fire('Excluída!', 'A etapa foi removida com sucesso.', 'success');
                    this.buscarEtapas();
                } catch (error) {
                    console.error('Erro ao excluir etapa:', error);
                    Swal.fire('Erro', 'Não foi possível excluir a etapa.', 'error');
                }
            }
        },
    },
    mounted() {
        this.buscarEtapas();
    },
};
</script>

<style scoped>
.etapa-card {
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    border-radius: 16px;
    padding: 10px;
}

.etapa-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.card-body {
    padding: 1.25rem 1.5rem;
}

h5.fw-bold {
    font-size: 1.15rem;
    color: #222;
}

.text-muted {
    color: #6c757d !important;
}

/* --- Botões circulares --- */
.btn-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background-color: #f1f3f5;
    color: #495057;
    transition: all 0.2s ease;
}

.btn-icon:hover {
    transform: scale(1.1);
}

/* Cores específicas */
.btn-icon.edit:hover {
    background-color: #e7f3ff;
    color: #0d6efd;
}

.btn-icon.delete:hover {
    background-color: #ffe8e8;
    color: #dc3545;
}

/* Modal */
label {
    display: flex;
    font-weight: 500;
}

.modal-content {
    border-radius: 14px;
}

.content-wrapper {
    flex-grow: 1;
    padding-left: 200px;
    width: 100%;
}

@media (max-width: 768px) {
    .content-wrapper {
        padding-left: 0px;
    }
}
</style>
