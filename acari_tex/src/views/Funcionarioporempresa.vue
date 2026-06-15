<template>
  <div class="page-bg">

    <!-- Hero Header -->
    <header class="page-header">
      <div class="header-glow"></div>
      <div class="header-inner">
        <div class="brand-mark">
          <div class="brand-logo">🏭</div>
          <div>
            <p class="brand-label">Portal de Cadastro</p>
            <p class="brand-cnpj" v-if="cnpj">CNPJ {{ cnpjFormatado }}</p>
          </div>
        </div>
        <div class="badge-secure">
          <span class="badge-dot"></span>
          Portal Seguro
        </div>
      </div>

      <!-- Step strip inside header -->
      <div class="steps-strip">
        <div v-for="(step, i) in steps" :key="i" class="step-item">
          <div class="step-bubble" :class="{ active: currentStep === i, done: currentStep > i }">
            <svg v-if="currentStep > i" viewBox="0 0 16 16" fill="none" class="check-icon">
              <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span v-else>{{ i + 1 }}</span>
          </div>
          <span class="step-label">{{ step }}</span>
          <div v-if="i < steps.length - 1" class="step-connector" :class="{ done: currentStep > i }"></div>
        </div>
      </div>
    </header>

    <main class="main-content">

      <!-- Intro -->
      <div class="intro-block">
        <div class="intro-eyebrow">Bem-vindo 👋</div>
        <h1 class="intro-title">Cadastre-se na equipe</h1>
        <p class="intro-sub">Preencha os dados abaixo em menos de 2 minutos e faça parte do time.</p>
      </div>

      <!-- Form card -->
      <div class="form-card">

        <!-- Topo colorido do card -->
        <div class="card-topbar">
          <span class="card-step-pill">Etapa {{ currentStep + 1 }} de {{ steps.length }}</span>
          <span class="card-step-name">{{ steps[currentStep] }}</span>
        </div>

        <!-- Step 1: Dados Pessoais -->
        <transition name="slide" mode="out-in">
          <div v-if="currentStep === 0" key="step0" class="step-body">
            <div class="step-heading">
              <div class="step-icon-circle">👤</div>
              <div>
                <h2 class="step-title">Dados Pessoais</h2>
                <p class="step-desc">Como devemos te identificar?</p>
              </div>
            </div>

            <div class="two-col">
              <div class="field-group">
                <label class="field-label" for="nome">Nome completo <span class="req">*</span></label>
                <input v-model="form.nome" id="nome" type="text" class="field-input"
                  placeholder="Seu nome completo" />
              </div>
              <div class="field-group">
                <label class="field-label" for="idade">Idade <span class="req">*</span></label>
                <input v-model.number="form.idade" id="idade" type="number" min="16" max="80"
                  class="field-input" placeholder="Ex: 28" />
              </div>
            </div>

            <div class="field-group">
              <label class="field-label" for="email">E-mail <span class="req">*</span></label>
              <input v-model="form.email" id="email" type="email" class="field-input"
                placeholder="seu@email.com" />
            </div>

            <div class="field-group">
              <label class="field-label">Foto de perfil <span class="opt">(opcional)</span></label>
              <div class="upload-zone" @click="$refs.fotoInput.click()" :class="{ filled: previewFoto }">
                <div v-if="!previewFoto" class="upload-idle">
                  <div class="upload-circle">
                    <svg viewBox="0 0 24 24" fill="none" class="upload-svg">
                      <path d="M12 16V8m0 0l-3 3m3-3l3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                      <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                  </div>
                  <p class="upload-text">Clique para enviar uma foto</p>
                  <p class="upload-hint">PNG, JPG ou WEBP · máx. 5MB</p>
                </div>
                <div v-else class="upload-filled">
                  <img :src="previewFoto" alt="Preview" class="preview-img" />
                  <div class="preview-info">
                    <p class="preview-name">Foto selecionada</p>
                    <p class="preview-change">Clique para trocar</p>
                  </div>
                </div>
              </div>
              <input ref="fotoInput" type="file" accept="image/*" class="hidden" @change="selecionarFoto" />
            </div>
          </div>
        </transition>

        <!-- Step 2: Função -->
        <transition name="slide" mode="out-in">
          <div v-if="currentStep === 1" key="step1" class="step-body">
            <div class="step-heading">
              <div class="step-icon-circle">⚙️</div>
              <div>
                <h2 class="step-title">Função na equipe</h2>
                <p class="step-desc">Qual será o seu papel no dia a dia?</p>
              </div>
            </div>

            <div class="field-group">
              <label class="field-label" for="funcao">Função principal <span class="req">*</span></label>
              <div class="select-wrap">
                <select v-model="form.funcao" id="funcao" class="field-select">
                  <option disabled value="">Selecione uma função...</option>
                  <option v-for="f in funcoesDisponiveis" :key="f" :value="f">{{ f }}</option>
                </select>
                <span class="sel-arrow">
                  <svg viewBox="0 0 12 8" fill="none"><path d="M1 1l5 5 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
                </span>
              </div>
            </div>

            <!-- Função cards visuais -->
            <div class="funcao-cards">
              <div v-for="f in funcoesDisponiveis" :key="f"
                class="funcao-card"
                :class="{ selected: form.funcao === f }"
                @click="form.funcao = f">
                <span class="funcao-icon">{{ funcoesIcons[f] }}</span>
                <span class="funcao-name">{{ f }}</span>
                <div class="funcao-check" v-if="form.funcao === f">
                  <svg viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
              </div>
            </div>

            <div class="field-group mt-16">
              <label class="field-label" for="funcoes">Outras funções <span class="opt">(opcional)</span></label>
              <input v-model="form.funcoes" id="funcoes" type="text" class="field-input"
                placeholder="Ex: Corte, Acabamento, Qualidade" />
              <p class="field-hint">Separe por vírgula se houver mais de uma.</p>
            </div>
          </div>
        </transition>

        <!-- Step 3: Revisão -->
        <transition name="slide" mode="out-in">
          <div v-if="currentStep === 2" key="step2" class="step-body">
            <div class="step-heading">
              <div class="step-icon-circle">✅</div>
              <div>
                <h2 class="step-title">Confirmar dados</h2>
                <p class="step-desc">Revise tudo antes de enviar.</p>
              </div>
            </div>

            <div class="review-card">
              <!-- Profile hero -->
              <div class="review-hero">
                <div class="review-avatar-wrap">
                  <img v-if="previewFoto" :src="previewFoto" class="review-avatar" alt="Foto" />
                  <div v-else class="review-avatar-fallback">{{ form.nome ? form.nome[0].toUpperCase() : '?' }}</div>
                  <div class="review-avatar-ring"></div>
                </div>
                <div>
                  <p class="review-name">{{ form.nome || '—' }}</p>
                  <p class="review-email">{{ form.email || '—' }}</p>
                  <span class="review-role-badge">👷 Funcionário</span>
                </div>
              </div>

              <div class="review-divider"></div>

              <div class="review-grid">
                <div class="review-item">
                  <span class="review-label">Idade</span>
                  <span class="review-value">{{ form.idade ? form.idade + ' anos' : '—' }}</span>
                </div>
                <div class="review-item">
                  <span class="review-label">Função</span>
                  <span class="review-value">{{ form.funcao || '—' }}</span>
                </div>
                <div class="review-item" v-if="form.funcoes">
                  <span class="review-label">Outras funções</span>
                  <span class="review-value">{{ form.funcoes }}</span>
                </div>
                <div class="review-item">
                  <span class="review-label">Empresa (CNPJ)</span>
                  <span class="review-value mono">{{ cnpjFormatado }}</span>
                </div>
              </div>
            </div>

            <div class="terms-note">
              <svg viewBox="0 0 16 16" fill="none" class="terms-icon"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.4"/><path d="M8 7v4M8 5.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              Ao confirmar, seus dados serão enviados ao gestor da equipe para aprovação.
            </div>
          </div>
        </transition>

        <!-- Footer navegação -->
        <div class="card-footer">
          <button v-if="currentStep > 0" @click="currentStep--" class="btn-back">
            <svg viewBox="0 0 16 16" fill="none" class="btn-icon"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Voltar
          </button>
          <div v-else></div>

          <button v-if="currentStep < steps.length - 1" @click="avancar" class="btn-next">
            Continuar
            <svg viewBox="0 0 16 16" fill="none" class="btn-icon"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button v-else @click="cadastrarFuncionario" class="btn-submit" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            <template v-else>
              Confirmar cadastro
              <svg viewBox="0 0 16 16" fill="none" class="btn-icon"><path d="M3 8l3.5 3.5L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </template>
          </button>
        </div>
      </div>

      <p class="footer-note">Dúvidas? Entre em contato com o RH da empresa.</p>
    </main>
  </div>
