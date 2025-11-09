<template>
  <div class="configuracoes-page">
    <SidebarNav />
    <carregandoTela v-if="loading" />

    <main v-else class="content-wrapper flex-grow-1">
      <div class="container-fluid py-4">
        <TituloSubtitulo
          titulo="⚙️ Configurações do Sistema"
          subtitulo="Personalize informações, aparência e preferências da sua fábrica"
        />

        <!-- Informações da Fábrica -->
        <div class="card mt-4 shadow-sm border-0 p-4 bg-white">
          <h6 class="fw-semibold mb-3 text-secondary">Informações da Fábrica 🏭</h6>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label text-start w-100">Nome da Fábrica</label>
              <input
                type="text"
                class="form-control"
                v-model="config.nome"
                placeholder="Ex: Acari Têxtil"
              />
            </div>
            <div class="col-md-6">
              <label class="form-label text-start w-100">CNPJ</label>
              <input
                type="text"
                class="form-control"
                v-model="config.cnpj"
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div class="col-md-6">
              <label class="form-label text-start w-100">Endereço</label>
              <input
                type="text"
                class="form-control"
                v-model="config.endereco"
                placeholder="Rua, número, bairro"
              />
            </div>
            <div class="col-md-6">
              <label class="form-label text-start w-100">Telefone</label>
              <input
                type="text"
                class="form-control"
                v-model="config.telefone"
                placeholder="(84) 99999-9999"
              />
            </div>
            <div class="col-md-6">
              <label class="form-label text-start w-100">Horas de trabalho por dia ⏰</label>
              <input
                type="number"
                class="form-control"
                v-model.number="config.horas_trabalho"
                min="1"
                max="24"
                placeholder="Ex: 8"
              />
              <small class="text-muted">Informe a carga horária diária padrão da empresa</small>
            </div>
          </div>
        </div>

        <!-- Botões -->
        <div class="text-end mt-4">
          <button class="btn btn-secondary me-2" @click="resetarConfiguracoes">Restaurar padrão</button>
          <button class="btn btn-success" @click="salvarConfiguracoes">Salvar alterações</button>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import SidebarNav from '@/components/Sidebar.vue';
import TituloSubtitulo from '@/components/TituloSubtitulo.vue';
import carregandoTela from '@/components/carregandoTela.vue';
import { useAuthStore } from '@/store/store';
import api from '@/Axios';
import router from '@/router';

export default {
  name: 'configuracoes-empresa',
  components: { SidebarNav, TituloSubtitulo, carregandoTela },
  setup() {
    const store = useAuthStore();
    return { store };
  },
  data() {
    return {
      loading: true,
      config: {
        nome: '',
        cnpj: '',
        endereco: '',
        telefone: '',
        tema: 'claro',
        cor_principal: '#4CAF50',
        notificacoes: true,
        relatorio_auto: false,
        horas_trabalho: 8, // novo campo padrão
      },
    };
  },
  async mounted() {
    this.verificarAutenticacao();
    await this.carregarConfiguracoes();
  },
  methods: {
    verificarAutenticacao() {
      const token = this.store.pegar_token;
      const usuario = this.store.pegar_usuario;
      if (!token || !usuario) router.push('/');
    },

    async carregarConfiguracoes() {
      try {
        const token = this.store.pegar_token;
        const { data } = await api.get('/empresa', {
          headers: { Authorization: `${token}` },
        });
        console.log(data)
        this.config = { ...this.config, ...(data.resultado || {}) };
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
      } finally {
        this.loading = false;
      }
    },

    async salvarConfiguracoes() {
      try {
        const token = this.store.pegar_token;
        await api.put('/empresa', this.config, {
          headers: { Authorization: `${token}` },
        });
        alert('✅ Configurações salvas com sucesso!');
      } catch (err) {
        console.error('Erro ao salvar configurações:', err);
        alert('❌ Erro ao salvar configurações.');
      }
    },

    resetarConfiguracoes() {
      if (confirm('Tem certeza que deseja restaurar as configurações padrão?')) {
        this.config = {
          nome_fabrica: '',
          cnpj: '',
          endereco: '',
          telefone: '',
          tema: 'claro',
          cor_principal: '#4CAF50',
          notificacoes: true,
          relatorio_auto: false,
          horas_trabalho: 8,
        };
      }
    },
  },
};
</script>

<style scoped>
.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
}

.card h6 {
  font-size: 0.9rem;
}

.form-label {
  font-weight: 500;
  text-align: left !important;
  display: block;
}

.btn-success {
  background-color: var(--verde-escuro);
  border: none;
}

.btn-success:hover {
  background-color: #3a8b3a;
}

small.text-muted {
  font-size: 0.8rem;
}

@media (max-width: 768px) {
  .content-wrapper {
    padding-left: 0;
  }
}
</style>
