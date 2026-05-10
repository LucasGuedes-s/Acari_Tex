<template>
  <div class="page-root">
    <SidebarNav />
    <carregandoTela v-if="loading" />

    <main v-else class="content-wrapper">
      <div class="page-body">

        <!-- ── Top Section ── -->
        <div class="top-section">
          <div>
            <h1 class="page-title">Ajustes do Estabelecimento</h1>
            <p class="page-desc">Gerencie informações, aparência e preferências da sua fábrica</p>
          </div>
        </div>

        <!-- ── Sections ── -->
        <div class="config-sections">

          <!-- ══ SEÇÃO 1: Informações Básicas ══ -->
          <section class="config-section">
            <div class="section-header">
              <div class="section-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><text x="12" y="16" text-anchor="middle" font-size="8" fill="currentColor">i</text></svg>
              </div>
              <div>
                <h3 class="section-title">Informações Básicas</h3>
                <p class="section-desc">Dados principais do seu estabelecimento</p>
              </div>
            </div>

            <div class="section-content">
              <div class="form-grid form-grid--2col">
                <div class="form-field">
                  <label>Nome do Estabelecimento</label>
                  <div class="input-wrap">
                    <svg class="input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    <input v-model="config.nome" type="text" placeholder="Ex: Acari Têxtil" />
                  </div>
                </div>

                <div class="form-field">
                  <label>CNPJ</label>
                  <div class="input-wrap">
                    <svg class="input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="8" x2="22" y2="8"/></svg>
                    <input v-model="config.cnpj" type="text" placeholder="00.000.000/0000-00" />
                  </div>
                </div>

                <div class="form-field form-field--fullwidth">
                  <label>Endereço</label>
                  <div class="input-wrap">
                    <svg class="input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <input v-model="config.endereco" type="text" placeholder="Rua, número, bairro, cidade" />
                  </div>
                </div>

                <div class="form-field">
                  <label>Telefone</label>
                  <div class="input-wrap">
                    <svg class="input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
                    <input v-model="config.telefone" type="text" placeholder="(84) 99999-9999" />
                  </div>
                </div>

                <div class="form-field">
                  <label>Peça Final/Produto</label>
                  <div class="input-wrap">
                    <svg class="input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6-6 6 6M3 12h18M3 12l1 8a2 2 0 002 2h12a2 2 0 002-2l1-8"/></svg>
                    <input v-model="config.peca_final" type="text" placeholder="Ex: Camiseta, Calça, etc." />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ══ SEÇÃO 2: Configurações de Produção ══ -->
          <section class="config-section">
            <div class="section-header">
              <div class="section-icon section-icon--production">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
              </div>
              <div>
                <h3 class="section-title">Produção</h3>
                <p class="section-desc">Parâmetros de funcionamento e produção</p>
              </div>
            </div>

            <div class="section-content">
              <div class="form-grid form-grid--2col">
                <div class="form-field">
                  <label>Tempo de Produção Diário (minutos)</label>
                  <div class="input-wrap">
                    <svg class="input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <input v-model.number="config.tempo_de_producao" type="number" min="60" max="1440" step="30" />
                  </div>
                  <small class="input-hint">Tempo disponível em minutos (padrão: 480 = 8 horas)</small>
                </div>

                <div class="form-field">
                  <label>Horas de Trabalho por Dia</label>
                  <div class="input-wrap">
                    <svg class="input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <input v-model.number="config.horas_trabalho" type="number" min="1" max="24" placeholder="8" />
                  </div>
                  <small class="input-hint">Carga horária padrão da empresa</small>
                </div>
              </div>

              <div class="info-box">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <div>
                  <strong>Dica:</strong> O tempo de produção é usado para calcular a capacidade de produção diária. Se sua empresa trabalha 8 horas, defina 480 minutos.
                </div>
              </div>
            </div>
          </section>

          <!-- ══ SEÇÃO 3: Logo e Identidade ══ -->
          <section class="config-section">
            <div class="section-header">
              <div class="section-icon section-icon--branding">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </div>
              <div>
                <h3 class="section-title">Identidade Visual</h3>
                <p class="section-desc">Logo e branding do estabelecimento</p>
              </div>
            </div>

            <div class="section-content">
              <div class="logo-upload">
                <div class="logo-preview" v-if="config.logo">
                  <img :src="config.logo" :alt="config.nome" />
                  <button class="logo-remove" @click="removerLogo" title="Remover logo">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div v-else class="logo-placeholder">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <p>Clique para fazer upload da logo</p>
                </div>
                <input type="file" @change="handleLogoUpload" accept="image/*" style="display: none;" ref="logoInput" />
                <button class="btn-upload" @click="$refs.logoInput.click()">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Fazer upload
                </button>
              </div>
              <small class="input-hint">Formatos: PNG, JPG (máx. 2MB)</small>
            </div>
          </section>

          <!-- ══ SEÇÃO 4: Preferências ══ -->
          <section class="config-section">
            <div class="section-header">
              <div class="section-icon section-icon--preferences">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24"/></svg>
              </div>
              <div>
                <h3 class="section-title">Preferências</h3>
                <p class="section-desc">Personalize a experiência e comportamento do sistema</p>
              </div>
            </div>

            <div class="section-content">
              <div class="toggle-group">
                <div class="toggle-item">
                  <div class="toggle-info">
                    <h4 class="toggle-title">Notificações</h4>
                    <p class="toggle-desc">Receba alertas sobre marcos importantes de produção</p>
                  </div>
                  <div class="toggle-switch">
                    <input type="checkbox" v-model="config.notificacoes" :id="'notif-toggle'" />
                    <label :for="'notif-toggle'" class="switch-label"></label>
                  </div>
                </div>

                <div class="toggle-item">
                  <div class="toggle-info">
                    <h4 class="toggle-title">Relatórios Automáticos</h4>
                    <p class="toggle-desc">Envie relatórios de produção automaticamente</p>
                  </div>
                  <div class="toggle-switch">
                    <input type="checkbox" v-model="config.relatorio_auto" :id="'relatorio-toggle'" />
                    <label :for="'relatorio-toggle'" class="switch-label"></label>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>

        <!-- ── Action Buttons ── -->
        <div class="actions-bar">
          <button class="btn-action btn-action--secondary" @click="resetarConfiguracoes">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 010-18 9.75 9.75 0 016.74 2.74L9 7"/><path d="M21 12a9 9 0 010 18 9.75 9.75 0 01-6.74-2.74L15 17"/></svg>
            Restaurar Padrão
          </button>
          <button class="btn-action btn-action--primary" @click="salvarConfiguracoes">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Salvar Alterações
          </button>
        </div>

      </div>
    </main>
  </div>
