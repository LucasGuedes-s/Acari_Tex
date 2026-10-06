<template>
  <div class="modal-overlay" @click.self="$emit('fechar')">
    <div class="modal-content">
      <h2 class="modal-title">Nova sessão CycleCount</h2>
      <p class="modal-descricao">
        Configure a estação que será monitorada pela visão computacional.
      </p>

      <div class="modal-body">
        <label class="modal-label">Estação*</label>
        <select v-model="form.station_id" class="modal-input" :disabled="enviando">
          <option disabled value="">Selecione a estação</option>
          <option v-for="estacao in estacoes" :key="estacao.valor" :value="estacao.valor">
            {{ estacao.label }}
          </option>
        </select>

        <label class="modal-label">Funcionário*</label>
        <input
          v-model="buscaFuncionario"
          type="text"
          class="modal-input modal-busca"
          placeholder="Pesquisar funcionário..."
          :disabled="enviando"
        />
        <select v-model="form.operator_id" class="modal-input" :disabled="enviando">
          <option disabled value="">Selecione o funcionário</option>
          <option v-for="f in funcionariosFiltrados" :key="f.email" :value="f.email">
            {{ f.nome }} ({{ f.email }})
          </option>
        </select>
        <small v-if="!carregandoDados && funcionariosFiltrados.length === 0" class="modal-aviso">
          Nenhum funcionário encontrado.
        </small>

        <label class="modal-label">OP*</label>
        <input
          v-model="buscaOp"
          type="text"
          class="modal-input modal-busca"
          placeholder="Pesquisar OP..."
          :disabled="enviando"
        />
        <select v-model="form.op_id" class="modal-input" :disabled="enviando">
          <option disabled value="">Selecione a OP</option>
          <option v-for="op in opsFiltradas" :key="op.id_da_op" :value="op.id_da_op">
            OP {{ op.id_da_op }}{{ op.descricao ? ` — ${op.descricao}` : '' }}
          </option>
        </select>

        <label class="modal-label">Operação / Etapa*</label>
        <select v-model="form.operation" class="modal-input" :disabled="enviando">
          <option disabled value="">Selecione a operação</option>
          <option v-for="etapa in etapasDaOp" :key="etapa" :value="etapa">
            {{ etapa }}
          </option>
        </select>
        <small v-if="form.op_id && etapasDaOp.length === 0" class="modal-aviso">
          Nenhuma etapa vinculada a esta OP.
        </small>
      </div>

      <div class="modal-footer">
        <button class="btn-cancelar" :disabled="enviando" @click="$emit('fechar')">Cancelar</button>
        <button class="btn-salvar" :disabled="enviando || !formularioValido" @click="criar">
          {{ enviando ? 'Criando sessão...' : 'Criar sessão' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import Swal from 'sweetalert2';
import {
  criarSessao,
  mensagemErroCycleCount,
} from '@/services/cycleCountService';

export default {
  name: 'CycleCountSessionModal',

  props: {
    funcionarios: { type: Array, default: () => [] },
    ops: { type: Array, default: () => [] },
    etapasEstabelecimento: { type: Array, default: () => [] },
    token: { type: String, required: true },
  },

  emits: ['fechar', 'criada'],

  data() {
    return {
      form: {
        station_id: '',
        operator_id: '',
        op_id: '',
        operation: '',
      },
      buscaFuncionario: '',
      buscaOp: '',
      enviando: false,
    };
  },

  computed: {
    // Estações fixas por número de máquinas da fábrica (sem API de estações no projeto).
    // Pode ser trocado por lista vinda do back-end quando existir.
    estacoes() {
      const total = this.ops.length || this.funcionarios.length || 10;
      const limite = Math.min(Math.max(total, 1), 20);
      return Array.from({ length: limite }, (_, i) => {
        const valor = `station-${String(i + 1).padStart(2, '0')}`;
        return { valor, label: valor };
      });
    },

    funcionariosFiltrados() {
      const termo = this.buscaFuncionario.trim().toLowerCase();
      if (!termo) return this.funcionarios;
      return this.funcionarios.filter(
        (f) => (f.nome || '').toLowerCase().includes(termo)
          || (f.email || '').toLowerCase().includes(termo)
      );
    },

    opsFiltradas() {
      const termo = this.buscaOp.trim().toLowerCase();
      if (!termo) return this.ops;
      return this.ops.filter(
        (op) => String(op.id_da_op).includes(termo)
          || (op.descricao || '').toLowerCase().includes(termo)
      );
    },

    // Operações são as etapas cadastradas no estabelecimento;
    // o back-end valida a relação OP x etapa.
    etapasDaOp() {
      return (this.etapasEstabelecimento || [])
        .map((e) => e.descricao || e.nome || e.etapa)
        .filter(Boolean);
    },

    formularioValido() {
      return (
        this.form.station_id !== ''
        && this.form.operator_id !== ''
        && this.form.op_id !== ''
        && Number.isInteger(Number(this.form.op_id))
        && this.form.operation !== ''
      );
    },
  },

  methods: {
    validar() {
      if (!this.form.station_id) {
        Swal.fire('Atenção', 'Selecione a estação.', 'warning');
        return false;
      }
      if (!this.form.operator_id) {
        Swal.fire('Atenção', 'Selecione o funcionário.', 'warning');
        return false;
      }
      if (this.form.op_id === '' || !Number.isInteger(Number(this.form.op_id))) {
        Swal.fire('Atenção', 'Selecione uma OP válida.', 'warning');
        return false;
      }
      if (!this.form.operation) {
        Swal.fire('Atenção', 'Selecione a operação/etapa.', 'warning');
        return false;
      }
      return true;
    },

    async criar() {
      if (!this.validar() || this.enviando) return;

      this.enviando = true;
      try {
        // op_id precisa ser numérico; operator_id é o e-mail do funcionário.
        await criarSessao(
          {
            station_id: this.form.station_id,
            operator_id: this.form.operator_id,
            op_id: Number(this.form.op_id),
            operation: this.form.operation,
          },
          this.token
        );

        Swal.fire({
          icon: 'success',
          title: 'Sessão criada com sucesso.',
          text: 'A estação já pode iniciar o monitoramento.',
          confirmButtonColor: '#0e6632',
        });

        this.$emit('criada', { ...this.form });
        this.resetForm();
      } catch (err) {
        console.error('Erro ao criar sessão CycleCount:', err);
        Swal.fire({
          icon: 'error',
          title: 'Erro ao criar sessão',
          text: mensagemErroCycleCount(err),
          confirmButtonColor: '#0e6632',
        });
      } finally {
        this.enviando = false;
      }
    },

    resetForm() {
      this.form = { station_id: '', operator_id: '', op_id: '', operation: '' };
      this.buscaFuncionario = '';
      this.buscaOp = '';
    },
  },
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  z-index: 2000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: #ffffff;
  width: 480px;
  max-width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 26px 28px;
  border-radius: 14px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
  border: 1px solid #ececec;
  animation: fadeInModal 0.25s ease-out;
}

.modal-title {
  font-size: 22px;
  margin-bottom: 6px;
  font-weight: 700;
  color: #0a8a38;
  text-align: left;
}

.modal-descricao {
  font-size: 14px;
  color: #666;
  margin-bottom: 16px;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.modal-label {
  font-weight: 600;
  font-size: 14px;
  color: #444;
  text-align: left;
  margin-top: 10px;
}

.modal-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d6d6d6;
  border-radius: 10px;
  font-size: 15px;
  background: #fdfdfd;
}

.modal-input:focus {
  border-color: #0a8a38;
  box-shadow: 0 0 0 3px rgba(10, 138, 56, 0.15);
  outline: none;
  background: white;
}

.modal-busca {
  margin-bottom: 6px;
  padding: 7px 12px;
  font-size: 13px;
  color: #555;
}

.modal-aviso {
  color: #b45309;
  font-size: 12px;
  margin-top: 4px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 22px;
  gap: 12px;
}

.btn-cancelar,
.btn-salvar {
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease-out;
}

.btn-cancelar {
  background: #e4e4e4;
  color: #333;
}

.btn-cancelar:hover:not(:disabled) {
  background: #cacaca;
}

.btn-salvar {
  background: #0a8a38;
  color: white;
}

.btn-salvar:hover:not(:disabled) {
  background: #086c2c;
}

.btn-salvar:disabled,
.btn-cancelar:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@keyframes fadeInModal {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
