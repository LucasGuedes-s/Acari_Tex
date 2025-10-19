<script setup>
import { io } from "socket.io-client";
import { onMounted, reactive } from "vue";
import { useAuthStore } from "@/store/store";
import { v4 as uuidv4 } from "uuid"; // se não tiver, instale: npm i uuid
import router from "@/router";

const socket = io("https://acari-tex.onrender.com"); // ajuste se necessário

// estado local de toasts
const toasts = reactive([]);

// configurações padrão
const DEFAULT_DURATION = 40000;
const MAX_TOASTS = 6; // limite visual (opcional)

// helper para criar um toast
function pushToast({ tipo = "warning", titulo = "Notificação", mensagem = "" }) {
  // limita quantidade (remove o mais antigo se necessário)
  if (toasts.length >= MAX_TOASTS) {
    toasts.shift();
  }

  const id = uuidv4();
  const toast = {
    id,
    tipo,
    titulo,
    mensagem,
    createdAt: Date.now(),
    remaining: DEFAULT_DURATION,
    paused: false,
  };

  toasts.push(toast);

  // inicia o timer do toast
  startTimer(toast);
}

// inicia contador com pause/continue por hover
function startTimer(toast) {
  const start = Date.now();
  let lastTick = start;

  function tick() {
    if (toast.paused) {
      lastTick = Date.now();
      toast._raf = requestAnimationFrame(tick);
      return;
    }
    const now = Date.now();
    const elapsed = now - lastTick;
    toast.remaining -= elapsed;
    lastTick = now;

    if (toast.remaining <= 0) {
      // remove
      const idx = toasts.findIndex(t => t.id === toast.id);
      if (idx !== -1) toasts.splice(idx, 1);
      cancelAnimationFrame(toast._raf);
      return;
    }
    toast._raf = requestAnimationFrame(tick);
  }

  toast._raf = requestAnimationFrame(tick);
}

// fechar manual
function closeToast(id) {
  const idx = toasts.findIndex(t => t.id === id);
  if (idx !== -1) {
    // cancela raf se existir
    const t = toasts[idx];
    if (t._raf) cancelAnimationFrame(t._raf);
    toasts.splice(idx, 1);
  }
}

// map tipo -> icon HTML (pode trocar por SVG)
function iconFor(tipo) {
  switch (tipo) {
    case "success":
      return "✓";
    case "error":
      return "✕";
    case "info":
      return "ℹ";
    default:
      return "!";
  }
}

onMounted(() => {
  try{
    const cnpj = useAuthStore().usuario.cnpj;
    if (!cnpj){
      router.push('/'); 
      console.log("CNPJ do usuário não encontrado para notificações.");
    }
    socket.on(`notificacao_${cnpj}`, (dados) => {
      // dados = { tipo, mensagem, titulo? }
      pushToast({
        tipo: dados.tipo || "warning",
        titulo: dados.titulo || "Notificação",
        mensagem: dados.mensagem || "",
      });
    });
  }catch(e){
    console.error("Erro ao obter CNPJ do usuário:", e);
    router.push('/');
  }
  
});
</script>

<template>
  <!-- container fixo no topo direito -->
  <div id="toast-root" aria-live="polite" class="toast-root">
    <transition-group name="toast-list" tag="div" class="toast-list">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast-card"
        :class="`toast-${toast.tipo}`"
        @mouseenter="toast.paused = true"
        @mouseleave="toast.paused = false"
      >
        <div class="toast-left">
          <div class="toast-icon">{{ iconFor(toast.tipo) }}</div>
        </div>

        <div class="toast-body">
          <div class="toast-title">{{ toast.titulo }}</div>
          <div class="toast-message" v-html="toast.mensagem"></div>
        </div>

        <button class="toast-close" @click="closeToast(toast.id)" aria-label="Fechar">
          ×
        </button>

        <!-- barra de progresso -->
        <div
          class="toast-progress"
          :style="{ width: `${(toast.remaining / DEFAULT_DURATION) * 100}%` }"
        ></div>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-root {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none; /* deixa os toasts passarem mouse só nos elementos internos */
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast-card {
  pointer-events: auto; /* habilita interação */
  width: 360px;
  display: flex;
  align-items: flex-start;
  background: #ffffff;
  color: #222;
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.12);
  padding: 12px 12px 10px 12px;
  position: relative;
  overflow: hidden;
  border-left: 4px solid transparent;
}

.toast-left {
  margin-right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.toast-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(0,0,0,0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
}

/* body */
.toast-body {
  flex: 1;
  min-width: 0;
}
.toast-title {
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 4px;
}
.toast-message {
  font-size: 13px;
  line-height: 1.15;
  color: #444;
  word-break: break-word;
}

/* close button */
.toast-close {
  background: transparent;
  border: none;
  font-size: 18px;
  line-height: 1;
  color: #666;
  cursor: pointer;
  margin-left: 8px;
  padding: 4px;
  border-radius: 6px;
}
.toast-close:hover {
  background: rgba(0,0,0,0.04);
}

/* progress bar no fundo (fixa na base) */
.toast-progress {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 4px;
  background: linear-gradient(90deg, rgba(0,0,0,0.12), rgba(0,0,0,0.06));
  transition: width 0.1s linear;
}

/* cores por tipo */
.toast-success { border-left-color: #10b981; }
.toast-error   { border-left-color: #ef4444; }
.toast-info    { border-left-color: #3b82f6; }
.toast-warning { border-left-color: #f59e0b; }

/* entrada/saída */
.toast-list-enter-from {
  transform: translateX(120%);
  opacity: 0;
}
.toast-list-enter-active {
  transition: all .28s cubic-bezier(.2,.8,.2,1);
}
.toast-list-leave-to {
  transform: translateX(120%);
  opacity: 0;
}
.toast-list-leave-active {
  transition: all .28s cubic-bezier(.2,.8,.2,1);
}
</style>