</template>

<script>
import SidebarNav from '@/components/Sidebar.vue'
import carregandoTela from '@/components/carregandoTela.vue'
import { useAuthStore } from '@/store/store'
import api from '@/Axios'
import router from '@/router'
import Swal from 'sweetalert2'

export default {
  name: 'ConfiguracoesTela',
  components: { SidebarNav, carregandoTela },

  setup() {
    const store = useAuthStore()
    return { store }
  },

  data() {
    return {
      loading: true,
      config: {
        nome: '',
        cnpj: '',
        endereco: '',
        telefone: '',
        peca_final: '',
        tempo_de_producao: 480, // 8 horas em minutos
        logo: '',
        horas_trabalho: 8,
        notificacoes: true,
        relatorio_auto: false,
      },
      configPadrao: {
        nome: '',
        cnpj: '',
        endereco: '',
        telefone: '',
        peca_final: '',
        tempo_de_producao: 480,
        logo: '',
        horas_trabalho: 8,
        notificacoes: true,
        relatorio_auto: false,
      },
    }
  },

  async mounted() {
    this.verificarAutenticacao()
    await this.carregarConfiguracoes()
  },

  methods: {
    verificarAutenticacao() {
      const token = this.store.pegar_token
      const usuario = this.store.pegar_usuario
      if (!token || !usuario) router.push('/')
    },

    async carregarConfiguracoes() {
      try {
        const token = this.store.pegar_token
        const { data } = await api.get('/empresa', {
          headers: { Authorization: token },
        })

        if (data.resultado) {
          this.config = {
            ...this.config,
            ...data.resultado,
          }
          this.configPadrao = { ...this.config }
        }
      } catch (err) {
        console.error('Erro ao carregar configurações:', err)
        Swal.fire({
          icon: 'error',
          title: 'Erro',
          text: 'Não foi possível carregar as configurações.',
        })
      } finally {
        this.loading = false
      }
    },

    handleLogoUpload(event) {
      const file = event.target.files[0]
      if (file) {
        if (file.size > 2097152) { // 2MB
          Swal.fire('Erro', 'A logo deve ter no máximo 2MB.', 'error')
          return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
          this.config.logo = e.target.result
        }
        reader.readAsDataURL(file)
      }
    },

    removerLogo() {
      this.config.logo = ''
    },

    async salvarConfiguracoes() {
      if (!this.config.nome) {
        Swal.fire('Atenção', 'O nome do estabelecimento é obrigatório.', 'warning')
        return
      }

      try {
        const token = this.store.pegar_token
        const response = await api.put('/empresa', this.config, {
          headers: { Authorization: token },
        })

        console.log('Resposta da API:', response)
        this.configPadrao = { ...this.config }
        Swal.fire({
          icon: 'success',
          title: 'Salvo!',
          text: 'Configurações atualizadas com sucesso.',
          timer: 1500,
          showConfirmButton: false,
        })
      } catch (err) {
        console.error('Erro ao salvar configurações:', err)
        Swal.fire({
          icon: 'error',
          title: 'Erro',
          text: 'Não foi possível salvar as configurações.',
        })
      }
    },

    resetarConfiguracoes() {
      Swal.fire({
        title: 'Restaurar padrões?',
        text: 'Esta ação reverterá todas as alterações não salvas.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, restaurar',
        cancelButtonText: 'Cancelar',
      }).then((result) => {
        if (result.isConfirmed) {
          this.config = { ...this.configPadrao }
          Swal.fire({
            icon: 'success',
            title: 'Restaurado!',
            text: 'Configurações restauradas.',
            timer: 1200,
            showConfirmButton: false,
          })
        }
      })
    },
  },
}
</script>

