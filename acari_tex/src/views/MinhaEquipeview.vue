<template>
  <div class="d-flex flex-column flex-xl-row">
    <!-- Sidebar -->
    <SidebarNav />

    <main class="content-wrapper flex-grow-1">
      <div class="container-fluid py-4">

      <TituloSubtitulo titulo="📊 Minhas Equipes" subtitulo="Gerencie seu time" />
      <div class="kanban-container">
        <!-- Header -->
        <div class="kanban-header d-flex justify-content-end align-items-center">
          <button class="btn botao" @click="criarEquipe">+ Nova Equipe</button>
        </div>

        <!-- Board -->
        <div class="kanban-board">
          <div v-for="coluna in board" :key="coluna.id" class="kanban-column shadow-sm">
            <div class="kanban-column-header">
              <h5 class="fw-semibold">{{ coluna.nome }}</h5>
              <span class="badge bg-primary">{{ coluna.funcionarios.length }}</span>
            </div>

            <draggable
              v-model="coluna.funcionarios"
              :group="{ name: 'funcionarios', pull: true, put: true }"
              item-key="id"
              class="kanban-list"
              @change="onMoveFuncionario($event, coluna)"
            >
            <template #item="{ element }">
              <div class="kanban-card d-flex align-items-center gap-2">
                <img
                  v-if="element.foto"
                  :src="element.foto"
                  alt="Foto"
                  class="kanban-foto"
                />
                <div class="flex-grow-1">
                  <strong>{{ element.nome }}</strong>
                  <p class="text-muted mb-0 small">{{ element.funcao || '—' }}</p>
                </div>
              </div>
            </template>

            </draggable>

          </div>
        </div>
      </div>
      </div>
    </main>
  </div>
</template>

<script>
import SidebarNav from '@/components/Sidebar.vue'
import draggable from 'vuedraggable'
import api from '@/Axios'
import Swal from 'sweetalert2'
import { useAuthStore } from '@/store/store'
import TituloSubtitulo from '@/components/TituloSubtitulo.vue'
import router from '@/router'

