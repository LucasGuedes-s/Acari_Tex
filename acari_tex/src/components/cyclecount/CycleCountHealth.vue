<template>
  <div class="cc-health">
    <div class="cc-health-header">
      <h4 class="cc-health-titulo">Saúde da estação</h4>
      <button class="cc-btn-verificar" :disabled="verificando" @click="verificar">
        <span v-if="verificando" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
        {{ verificando ? 'Verificando...' : 'Verificar conexão' }}
      </button>
    </div>

    <p v-if="erro" class="cc-health-erro">{{ erro }}</p>

    <div v-else-if="health" class="cc-health-grid">
      <div class="cc-health-item">
        <span class="cc-health-label">Sessão aberta</span>
        <span class="cc-health-valor" :class="health.sessaoAberta ? 'cc-sim' : 'cc-nao'">
          {{ health.sessaoAberta ? 'SIM' : 'NÃO' }}
        </span>
      </div>
      <div class="cc-health-item">
        <span class="cc-health-label">Eventos na última hora</span>
        <span class="cc-health-valor">{{ health.eventosUltimaHora }}</span>
      </div>
      <div class="cc-health-item">
        <span class="cc-health-label">Última verificação</span>
        <span class="cc-health-valor cc-hora">{{ health.ultimaVerificacao }}</span>
      </div>
    </div>

    <p v-else class="cc-health-vazio">
      Clique em "Verificar conexão" para consultar o status da estação.
    </p>
  </div>
</template>

<script>
import { buscarHealthEstacao } from '@/services/cycleCountService';

export default {
  name: 'CycleCountHealth',

  props: {
    stationId: { type: String, required: true },
    token: { type: String, required: true },
  },

  data() {
    return {
      verificando: false,
      erro: '',
      health: null,
    };
  },

  methods: {
    async verificar() {
      this.verificando = true;
      this.erro = '';
      try {
        const { data } = await buscarHealthEstacao(this.stationId, this.token);
        this.health = {
          sessaoAberta: Boolean(
            data.sessao_aberta
            ?? data.session_open
            ?? data.has_active_session
            ?? (data.active_session || data.session)
          ),
          eventosUltimaHora: data.eventos_ultima_hora
            ?? data.events_last_hour
            ?? data.events_last_60min
            ?? 0,
          ultimaVerificacao: new Date().toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
          }),
        };
        this.$emit('verificado', this.health);
      } catch (err) {
        console.error('Erro ao consultar health da estação:', err);
        this.erro = 'Não foi possível consultar o status da estação agora.';
      } finally {
        this.verificando = false;
      }
    },
  },
};
</script>

<style scoped>
.cc-health {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px 16px;
}

.cc-health-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.cc-health-titulo {
  font-size: 15px;
  font-weight: 700;
  color: #14532d;
  margin: 0;
}

.cc-btn-verificar {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #14532d;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.cc-btn-verificar:hover:not(:disabled) {
  background: #06642a;
}

.cc-btn-verificar:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cc-health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.cc-health-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cc-health-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9ca3af;
  font-weight: 600;
}

.cc-health-valor {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.cc-hora {
  font-size: 13px;
  font-weight: 500;
}

.cc-sim {
  color: #0a8a38;
}

.cc-nao {
  color: #b91c1c;
}

.cc-health-erro {
  color: #b91c1c;
  font-size: 13px;
  margin: 0;
}

.cc-health-vazio {
  color: #6b7280;
  font-size: 13px;
  margin: 0;
}
</style>
