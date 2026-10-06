<template>
  <div class="cc-eventos">
    <div class="cc-eventos-header">
      <h4 class="cc-eventos-titulo">Eventos recebidos</h4>
      <span v-if="!carregando" class="cc-eventos-contagem">
        {{ eventos.length }} evento(s)
      </span>
    </div>

    <div v-if="carregando" class="cc-eventos-loading">
      <div class="spinner-border text-success" role="status">
        <span class="visually-hidden">Carregando...</span>
      </div>
    </div>

    <p v-else-if="erro" class="cc-eventos-erro">{{ erro }}</p>

    <div v-else-if="eventos.length === 0" class="cc-eventos-vazio">
      Nenhum evento recebido ainda para esta sessão.
    </div>

    <div v-else class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>Data/Hora</th>
            <th>Tipo</th>
            <th>Estado</th>
            <th>Ciclo</th>
            <th>Confiança</th>
            <th>Produção</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="evento in eventos" :key="evento.id || evento.timestamp">
            <td>{{ formatarHora(evento.timestamp) }}</td>
            <td>{{ evento.type }}</td>
            <td>
              <span class="cc-badge-estado" :class="classeEstado(evento.state)">
                {{ evento.state }}
              </span>
            </td>
            <td>{{ evento.cycle ?? '-' }}</td>
            <td>{{ evento.confidence !== null ? `${evento.confidence}%` : '-' }}</td>
            <td>
              <span v-if="gerouProducao(evento)" class="cc-producao">+{{ quantidadeProducao(evento) }} peça(s)</span>
              <span v-else class="cc-sem-producao">Não gerou produção</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { listarEventos, normalizarEvento, extrairLista } from '@/services/cycleCountService';

export default {
  name: 'CycleCountEvents',

  props: {
    sessionId: { type: String, required: true },
    token: { type: String, required: true },
    limit: { type: Number, default: 50 },
  },

  data() {
    return {
      eventos: [],
      carregando: false,
      erro: '',
    };
  },

  methods: {
    async carregar() {
      this.carregando = true;
      this.erro = '';
      try {
        const { data } = await listarEventos(
          { session_id: this.sessionId, limit: this.limit },
          this.token
        );
        this.eventos = extrairLista(data, 'events', 'eventos', 'data', 'items')
          .map(normalizarEvento);
      } catch (err) {
        console.error('Erro ao carregar eventos CycleCount:', err);
        this.eventos = [];
        this.erro = 'Não foi possível carregar os eventos agora.';
      } finally {
        this.carregando = false;
      }
    },

    // Regra do back-end: produção só existe quando o evento traz
    // production associado. O front apenas exibe, sem recriar a regra.
    gerouProducao(evento) {
      return Boolean(evento.production);
    },

    quantidadeProducao(evento) {
      return evento.production?.quantidade_pecas ?? 1;
    },

    formatarHora(timestamp) {
      if (!timestamp) return '-';
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return String(timestamp);
      return d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    },

    classeEstado(state) {
      if (state === 'CONFIRMED') return 'cc-estado-confirmado';
      if (state === 'DETECTED') return 'cc-estado-detectado';
      return 'cc-estado-outro';
    },
  },

  mounted() {
    this.carregar();
  },
};
</script>

<style scoped>
.cc-eventos {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px 16px;
}

.cc-eventos-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.cc-eventos-titulo {
  font-size: 15px;
  font-weight: 700;
  color: #14532d;
  margin: 0;
}

.cc-eventos-contagem {
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
}

.cc-eventos-loading {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

.cc-eventos-vazio,
.cc-eventos-erro {
  color: #6b7280;
  font-size: 13px;
  margin: 0;
}

.cc-eventos-erro {
  color: #b91c1c;
}

.table {
  font-size: 13px;
}

.table th {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9ca3af;
  font-weight: 700;
  border-bottom: 1px solid #e5e7eb;
}

.table td {
  color: #374151;
}

.cc-badge-estado {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
}

.cc-estado-confirmado {
  background: #dcfce7;
  color: #166534;
}

.cc-estado-detectado {
  background: #fef9c3;
  color: #854d0e;
}

.cc-estado-outro {
  background: #f1f5f9;
  color: #475569;
}

.cc-producao {
  color: #0a8a38;
  font-weight: 700;
}

.cc-sem-producao {
  color: #9ca3af;
  font-size: 12px;
}
</style>