export default {
  components: {
    SidebarNav,
    draggable,
    TituloSubtitulo
  },
  data() {
    return {
      board: [],
      store: useAuthStore()
    }
  },
  mounted() {
    this.verificarAutenticacao()
    this.carregarDados()
  },
  methods: {
   verificarAutenticacao() {
      const token = this.store.pegar_token;
      const usuario = this.store.pegar_usuario;

      if (!token || !usuario) {
        router.push('/');
      }
    },
    extractEmail(obj) {
      if (!obj) return null;
      if (typeof obj === 'string' && obj.includes('@')) return obj;
      if (obj.email && typeof obj.email === 'string') return obj.email;
      if (obj.id && typeof obj.id === 'string' && obj.id.includes('@')) return obj.id;
      if (obj.usuario && obj.usuario.email) return obj.usuario.email;
      if (obj.usuarioEmail) return obj.usuarioEmail;
      return null;
    },

    async carregarDados() {
      try {
        const token = this.store.pegar_token;

        const resEquipes = await api.get('/equipes', { headers: { Authorization: token } });
        const equipes = resEquipes.data.equipes || [];

        const resFunc = await api.get('/funcionarios', { headers: { Authorization: token } });
        const funcionarios = resFunc.data.funcionarios || [];

        const disponiveis = funcionarios.map(f => ({
          id: f.email,          // usamos email como id
          email: f.email,
          nome: f.nome || f.email || '—',
          foto: f.foto,
          funcao: f.funcoes || f.funcao || '—'
        }));


        this.board = [
          { id: 'disponiveis', nome: 'Disponíveis', funcionarios: disponiveis }
        ];
        console.log(equipes)
        equipes.forEach(eq => {
          const funcs = (eq.usuarios || []).map(u => {
            const usuarioObj = u.usuario || u; // suporte para formatos diferentes
            const email = (usuarioObj && (usuarioObj.email || usuarioObj.usuarioEmail)) || String(usuarioObj?.id || u.usuarioEmail || u.email || '');
            return {
              id: email,               // email como id
              email,
              foto: usuarioObj.foto,
              nome: usuarioObj?.nome || usuarioObj?.nome_usuario || email || '—',
              funcao: usuarioObj?.funcoes || usuarioObj?.funcao || '—',
              relId: u.id || null      // id da relação EquipesUsuarios (pode ser útil)
            }
          });

          this.board.push({
            id: eq.id,
            nome: eq.nome,
            funcionarios: funcs
          });
        });
      } catch (err) {
        console.error('Erro ao carregar dados', err);
        Swal.fire('Erro', 'Não foi possível carregar os dados', 'error');
      }
    },

    async criarEquipe() {
      try {
        const { value: nome } = await Swal.fire({
          title: 'Nova Equipe',
          input: 'text',
          inputLabel: 'Digite o nome da equipe',
          inputPlaceholder: 'Ex: Equipe Produção',
          showCancelButton: true,
          confirmButtonText: 'Próximo',
          cancelButtonText: 'Cancelar',
          inputValidator: (value) => {
            if (!value || !value.trim()) return 'O nome da equipe é obrigatório';
          }
        });

        if (!nome) return;

        // Passo 2: selecionar funcionários disponíveis (checkboxes)
        if (!this.board[0] || this.board[0].funcionarios.length === 0) {
          Swal.fire('Atenção', 'Não há funcionários disponíveis para adicionar', 'warning');
          return;
        }

        const htmlCheckboxes = this.board[0].funcionarios
          .map(f => `
            <div style="margin-bottom: 6px;">
              <input type="checkbox" id="func-${this.escapeId(f.email)}" value="${this.escapeHtml(f.email)}">
              <label for="func-${this.escapeId(f.email)}">${this.escapeHtml(f.nome)} (${this.escapeHtml(f.funcao || '—')})</label>
            </div>
          `).join('');

        const { value: funcionariosSelecionados } = await Swal.fire({
          title: 'Selecione os funcionários',
          html: `<div style="text-align:left; max-height:220px; overflow-y:auto;">${htmlCheckboxes}</div>`,
          showCancelButton: true,
          confirmButtonText: 'Criar Equipe',
          cancelButtonText: 'Cancelar',
          preConfirm: () => {
            const checked = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
              .map(cb => cb.value); // valores são emails (strings)
            if (checked.length === 0) {
              Swal.showValidationMessage('Selecione pelo menos 1 funcionário');
              return false;
            }
            return checked;
          }
        });

        if (!funcionariosSelecionados || funcionariosSelecionados.length === 0) return;

        const payload = {
          nome,
          descricao: '',
          funcionarios: funcionariosSelecionados 
        };

        const token = this.store.pegar_token;
        const res = await api.post('/funcionario/grupo', payload, { headers: { Authorization: token } });
        const novaEquipe = res.data;

        const funcs = (novaEquipe.usuarios || []).map(u => {
          const usuarioObj = u.usuario || u;
          const email = usuarioObj?.email || u.usuarioEmail || u.email || String(usuarioObj?.id || '');
          return {
            id: email,
            email,
            nome: usuarioObj?.nome || email,
            funcao: usuarioObj?.funcoes || usuarioObj?.funcao || '—'
          }
        });

        this.board.push({
          id: novaEquipe.id,
          nome: novaEquipe.nome,
          funcionarios: funcs
        });

        this.board[0].funcionarios = this.board[0].funcionarios
          .filter(f => !funcionariosSelecionados.includes(f.email));
        Swal.fire('Sucesso', 'Equipe criada com sucesso', 'success');
        this.carregarDados();

      } catch (err) {
        console.error('Erro criar equipe', err);
        Swal.fire('Erro', 'Não foi possível criar a equipe', 'error');
      }
    },

    escapeId(s) {
      return String(s || '').replace(/[^a-zA-Z0-9-_:.]/g, '_');
    },
    escapeHtml(s) {
      return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    async onMoveFuncionario(event, colunaDestino) {
      try {
        const token = this.store.pegar_token;

        if (event && event.added) {
          const funcionario = event.added.element;
          const email = this.extractEmail(funcionario) || funcionario.email || funcionario.id;
          const novaEquipeId = colunaDestino.id === 'disponiveis' ? null : colunaDestino.id;

          if (!email) {
            console.warn('Não foi possível extrair email do elemento:', funcionario);
            return;
          }

          const res = await api.post('/funcionarios/mover', {
            email,
            novaEquipeId
          }, { headers: { Authorization: token } });
          if(res.status === 200){
            Swal.fire({
              toast: true,               // ativa estilo de notificação
              position: 'top-end',       // canto superior direito
              icon: 'success',           // 'success', 'error', 'warning', 'info', 'question'
              title: 'Profissional movido de equipe',
              showConfirmButton: false,  // sem botão de confirmação
              timer: 5000,               // desaparece sozinho em 3s
              timerProgressBar: true,    // barra de tempo
            });
          }
      
        }
      } catch (err) {
        console.error('Erro mover funcionário', err);
        Swal.fire('Erro', 'Não foi possível salvar a movimentação', 'error');
       
      }
    }
  }
}
</script>

<style scoped>
h2{
  color: var(--verde-escuro);
}
.botao{
  color: white;
  margin: 0px;
  background-color: var(--verde-escuro);

}
.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
  width: 100%;
}

.kanban-container {
  padding: 10px;
}

.kanban-header {
  margin-bottom: 20px;
}
.kanban-board {
  display: flex;
  flex-wrap: wrap;       
  gap: 20px;
  padding-bottom: 15px;
}

.kanban-column {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 12px;
  min-width: 280px;
  max-width: 350px;
  flex: 1;               
  max-height: 450px;     
  overflow-y: auto;      
  display: flex;
  flex-direction: column;
}

.kanban-column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  color: var(--verde-escuro);
}

.kanban-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 200px;
}

.kanban-card {
  background: #ffffff;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s;
}
/* foto do funcionário */
.kanban-foto {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}
.kanban-card:hover {
  transform: scale(1.02);
}
@media (max-width: 768px) {
  .modal-container.registro {
    padding: 10px 0;
  }

  .content-wrapper {
    padding-left: 0px;
    z-index: 0;
  }
  .kanban-column {
    max-width: 380px;
  }
}
@media (min-width: 768px) and (max-width: 1024px) {

  .content-wrapper {
    padding-left: 0px;
  }
  .kanban-board{
    justify-content: space-evenly;
  }
}
</style>