<style scoped>

/* ── Root ── */
.page-root {
  min-height: 100vh;
}

.content-wrapper {
  flex: 1;
  padding-left: 220px;
  min-height: 100vh;
}

.page-body {
  padding: 2.5rem 2rem 3rem;
}

/* ── Top Section ── */
.top-section {
  margin-bottom: 2.5rem;
}

.page-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #a8d8b8;
  color: #0a3d20;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 5px 14px;
  border-radius: 100px;
  margin-bottom: 8px;
}

.page-title {
  font-family: "Syne", sans-serif;
  text-align: left;
  font-size: 32px;
  font-weight: 700;
  color: #052e14;
  margin: 0 0 4px;
  line-height: 1.1;
}

.page-desc {
  font-size: 14px;
  text-align: left;
  color: #7aaa8c;
  margin: 0;
}

/* ── Config Sections ── */
.config-sections {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  margin-bottom: 2rem;
}

.config-section {
  background: #fff;
  border: 1px solid rgba(10, 80, 40, 0.1);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(10, 80, 40, 0.06);
  transition: transform 0.2s, box-shadow 0.2s;
}

.config-section:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(10, 80, 40, 0.1);
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 1.5rem;
  border-bottom: 1px solid #eef6f1;
  background: linear-gradient(135deg, #f9fcfa, #f0faf4);
}