</template>

<script>
import api from '@/Axios'
import Swal from 'sweetalert2'

export default {
  name: 'CadastroFuncionarioPublico',
  data() {
    return {
      cnpj: '',
      currentStep: 0,
      loading: false,
      steps: ['Dados pessoais', 'Função', 'Confirmação'],
      form: {
        nome: '',
        email: '',
        idade: null,
        funcao: '',
        funcoes: '',
        permissao: 'funcionario', // fixo, não exposto ao usuário
        fotoUrl: null
      },
      previewFoto: null,
      fotoSelecionada: null,
      funcoesDisponiveis: ['Corte', 'Costura', 'Acabamento', 'Supervisor'],
      funcoesIcons: {
        'Corte': '✂️',
        'Costura': '🧵',
        'Acabamento': '🪡',
        'Supervisor': '📋'
      }
    }
  },
  computed: {
    cnpjFormatado() {
      const c = (this.cnpj || '').replace(/\D/g, '')
      if (c.length !== 14) return this.cnpj
      return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }
  },
  mounted() {
    this.cnpj = this.$route.params.cnpj || this.$route.query.cnpj || ''
    if (!this.cnpj) {
      Swal.fire({ icon: 'error', title: 'CNPJ não encontrado', text: 'Acesse o link fornecido pela empresa.', confirmButtonColor: '#16A34A' })
    }
  },
  methods: {
    selecionarFoto(event) {
      const file = event.target.files[0]
      if (!file) return
      this.fotoSelecionada = file
      this.previewFoto = URL.createObjectURL(file)
    },
    avancar() {
      if (this.currentStep === 0) {
        if (!this.form.nome || !this.form.email || !this.form.idade) {
          Swal.fire({ icon: 'warning', title: 'Campos obrigatórios', text: 'Preencha nome, e-mail e idade antes de continuar.', confirmButtonColor: '#16A34A' })
          return
        }
      }
      if (this.currentStep === 1 && !this.form.funcao) {
        Swal.fire({ icon: 'warning', title: 'Selecione uma função', text: 'Escolha a função principal antes de continuar.', confirmButtonColor: '#16A34A' })
        return
      }
      this.currentStep++
    },
    async uploadFoto() {
      if (!this.fotoSelecionada) return null
      const formData = new FormData()
      formData.append('file', this.fotoSelecionada)
      try {
        const res = await api.post('/upload/foto', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        return res.data.fileUrl
      } catch { return null }
    },
    async cadastrarFuncionario() {
      this.loading = true
      try {
        const fotoUrl = await this.uploadFoto()
        if (fotoUrl) this.form.fotoUrl = fotoUrl
        await api.post('/cadastrar/funcionario/empresa', { ...this.form, cnpj: this.cnpj })
        await Swal.fire({
          icon: 'success',
          title: 'Cadastro realizado!',
          text: 'Seus dados foram enviados. O gestor irá revisar em breve.',
          confirmButtonColor: '#16A34A',
          confirmButtonText: 'Fechar'
        })
        this.$router.push('/')
      } catch {
        Swal.fire({ icon: 'error', title: 'Erro ao cadastrar', text: 'Verifique os dados e tente novamente.', confirmButtonColor: '#16A34A' })
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<!-- Router: { path: '/cadastro/:cnpj', component: CadastroFuncionarioPublico } -->

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Paleta verde ──────────────────────────────────── */
/* --g900: #052e16  --g800: #14532d  --g700: #15803d
   --g500: #22c55e  --g400: #4ade80  --g100: #dcfce7 */

.page-bg {
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
}

/* ── Header ──────────────────────────────────────── */
.page-header {
  background: linear-gradient(135deg, #052e16 0%, #14532d 50%, #15803d 100%);
  padding: 20px 32px 0;
  position: relative;
  overflow: hidden;
}
.header-glow {
  position: absolute;
  top: -40px; right: -40px;
  width: 200px; height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(74,222,128,0.25) 0%, transparent 70%);
  pointer-events: none;
}
.header-inner {
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 20px;
}
.brand-mark { display: flex; align-items: center; gap: 14px; }
.brand-logo {
  width: 44px; height: 44px;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.4rem;
  backdrop-filter: blur(8px);
}
.brand-label { font-weight: 700; font-size: 0.95rem; color: #fff; margin-bottom: 2px; }
.brand-cnpj { font-size: 0.73rem; color: #86efac; letter-spacing: 0.06em; font-weight: 500; }
.badge-secure {
  display: flex; align-items: center; gap: 7px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  color: #bbf7d0;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 20px;
  letter-spacing: 0.03em;
}
.badge-dot {
  width: 7px; height: 7px;
  background: #4ade80;
  border-radius: 50%;
  box-shadow: 0 0 6px #4ade80;
  animation: pulse 2s infinite;
}
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }

/* ── Steps strip ──────────────────────────────────── */
.steps-strip {
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  padding: 0 0 20px;
}
.step-item { display: flex; align-items: center; gap: 8px; }
.step-bubble {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  border: 1.5px solid rgba(255,255,255,0.25);
  color: rgba(255,255,255,0.6);
  font-size: 0.78rem;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s;
}
.step-bubble.active {
  background: #4ade80;
  border-color: #4ade80;
  color: #052e16;
  box-shadow: 0 0 0 4px rgba(74,222,128,0.25);
}
.step-bubble.done {
  background: #22c55e;
  border-color: #22c55e;
  color: #052e16;
}
.check-icon { width: 14px; height: 14px; }
.step-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(255,255,255,0.45);
  white-space: nowrap;
}
.step-item:has(.step-bubble.active) .step-label { color: #bbf7d0; }
.step-item:has(.step-bubble.done) .step-label { color: #86efac; }
.step-connector {
  width: 36px; height: 2px;
  background: rgba(255,255,255,0.15);
  margin: 0 6px;
  flex-shrink: 0;
  border-radius: 2px;
  transition: background 0.4s;
}
.step-connector.done { background: #22c55e; }

/* ── Main ──────────────────────────────────────────── */
.main-content {
  max-width: 680px;
  margin: 0 auto;
  padding: 36px 20px 60px;
}

/* ── Intro ──────────────────────────────────────────── */
.intro-block { text-align: center; margin-bottom: 28px; }
.intro-eyebrow {
  display: inline-block;
  background: #dcfce7;
  color: #15803d;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 4px 14px;
  border-radius: 20px;
  margin-bottom: 12px;
  border: 1px solid #bbf7d0;
}
.intro-title {
  font-size: 2rem;
  font-weight: 800;
  color: #052e16;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}
.intro-sub { color: #4b7a5e; font-size: 0.92rem; line-height: 1.6; }

/* ── Form card ──────────────────────────────────────── */
.form-card {
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 8px 40px rgba(5,46,22,0.12), 0 2px 8px rgba(5,46,22,0.06);
  overflow: hidden;
  border: 1px solid #d1fae5;
}
.card-topbar {
  background: linear-gradient(90deg, #14532d, #15803d);
  padding: 14px 36px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.card-step-pill {
  background: rgba(255,255,255,0.15);
  color: #bbf7d0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.2);
}
.card-step-name { color: #fff; font-size: 0.88rem; font-weight: 600; }

/* ── Step body ──────────────────────────────────────── */
.step-body { padding: 32px 36px 8px; }

.step-heading { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
.step-icon-circle {
  width: 50px; height: 50px;
  background: linear-gradient(135deg, #dcfce7, #bbf7d0);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
  border: 1px solid #86efac;
}
.step-title { font-size: 1.25rem; font-weight: 700; color: #052e16; margin-bottom: 2px; }
.step-desc { font-size: 0.84rem; color: #6b9e7e; }

/* ── Fields ──────────────────────────────────────────── */
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.field-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
.mt-16 { margin-top: 4px; }
.field-label { font-size: 0.82rem; font-weight: 600; display: flex; color: #1a3a27; }
.req { color: #16a34a; }
.opt { color: #86a991; font-weight: 400; }
.field-input {
  width: 100%;
  padding: 12px 15px;
  border: 1.5px solid #d1fae5;
  border-radius: 12px;
  font-size: 0.9rem;
  font-family: 'Inter', sans-serif;
  color: #052e16;
  background: #f0fdf4;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
.field-input::placeholder { color: #a7c5b0; }
.field-input:focus {
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34,197,94,0.15);
  background: #fff;
}
.field-hint { font-size: 0.74rem; color: #86a991; margin-top: 2px; }

.select-wrap { position: relative; }
.field-select {
  width: 100%;
  padding: 12px 40px 12px 15px;
  border: 1.5px solid #d1fae5;
  border-radius: 12px;
  font-size: 0.9rem;
  font-family: 'Inter', sans-serif;
  color: #052e16;
  background: #f0fdf4;
  outline: none;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.field-select:focus {
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34,197,94,0.15);
  background: #fff;
}
.sel-arrow {
  position: absolute; right: 14px; top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #4b7a5e;
  width: 12px; height: 12px;
  display: flex; align-items: center;
}
.sel-arrow svg { width: 12px; }

/* ── Upload ──────────────────────────────────────────── */
.upload-zone {
  border: 2px dashed #86efac;
  border-radius: 16px;
  background: #f0fdf4;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
}
.upload-zone:hover { border-color: #22c55e; background: #dcfce7; }
.upload-zone.filled { border-style: solid; border-color: #22c55e; background: #fff; }
.upload-idle {
  padding: 32px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.upload-circle {
  width: 52px; height: 52px;
  background: #dcfce7;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 4px;
  border: 1.5px solid #86efac;
}
.upload-svg { width: 22px; height: 22px; color: #16a34a; }
.upload-text { font-size: 0.88rem; font-weight: 600; color: #15803d; }
.upload-hint { font-size: 0.75rem; color: #86a991; }
.upload-filled {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.preview-img { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 3px solid #22c55e; }
.preview-name { font-size: 0.88rem; font-weight: 600; color: #052e16; margin-bottom: 2px; }
.preview-change { font-size: 0.76rem; color: #16a34a; }
.hidden { display: none; }

/* ── Função cards ──────────────────────────────────── */
.funcao-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 8px;
}
.funcao-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border: 1.5px solid #d1fae5;
  border-radius: 14px;
  background: #f0fdf4;
  cursor: pointer;
  transition: all 0.18s;
  position: relative;
  user-select: none;
}
.funcao-card:hover { border-color: #22c55e; background: #dcfce7; }
.funcao-card.selected {
  border-color: #16a34a;
  background: linear-gradient(135deg, #dcfce7, #f0fdf4);
  box-shadow: 0 2px 10px rgba(22,163,74,0.15);
}
.funcao-icon { font-size: 1.4rem; }
.funcao-name { font-size: 0.88rem; font-weight: 600; color: #052e16; }
.funcao-check {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  width: 22px; height: 22px;
  background: #16a34a;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.funcao-check svg { width: 12px; height: 12px; color: #fff; }

/* ── Review ──────────────────────────────────────────── */
.review-card {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border: 1px solid #bbf7d0;
  border-radius: 18px;
  padding: 28px;
  margin-bottom: 16px;
}
.review-hero {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 24px;
}
.review-avatar-wrap { position: relative; flex-shrink: 0; }
.review-avatar {
  width: 68px; height: 68px;
  border-radius: 50%; object-fit: cover;
  border: 3px solid #22c55e;
  position: relative; z-index: 1;
}
.review-avatar-fallback {
  width: 68px; height: 68px;
  border-radius: 50%;
  background: linear-gradient(135deg, #15803d, #22c55e);
  color: #fff;
  font-size: 1.6rem;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 3px solid #22c55e;
}
.review-avatar-ring {
  position: absolute; inset: -4px;
  border-radius: 50%;
  border: 2px solid #86efac;
  z-index: 0;
  animation: ring-pulse 2.5s ease-in-out infinite;
}
@keyframes ring-pulse { 0%,100% { transform: scale(1); opacity:1; } 50% { transform: scale(1.06); opacity:0.5; } }
.review-name { font-size: 1.1rem; font-weight: 700; color: #052e16; margin-bottom: 2px; }
.review-email { font-size: 0.84rem; color: #4b7a5e; margin-bottom: 8px; }
.review-role-badge {
  display: inline-block;
  background: #fff;
  border: 1px solid #86efac;
  color: #15803d;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
}
.review-divider { height: 1px; background: #bbf7d0; margin-bottom: 20px; }
.review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.review-item { display: flex; flex-direction: column; gap: 3px; }
.review-label { font-size: 0.72rem; font-weight: 700; color: #4b7a5e; text-transform: uppercase; letter-spacing: 0.06em; }
.review-value { font-size: 0.9rem; color: #052e16; font-weight: 600; }
.review-value.mono { font-family: 'Courier New', monospace; font-size: 0.85rem; }

.terms-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.78rem;
  color: #4b7a5e;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  padding: 12px 14px;
  line-height: 1.5;
}
.terms-icon { width: 16px; height: 16px; flex-shrink: 0; margin-top: 1px; color: #16a34a; }

/* ── Card footer ──────────────────────────────────── */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 36px 28px;
  border-top: 1px solid #f0fdf4;
  margin-top: 20px;
}
.btn-back {
  display: flex; align-items: center; gap: 6px;
  background: none;
  border: 1.5px solid #d1fae5;
  color: #4b7a5e;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  padding: 10px 18px;
  border-radius: 10px;
  transition: all 0.2s;
  font-family: 'Inter', sans-serif;
}
.btn-back:hover { background: #f0fdf4; border-color: #86efac; color: #15803d; }
.btn-next, .btn-submit {
  display: flex; align-items: center; gap: 8px;
  background: linear-gradient(135deg, #15803d, #16a34a);
  color: #fff;
  border: none;
  padding: 12px 26px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Inter', sans-serif;
  box-shadow: 0 4px 16px rgba(21,128,61,0.3);
}
.btn-next:hover, .btn-submit:hover {
  background: linear-gradient(135deg, #14532d, #15803d);
  box-shadow: 0 6px 20px rgba(21,128,61,0.4);
  transform: translateY(-1px);
}
.btn-next:active, .btn-submit:active { transform: translateY(0); }
.btn-submit:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
.btn-icon { width: 15px; height: 15px; }

.spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

.footer-note { text-align: center; font-size: 0.78rem; color: #4b7a5e; margin-top: 24px; }

/* ── Slide transition ──────────────────────────────── */
.slide-enter-active, .slide-leave-active { transition: all 0.22s ease; }
.slide-enter-from { opacity: 0; transform: translateX(18px); }
.slide-leave-to { opacity: 0; transform: translateX(-18px); }

/* ── Responsive ────────────────────────────────────── */
@media (max-width: 600px) {
  .page-header { padding: 18px 20px 0; }
  .step-body { padding: 24px 20px 8px; }
  .card-topbar { padding: 12px 20px; }
  .card-footer { padding: 16px 20px 24px; }
  .two-col { grid-template-columns: 1fr; }
  .funcao-cards { grid-template-columns: 1fr 1fr; }
  .review-grid { grid-template-columns: 1fr; }
  .step-label { display: none; }
  .step-connector { width: 20px; }
  .intro-title { font-size: 1.5rem; }
  .brand-cnpj { display: none; }
}
</style>