<template>
  <div>
    <SidebarNav style="z-index: 1" />
    <carregandoTela v-if="carregando" />

    <main v-else class="content-wrapper flex-grow-1">
      <div class="container-fluid my-4 mt-md-4 mt-3">
        <header class="pagina-header">
          <div><h1 class="titulo">Comercial</h1></div>
          <div class="header-acoes">
            <button class="btn-principal btn-add-estabelecimento" @click="abrirCadastro">+</button>
            <span class="texto-oculto">Novo lead</span>
          </div>
        </header>

        <section class="indicadores">
          <div class="indicador-card">
            <div class="indicador-icone verde">🏢</div>
            <div><span>Total de leads</span><strong>{{ leads.length }}</strong></div>
          </div>
          <div class="indicador-card">
            <div class="indicador-icone azul">📞</div>
            <div><span>Em negociação</span><strong>{{ leadsEmNegociacao }}</strong></div>
          </div>
          <div class="indicador-card">
            <div class="indicador-icone amarelo">🤝</div>
            <div><span>Clientes</span><strong>{{ totalClientes }}</strong></div>
          </div>
        </section>

        <section class="lista-section">
          <div class="lista-header">
            <div><h2>Empresas em contato</h2></div>
            <span class="contador">{{ leadsFiltrados.length }} resultado(s)</span>
          </div>

          <div class="filtros">
            <div class="campo-pesquisa">
              <span>⌕</span>
              <input v-model="pesquisa" type="text" placeholder="Pesquisar por empresa, CNPJ ou contato..." />
            </div>
            <select v-model="filtroStatus">
              <option value="">Todos os status</option>
              <option v-for="status in statusDisponiveis" :key="status.valor" :value="status.valor">{{ status.label }}</option>
            </select>
            <button class="btn-limpar" @click="limparFiltros">Limpar filtros</button>
          </div>

          <div v-if="carregandoLista" class="estado-vazio">Carregando leads...</div>
          <div v-else-if="erroLista" class="mensagem-erro">
            {{ erroLista }}
            <button @click="carregarLeads">Tentar novamente</button>
          </div>
          <div v-else-if="leadsFiltrados.length" class="tabela-container">
            <table>
              <thead><tr>
                <th>Empresa</th><th>CNPJ</th><th>Contato</th><th>E-mail</th><th>Status</th>
              </tr></thead>
              <tbody>
                <tr v-for="lead in leadsFiltrados" :key="lead.id">
                  <td>
                    <div class="empresa-info">
                      <div class="empresa-avatar">{{ lead.nome?.charAt(0)?.toUpperCase() || 'L' }}</div>
                      <div><strong>{{ lead.nome }}</strong><small>{{ lead.telefone || 'Telefone não informado' }}</small></div>
                    </div>
                  </td>
                  <td>{{ lead.cnpj || 'Não informado' }}</td>
                  <td>{{ lead.contato_nome || lead.nome_contato || 'Não informado' }}</td>
                  <td>{{ lead.contato_email || lead.email_contato || lead.email || 'Não informado' }}</td>
                  <td>
                    <select class="status-select" :class="`status-${normalizarStatus(lead.status)}`"
                      :value="normalizarStatus(lead.status)" :disabled="atualizandoStatus === lead.id"
                      @change="alterarStatus(lead, $event.target.value)">
                      <option v-for="status in statusDisponiveis" :key="status.valor" :value="status.valor">{{ status.label }}</option>
                    </select>
                    <small v-if="atualizandoStatus === lead.id" class="status-atualizando">Atualizando...</small>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="estado-vazio">
            <span>🏢</span><h3>Nenhum lead encontrado</h3>
            <p>Cadastre uma empresa para acompanhar o contato com o Linha Tex.</p>
            <button class="btn-principal" @click="abrirCadastro">Adicionar lead</button>
          </div>
        </section>
      </div>
    </main>

    <div v-if="modalLead" class="admin-modal-overlay" @click.self="fecharModal">
      <form class="admin-modal" @submit.prevent="salvarLead">
        <h2>Novo lead</h2>
        <p class="admin-modal-sub">Cadastre uma empresa que está em contato ou tem interesse em utilizar o Linha Tex.</p>

        <h3>Dados da empresa</h3>
        <div class="grade">
          <label class="rotulo">Nome da empresa *
            <input v-model.trim="formLead.nome" class="campo" maxlength="120" required />
          </label>
          <label class="rotulo">CNPJ
            <input v-model="formLead.cnpj" class="campo" maxlength="18" placeholder="00.000.000/0000-00" @input="formLead.cnpj = mascararCnpj(formLead.cnpj)" />
          </label>
          <label class="rotulo">Telefone da empresa
            <input v-model.trim="formLead.telefone" class="campo" maxlength="30" />
          </label>
          <label class="rotulo">Endereço
            <input v-model.trim="formLead.endereco" class="campo" maxlength="255" />
          </label>
        </div>

        <h3>Contato responsável</h3>
        <div class="grade">
          <label class="rotulo">Nome do contato *
            <input v-model.trim="formLead.contato_nome" class="campo" maxlength="120" required />
          </label>
          <label class="rotulo">E-mail do contato *
            <input v-model.trim="formLead.contato_email" class="campo" type="email" maxlength="191" required />
          </label>
          <label class="rotulo">Telefone do contato
            <input v-model.trim="formLead.contato_telefone" class="campo" maxlength="30" />
          </label>
        </div>

        <label class="rotulo">Status inicial
          <select v-model="formLead.status" class="campo">
            <option v-for="status in statusDisponiveis" :key="status.valor" :value="status.valor">{{ status.label }}</option>
          </select>
        </label>
        <p v-if="erroForm" class="aviso aviso-erro">{{ erroForm }}</p>
        <div class="admin-modal-acoes">
          <button type="button" class="btn btn-sec" :disabled="salvando" @click="fecharModal">Cancelar</button>
          <button type="submit" class="btn btn-pri" :disabled="salvando">{{ salvando ? 'Salvando...' : 'Adicionar lead' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import SidebarNav from '@/components/Sidebar.vue';
import { useAuthStore } from '@/store/store';
import api from '@/Axios';
import carregandoTela from '@/components/carregandoTela.vue';

const STATUS_LEAD = [
  { valor: 'nao_contatado', label: 'Não contatado' },
  { valor: 'em_contato', label: 'Em contato' },
  { valor: 'qualificado', label: 'Qualificado' },
  { valor: 'contrato_em_andamento', label: 'Contrato em andamento' },
  { valor: 'cliente', label: 'Cliente' },
];

export default {
  name: 'ComercialView',
  components: { SidebarNav, carregandoTela },
  data() {
    return {
      usuario: null,
      leads: [],
      pesquisa: '',
      filtroStatus: '',
      carregando: false,
      carregandoLista: false,
      salvando: false,
      atualizandoStatus: null,
      erroLista: '',
      erroForm: '',
      modalLead: false,
      statusDisponiveis: STATUS_LEAD,
      formLead: { nome: '', cnpj: '', telefone: '', endereco: '', contato_nome: '',
        contato_email: '', contato_telefone: '', status: 'nao_contatado' },
    };
  },
  computed: {
    leadsFiltrados() {
      const termo = this.pesquisa.toLocaleLowerCase().trim();
      return this.leads.filter((lead) => {
        const texto = [lead.nome, lead.cnpj, lead.contato_nome, lead.nome_contato,
          lead.contato_email, lead.email_contato, lead.email]
          .filter(Boolean).join(' ').toLocaleLowerCase();
        return (!termo || texto.includes(termo)) &&
          (!this.filtroStatus || this.normalizarStatus(lead.status) === this.filtroStatus);
      });
    },
    leadsEmNegociacao() {
      return this.leads.filter(l => !['nao_contatado', 'cliente'].includes(this.normalizarStatus(l.status))).length;
    },
    totalClientes() {
      return this.leads.filter(l => this.normalizarStatus(l.status) === 'cliente').length;
    },
  },
  mounted() {
    const authStore = useAuthStore();
    this.usuario = authStore.pegar_usuario;
    if (!authStore.pegar_token) {
      this.erroLista = 'Sua sessão expirou. Entre novamente para continuar.';
      return;
    }
    this.carregarLeads();
  },
  methods: {
    novoFormLead() {
      return { nome: '', cnpj: '', telefone: '', endereco: '', contato_nome: '',
        contato_email: '', contato_telefone: '', status: 'nao_contatado' };
    },
    headersAuth() {
      const token = useAuthStore().pegar_token;
      return token ? { Authorization: token } : {};
    },
    normalizarStatus(status) {
      const normalizado = String(status || 'nao_contatado').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s-]+/g, '_');
      const aliases = { 'nao_contatado': 'nao_contatado', 'em_contato': 'em_contato',
        'qualificado': 'qualificado', 'contrato_em_andamento': 'contrato_em_andamento',
        'cliente': 'cliente' };
      return aliases[normalizado] || 'nao_contatado';
    },
    async carregarLeads() {
      this.carregandoLista = true;
      this.erroLista = '';
      try {
        const response = await api.get('/comercial/leads', { headers: this.headersAuth() });
        this.leads = Array.isArray(response.data) ? response.data : (response.data.leads || []);
      } catch (error) {
        console.error('Erro ao buscar leads:', error);
        this.erroLista = error.response?.data?.message || 'Não foi possível carregar os leads.';
      } finally {
        this.carregandoLista = false;
      }
    },
    abrirCadastro() {
      this.erroForm = '';
      this.formLead = this.novoFormLead();
      this.modalLead = true;
    },
    fecharModal() {
      this.modalLead = false;
      this.erroForm = '';
    },
    async salvarLead() {
      this.salvando = true;
      this.erroForm = '';
      try {
        await api.post('/comercial/leads', this.formLead, { headers: this.headersAuth() });
        this.fecharModal();
        await this.carregarLeads();
      } catch (error) {
        console.error('Erro ao cadastrar lead:', error);
        this.erroForm = error.response?.data?.message || 'Não foi possível cadastrar o lead.';
      } finally {
        this.salvando = false;
      }
    },
    async alterarStatus(lead, novoStatus) {
      const statusAnterior = this.normalizarStatus(lead.status);
      if (novoStatus === statusAnterior) return;
      this.atualizandoStatus = lead.id;
      try {
        // A API deve atualizar o status e, ao receber "cliente", converter o lead
        // em estabelecimento e criar o usuário administrador em uma única transação.
        await api.patch(`/comercial/leads/${lead.id}/status`, { status: novoStatus },
          { headers: this.headersAuth() });
        await this.carregarLeads();
      } catch (error) {
        console.error('Erro ao atualizar status do lead:', error);
        window.alert(error.response?.data?.message || 'Não foi possível atualizar o status.');
      } finally {
        this.atualizandoStatus = null;
      }
    },
    limparFiltros() {
      this.pesquisa = '';
      this.filtroStatus = '';
    },
    mascararCnpj(valor) {
      const numeros = String(valor || '').replace(/\D/g, '').slice(0, 14);
      return numeros.replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    },
  },
};
</script>

