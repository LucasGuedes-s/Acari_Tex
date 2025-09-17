<template>
  <section class="landing-root">
    <!-- Botões topo -->
    <div class="top-actions">
      <button class="btn-outline">Cadastre-se</button>
      <button class="btn-solid" @click="Login()">Entre</button>
    </div>

    <!-- Onda só aparece no desktop -->
    <div class="wave-top desktop-only" aria-hidden="true">
      <svg viewBox="0 0 1440 200" preserveAspectRatio="none">
        <path
          fill="url(#gradiente)"
          d="M0,160L48,154.7C96,149,192,139,288,154.7C384,171,480,213,576,224C672,235,768,213,864,192C960,171,1056,149,1152,154.7C1248,160,1344,192,1392,208L1440,224L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
        />
        <defs>
          <linearGradient id="gradiente" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#0d3927"/>
            <stop offset="100%" stop-color="#145a32"/>
          </linearGradient>
        </defs>
      </svg>
    </div>

    <!-- Conteúdo principal -->
    <div class="landing-inner">
      <!-- Texto -->
      <div class="content fade-in-left">
        <h1 class="headline">Gestão inteligente da sua produção têxtil</h1>
        <p class="lead">
          Controle cada etapa, otimize processos e acompanhe os resultados em tempo real.
        </p>
      </div>

      <!-- Celular -->
      <div class="phone-wrap fade-in-right">
        <img src="@/assets/celular3.png" alt="App preview no celular" />
      </div>
    </div>

    <!-- Funcionalidades -->
    <div class="features">
      <h2>Funcionalidades que fazem diferença</h2>
      <div class="features-grid">
        <div class="feature-card">
          <span class="icon">📊</span>
          <h3>Relatórios em tempo real</h3>
          <p>Acompanhe indicadores de produção e desempenho da equipe.</p>
        </div>
        <div class="feature-card">
          <span class="icon">⏱️</span>
          <h3>Controle de etapas</h3>
          <p>Registre e monitore cada fase da produção têxtil.</p>
        </div>
        <div class="feature-card">
          <span class="icon">👥</span>
          <h3>Gestão de equipes</h3>
          <p>Organize os times e calcule tempos médios de execução.</p>
        </div>
        <div class="feature-card">
          <span class="icon">🧾</span>
          <h3>Relatórios avançados</h3>
          <p>Dados completos para otimizar processos e reduzir custos.</p>
        </div>
      </div>
    </div>

    <!-- Planos -->
    <div class="plans container">
      <h2>Nossos Planos</h2>
      <div class="plans-grid">
        <div class="plan-card">
          <h3>Básico</h3>
          <p>Ideal para pequenas confecções</p>
          <span class="price">R$ 249,90/mês</span>
          <ul>
            <li>✔️ Controle de produção</li>
            <li>✔️ Gestão de equipes</li>
          </ul>
        </div>
        <div class="plan-card destaque">
          <h3>Plano anual</h3>
          <p>Para fábricas em crescimento</p>
          <span class="price">R$ 2799,9/mês</span>
          <ul>
            <li>✔️ Tudo do Básico</li>
            <li>✔️ Relatórios avançados</li>
            <li>✔️ Suporte prioritário</li>
          </ul>
        </div>
        <div class="plan-card">
          <h3>Enterprise</h3>
          <p>Grandes indústrias têxteis</p>
          <span class="price">Sob consulta</span>
          <ul>
            <li>✔️ Personalização completa</li>
            <li>✔️ Treinamento da equipe</li>
          </ul>
        </div>
      </div>
    </div>
    <Footer />
  </section>
</template>

<script>
import Footer from '@/components/Footer.vue';
export default {
  name: "LandingHome",
  components: { Footer },
  methods: {
    Login() {
      this.$router.push('/login');
    }
  }
};
</script>

<style scoped>
:root {
  --verde-escuro: #0d3927;
  --verde-claro: #145a32;
  --bg: #f6f7f6;
  --card: #ffffff;
}

