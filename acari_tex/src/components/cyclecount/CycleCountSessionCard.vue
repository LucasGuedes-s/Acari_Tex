<template>
  <div class="cc-card" :class="{ 'cc-card-ativa': sessao.ativa }">
    <div class="cc-card-header">
      <span class="cc-estacao">{{ sessao.station_id }}</span>
      <span class="cc-badge" :class="sessao.ativa ? 'cc-badge-ativa' : 'cc-badge-encerrada'">
        <span class="cc-dot"></span>
        {{ sessao.ativa ? 'Ativa' : 'Encerrada' }}
      </span>
    </div>

    <div class="cc-card-body">
      <div class="cc-info">
        <span class="cc-info-label">Funcionário</span>
        <span class="cc-info-valor">{{ nomeFuncionario || sessao.operator_id }}</span>
      </div>
      <div class="cc-info">
        <span class="cc-info-label">OP</span>
        <span class="cc-info-valor">#{{ sessao.op_id ?? '-' }}</span>
      </div>
      <div class="cc-info">
        <span class="cc-info-label">Operação</span>
        <span class="cc-info-valor">{{ sessao.operation || '-' }}</span>
      </div>
      <div class="cc-info">
        <span class="cc-info-label">Início</span>
        <span class="cc-info-valor">{{ formatarDataHora(sessao.started_at) }}</span>
      </div>
      <div v-if="sessao.event_count !== null" class="cc-info">
        <span class="cc-info-label">Eventos</span>
        <span class="cc-info-valor">{{ sessao.event_count }}</span>
      </div>
    </div>

    <div class="cc-card-footer" v-if="mostrarAcoes">
      <button class="cc-btn cc-btn-secundario" @click="$emit('ver-detalhes', sessao)">
        Ver detalhes
      </button>
      <button v-if="sessao.ativa" class="cc-btn cc-btn-perigo" @click="$emit('encerrar', sessao)">
        Encerrar sessão
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CycleCountSessionCard',

  props: {
    sessao: { type: Object, required: true },
    nomeFuncionario: { type: String, default: '' },
    mostrarAcoes: { type: Boolean, default: true },
  },

  emits: ['ver-detalhes', 'encerrar'],

  methods: {
    formatarDataHora(data) {
      if (!data) return '-';
      const d = new Date(data);
      if (isNaN(d.getTime())) return String(data);
      return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    },
  },
};
</script>

<style scoped>
.cc-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 16px 18px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
}

.cc-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.cc-card-ativa {
  border-left: 4px solid #0a8a38;
}

.cc-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 8px;
}

.cc-estacao {
  font-weight: 700;
  font-size: 15px;
  color: #14532d;
  text-transform: uppercase;
}

.cc-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

.cc-badge-ativa {
  background: #dcfce7;
  color: #166534;
}

.cc-badge-encerrada {
  background: #f3f4f6;
  color: #6b7280;
}

.cc-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.cc-badge-ativa .cc-dot {
  animation: pulsar 1.6s infinite ease-in-out;
}

@keyframes pulsar {
  0% { opacity: 1; }
  50% { opacity: 0.35; }
  100% { opacity: 1; }
}

.cc-card-body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px 16px;
  margin-bottom: 6px;
}

.cc-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.cc-info-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9ca3af;
  font-weight: 600;
}

.cc-info-valor {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cc-card-footer {
  display: flex;
  gap: 10px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
  flex-wrap: wrap;
}

.cc-btn {
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.cc-btn-secundario {
  background: #f1f5f9;
  color: #334155;
}

.cc-btn-secundario:hover {
  background: #e2e8f0;
}

.cc-btn-perigo {
  background: #b32d00;
  color: #fff;
}

.cc-btn-perigo:hover {
  background: #7a1f00;
}
</style>