.section-icon {
  width: 48px;
  height: 48px;
  background: #d0edda;
  border: 1px solid rgba(14, 102, 50, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0e6632;
  flex-shrink: 0;
}

.section-icon--production {
  background: #cfe2ff;
  border-color: rgba(29, 78, 216, 0.2);
  color: #1d4ed8;
}

.section-icon--branding {
  background: #ffe8cc;
  border-color: rgba(255, 193, 7, 0.2);
  color: #f39c12;
}

.section-icon--preferences {
  background: #f3e5f5;
  border-color: rgba(109, 40, 217, 0.2);
  color: #7c3aed;
}

.section-title {
  text-align: left;
  font-size: 16px;
  font-weight: 700;
  color: #052e14;
  margin: 0;
}

.section-desc {
  font-size: 12px;
  color: #7aaa8c;
  margin: 2px 0 0;
}

.section-content {
  padding: 1.5rem;
}

/* ── Forms ── */
.form-grid {
  display: grid;
  gap: 1.25rem;
}

.form-grid--2col {
  grid-template-columns: 1fr 1fr;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field--fullwidth {
  grid-column: 1 / -1;
}

.form-field label {
  font-size: 12px;
  font-weight: 600;
  color: #2d6644;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  color: #1a8a46;
  pointer-events: none;
  flex-shrink: 0;
}

.input-wrap input,
.input-wrap textarea {
  width: 100%;
  height: 44px;
  padding: 0 14px 0 38px;
  background: #eef6f1;
  border: 1.5px solid rgba(10, 80, 40, 0.18);
  border-radius: 10px;
  font-family: "DM Sans", sans-serif;
  font-size: 13px;
  color: #0f1f16;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}

.input-wrap input:focus,
.input-wrap textarea:focus {
  border-color: #1a8a46;
  box-shadow: 0 0 0 3px rgba(26, 138, 70, 0.12);
  background: #fff;
}

.input-wrap input::placeholder,
.input-wrap textarea::placeholder {
  color: #90bb9e;
}

.input-hint {
  font-size: 11px;
  color: #7aaa8c;
  margin-top: 4px;
}

.info-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: #f0faf4;
  border: 1px solid #d0edda;
  border-left: 4px solid #0e6632;
  border-radius: 10px;
  margin-top: 1rem;
}

.info-box svg {
  color: #0e6632;
  flex-shrink: 0;
  margin-top: 2px;
}

.info-box div {
  font-size: 12px;
  color: #0a3d20;
}

.info-box strong {
  color: #052e14;
}

/* ── Logo Upload ── */
.logo-upload {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.logo-preview,
.logo-placeholder {
  position: relative;
  width: 100%;
  height: 180px;
  background: #f5f7f6;
  border: 2px dashed rgba(14, 102, 50, 0.3);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.logo-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.logo-remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #dc3545;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}
.logo-remove:hover {
  background: #fff;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}

.logo-placeholder {
  cursor: pointer;
  border-color: rgba(14, 102, 50, 0.2);
  transition: border-color 0.2s, background 0.2s;
}
.logo-placeholder:hover {
  background: #eef6f1;
  border-color: #1a8a46;
}

.logo-placeholder svg {
  color: #7aaa8c;
}

.logo-placeholder p {
  font-size: 13px;
  color: #4a7a5c;
  margin: 0;
  text-align: center;
}

.btn-upload {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 8px 16px;
  background: #0e6632;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-family: "DM Sans", sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-upload:hover {
  background: #0a4d26;
  transform: translateY(-1px);
}

/* ── Toggle Switch ── */
.toggle-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.toggle-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 14px;
  background: #f9fcfa;
  border: 1px solid rgba(10, 80, 40, 0.1);
  border-radius: 12px;
  transition: background 0.2s;
}
.toggle-item:hover {
  background: #f0faf4;
}

.toggle-info {
  flex: 1;
  min-width: 0;
}

.toggle-title {
  font-family: "Syne", sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #052e14;
  margin: 0;
}

.toggle-desc {
  font-size: 12px;
  color: #7aaa8c;
  margin: 2px 0 0;
}

.toggle-switch {
  position: relative;
  width: 48px;
  height: 28px;
  flex-shrink: 0;
}

.toggle-switch input {
  display: none;
}

.switch-label {
  position: absolute;
  inset: 0;
  background: #d0edda;
  border: 1.5px solid rgba(14, 102, 50, 0.2);
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.3s;
}

.switch-label::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  transition: left 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle-switch input:checked + .switch-label {
  background: #0e6632;
  border-color: #0e6632;
}

.toggle-switch input:checked + .switch-label::after {
  left: 24px;
}

/* ── Action Buttons ── */
.actions-bar {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  font-family: "DM Sans", sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action--primary {
  background: #0e6632;
  color: #fff;
  box-shadow: 0 4px 12px rgba(14, 102, 50, 0.3);
}
.btn-action--primary:hover {
  background: #0a4d26;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(14, 102, 50, 0.4);
}

.btn-action--secondary {
  background: transparent;
  color: #4a7a5c;
  border: 1.5px solid rgba(14, 102, 50, 0.3);
}
.btn-action--secondary:hover {
  background: #eef6f1;
  border-color: #0e6632;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .content-wrapper {
    padding-left: 0;
  }

  .page-body {
    padding: 1.5rem 1rem;
  }

  .page-title {
    font-size: 24px;
        
  }

  .form-grid--2col {
    grid-template-columns: 1fr;
  }

  .toggle-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .toggle-switch {
    align-self: flex-start;
  }

  .actions-bar {
    justify-content: stretch;
  }

  .btn-action {
    flex: 1;
    justify-content: center;
  }
}
</style>