.landing-root {
  background: var(--bg);
  min-height: 100vh;
  overflow: hidden;
  position: relative;
}
.top-actions {
  position: absolute;
  top: 15px;
  right: 20px;
  display: flex;
  gap: 12px;
  z-index: 10;
}
.top-actions .btn-outline,
.top-actions .btn-solid {
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  transition: all 0.3s ease;
}
.btn-outline {
  background: transparent;
  border: 2px solid white;
  color: white;
}
.btn-outline:hover {
  background: rgba(255, 255, 255, 0.1);
}
.btn-solid {
  background: white;
  color: var(--verde-escuro);
}
.btn-solid:hover {
  background: #f0f0f0;
}

@media (max-width: 768px) {
  .top-actions {
    display: flex;
    margin-right: 40px;
    justify-content: flex-end;
    position: static; /* não mais absoluto */
    margin-bottom: 20px; 
    margin-top: 10px;
  }
  .btn-outline,
  .btn-solid {
    border: 2px solid var(--verde-claro);
    color: white;
    background: var(--verde-claro);
  }
  .btn-solid {
    background: var(--verde-claro);
    color: white;
  }
}

/* Onda só aparece no desktop */
.wave-top svg {
  width: 100%;
  height: 120px;
}
.desktop-only {
  display: block;
}
@media (max-width: 768px) {
  .desktop-only {
    display: none;
  }
}

.landing-inner {
  position: relative;
  margin-top: -120px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 60px;
  padding: 0 20px;
  flex-wrap: wrap;
  z-index: 2;
}

/* Texto */
.content {
  max-width: 500px;
}
.headline {
  font-size: 2.8rem;
  font-weight: 800;
  color: var(--verde-escuro);
  margin-bottom: 15px;
}
.lead {
  font-size: 1.25rem;
  color: #444;
  margin-bottom: 15px;
}

/* Celular */
.phone-wrap {
  position: relative;
  width: 600px;
  max-width: 100%;
  filter: drop-shadow(0 20px 30px rgba(0, 0, 0, 0.25));
}
.phone-wrap img {
  width: 100%;
  display: block;
}

/* Animações */
.fade-in-left {
  animation: fadeInLeft 1s ease forwards;
}
.fade-in-right {
  animation: fadeInRight 1s ease forwards;
}
@keyframes fadeInLeft {
  from { opacity: 0; transform: translateX(-60px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes fadeInRight {
  from { opacity: 0; transform: translateX(60px); }
  to { opacity: 1; transform: translateX(0); }
}

/* Funcionalidades */
.features {
  background: var(--verde-claro);
  color: #fff;
  padding: 60px 20px;
  text-align: center;
}
.features h2 {
  font-size: 2rem;
  margin-bottom: 40px;
}
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 30px;
}
.feature-card {
  background: white;
  color:#0d3927;
  border-radius: 12px;
  padding: 20px;
}
.icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 10px;
}

/* Planos */
.plans {
  padding: 60px 20px;
  text-align: center;
}
.plans h2 {
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 30px;
  color: var(--verde-escuro);
}
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
}
.plan-card {
  background: var(--card);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  text-align: center;
  transition: transform 0.2s;
}
.plan-card:hover {
  transform: translateY(-5px);
}
.plan-card h3 {
  margin: 0 0 10px;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--verde-claro);
}
.plan-card .price {
  display: block;
  font-size: 1.4rem;
  font-weight: 800;
  margin: 10px 0;
  color: var(--verde-escuro);
}
.plan-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
  color: #444;
  font-size: 0.95rem;
}
.plan-card ul li {
  margin: 6px 0;
}
.plan-card.destaque {
  border: 2px solid var(--verde-escuro);
  transform: scale(1.05);
}

/* Mobile ajustes */
@media (max-width: 768px) {
  .landing-inner {
    flex-direction: column;
    margin-top: 20px;
    text-align: center;
    gap: 20px;
  }
  .headline {
    font-size: 2rem;
  }
  .phone-wrap {
    width: 300px;
    margin: 0 auto;
  }
}
</style>