<style scoped>
.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
  width: 100%;
  min-height: 100vh;
}

@media (max-width: 768px) {
  .content-wrapper {
    padding-left: 0;
  }
}

@media (min-width: 768px) and (max-width: 1024px) {
  .content-wrapper {
    padding-left: 0;
  }
}

.pagina-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 15px;
}

.titulo {
  color: #0d3927;
  font-size: 32px;
  font-weight: 700;
  margin: 0 10;
}

.header-acoes {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  position: relative;
}

button {
  cursor: pointer;
  font-family: inherit;
  transition: 0.2s;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-principal,
.btn-secundario {
  padding: 11px 17px;
  border-radius: 25px;
  font-weight: 600;
  border: none;
}

.btn-principal {
  background: #145a32;
  color: white;
}

.btn-principal:hover {
  background: #0d3927;
}

.texto-oculto {
  display: none;
  z-index: 2000;
  position: absolute;
  bottom: -15%; 
  right: -30%;
  transform: translateX(-50%);
  background: white;
  border-radius: 10px;
  padding: 5px 10px;
}

.btn-add-estabelecimento:hover + .texto-oculto{
  display: block;
}

.btn-secundario {
  background: white;
  color: #145a32;
  border: 1px solid #dce5df;
}

.admin-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 22px;
  box-shadow: 0 2px 8px #00000008;
}

.admin-info div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.admin-info span {
  color: #777;
  font-size: 13px;
}

.admin-badge {
  background: #e6f3e9;
  color: #145a32 !important;
  padding: 7px 12px;
  border-radius: 20px;
  font-weight: 600;
}

.indicadores {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-bottom: 25px;
}

.indicador-card {
  background: white;
  padding: 22px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 3px 12px #00000008;
}

.indicador-card div:last-child {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.indicador-card span {
  color: #777;
  font-size: 13px;
}

.indicador-card strong {
  color: #173d2c;
  font-size: 25px;
}

.indicador-icone {
  width: 45px;
  height: 45px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 21px;
}

.verde { background: #e3f4e8; }
.azul { background: #e5efff; }
.amarelo { background: #fff4d9; }
.roxo { background: #f0e8ff; }

.lista-section {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 3px 12px #00000008;
}

.lista-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;
}

.lista-header h2 {
  color: #173d2c;
  font-size: 20px;
  margin: 0 0 6px;
}

.lista-header p {
  color: #888;
  font-size: 13px;
  margin: 0;
}

.contador {
  background: #edf5ef;
  color: #145a32;
  padding: 7px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.filtros {
  display: flex;
  gap: 12px;
  margin-bottom: 22px;
  flex-wrap: wrap;
}

.campo-pesquisa {
  flex: 1;
  min-width: 220px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #ddd;
  border-radius: 9px;
  padding: 0 12px;
}

.campo-pesquisa span {
  font-size: 22px;
  color: #777;
}

.campo-pesquisa input {
  border: none;
  outline: none;
  width: 100%;
  padding: 12px 0;
}

.filtros select {
  border: 1px solid #ddd;
  border-radius: 9px;
  padding: 11px;
  color: #555;
  background: white;
}

.btn-limpar {
  background: transparent;
  color: #145a32;
  border: none;
  font-weight: 600;
}

.tabela-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 850px;
}

th {
  background: #f7f9f7;
  color: #777;
  text-align: left;
  font-size: 12px;
  padding: 15px 12px;
  font-weight: 600;
}

td {
  padding: 16px 12px;
  border-bottom: 1px solid #eee;
  font-size: 13px;
}

.empresa-info {
  display: flex;
  align-items: center;
  gap: 11px;
}

.empresa-info > div:last-child {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.empresa-info strong {
  color: #173d2c;
}

.empresa-info small {
  color: #999;
}

.empresa-avatar {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  background: #e4f2e8;
  color: #145a32;
  border-radius: 10px;
  font-weight: 700;
}

.eficiencia-info {
  min-width: 100px;
}

.eficiencia-info strong {
  display: block;
  margin-bottom: 6px;
}

.barra-fundo {
  height: 6px;
  background: #e9eee9;
  border-radius: 10px;
  overflow: hidden;
}

.barra-progresso {
  height: 100%;
  background: #26965b;
  border-radius: 10px;
}

.sem-dados {
  color: #999;
}

.acoes-tabela {
  display: flex;
  align-items: center;
  gap: 10px;
}

.acao-detalhes,
.acao-funcionario {
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.acao-detalhes {
  color: #145a32;
}

.acao-funcionario {
  color: #4774a8;
}

.estado-vazio {
  text-align: center;
  padding: 45px 20px;
  color: #888;
}

.estado-vazio > span {
  font-size: 35px;
}

.estado-vazio h3 {
  color: #173d2c;
}

.estado-vazio button {
  margin-top: 12px;
}

.mensagem-erro {
  padding: 25px;
  color: #b3261e;
  text-align: center;
}

.mensagem-erro button {
  display: block;
  margin: 12px auto;
}

.conexao {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-radius: 12px;
  padding: 17px 20px;
  margin-top: 22px;
}

.conexao p {
  font-size: 12px;
  margin: 5px 0 0;
}

.status-conexao.ok {
  color: #218348;
}

.status-conexao.erro {
  color: #b3261e;
}

.admin-overlay {
  position: fixed !important;
  inset: 0 !important;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  box-sizing: border-box;
  overflow-y: auto;
}

/* Modais */

.admin-modal-overlay {
  position: fixed;
  top: 0;
  left: 200px;
  right: 0;
  bottom: 0;
  z-index: 9999;

  background: rgba(0, 0, 0, 0.55);

  display: flex;
  justify-content: center;
  align-items: center;

  padding: 20px;
  overflow-y: auto;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .admin-modal-overlay {
    left: 0;
  }
}

.admin-modal {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-sizing: border-box;
  background: #fff;
  padding: 30px;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  color: #26372e;
  margin: auto;
  flex-shrink: 0;
}

/* Títulos centralizados */

.admin-modal h2 {
  width: 100%;
  margin: 0;
  color: #145a32;
  font-size: 22px;
  font-weight: 700;
  text-align: center;
}

.admin-modal h3 {
  width: 100%;
  margin: 12px 0 2px;
  padding-bottom: 9px;
  border-bottom: 1px solid #e8eee9;
  color: #145a32;
  font-size: 15px;
  text-align: left;
}

.admin-modal-sub {
  margin: 0 0 10px;
  color: #888;
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
}

/* Campos e labels alinhados à esquerda */

.admin-modal .rotulo {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 7px;
  margin: 0;
  color: #444;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
}

.admin-modal .campo,
.admin-modal input,
.admin-modal select {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid #dce5df;
  border-radius: 8px;
  background: #fff;
  color: #333;
  font-family: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.admin-modal .campo:focus,
.admin-modal input:focus,
.admin-modal select:focus {
  border-color: #145a32;
  box-shadow: 0 0 0 3px rgba(20, 90, 50, 0.08);
}

/* Organização dos campos */

.admin-modal .grade {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  width: 100%;
}

.admin-modal .linha-senha {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  width: 100%;
}

.admin-modal .flex-1 {
  flex: 1;
  min-width: 0;
}

/* Cabeçalho do modal de detalhes */

.admin-modal-header {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 35px;
  text-align: center;
}

.admin-modal-header h2 {
  color: #145a32;
  font-size: 21px;
  margin: 0;
  text-align: center;
}

.admin-modal-header p {
  color: #888;
  font-size: 12px;
  margin: 7px 0 0;
}

.fechar {
  position: absolute;
  right: 0;
  top: -8px;
  border: none;
  background: transparent;
  font-size: 28px;
  color: #777;
}

/* Detalhes */

.detalhes-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.detalhes-grid div {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  overflow-wrap: anywhere;
}

.detalhes-grid span {
  color: #888;
  font-size: 12px;
}

.detalhes-grid strong {
  color: #173d2c;
  font-size: 14px;
}

/* Credenciais */

.admin-modal-peq {
  max-width: 460px;
}

.credenciais {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #f5f8f5;
  border: 1px solid #e5ece6;
  border-radius: 10px;
  overflow-wrap: anywhere;
}

.credenciais .sub {
  color: #888;
  font-size: 12px;
}

/* Botões */

.admin-modal-acoes {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #edf0ed;
}

.btn-cancelar {
  padding: 11px 17px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 9px;
  color: #666;
  font-weight: 600;
}

.admin-modal-acoes .btn {
  padding: 11px 17px;
  border-radius: 9px;
  font-weight: 600;
}

/* Responsividade */

@media (max-width: 650px) {
  .admin-modal {
    padding: 22px 18px;
    max-height: 92vh;
  }

  .admin-modal .grade {
    grid-template-columns: 1fr;
  }

  .admin-modal .linha-senha {
    flex-direction: column;
    align-items: stretch;
  }

  .admin-modal .linha-senha button {
    width: 100%;
  }

  .admin-modal-acoes {
    flex-direction: column-reverse;
  }

  .admin-modal-acoes button {
    width: 100%;
  }

  .detalhes-grid {
    grid-template-columns: 1fr;
  }
}


.status-select {
  min-width: 165px;
  max-width: 210px;
  padding: 8px 10px;
  border: 1px solid #dce5df;
  border-radius: 8px;
  background: #fff;
  color: #173d2c;
  font: inherit;
  font-weight: 600;
}
.status-select:disabled { opacity: .65; cursor: wait; }
.status-nao_contatado { background: #f2f3f4; color: #626b73; }
.status-em_contato { background: #e8f1ff; color: #285b91; }
.status-qualificado { background: #f1eaff; color: #6941a5; }
.status-contrato_em_andamento { background: #fff3d9; color: #946200; }
.status-cliente { background: #e3f4e8; color: #145a32; }
.status-atualizando { display: block; margin-top: 4px; color: #777; }
@media (max-width: 650px) {
  .indicadores { grid-template-columns: 1fr; }
  .status-select { min-width: 150px; }
}
</style>
