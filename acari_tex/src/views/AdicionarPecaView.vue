<template>
  <Sidebar />
  <div class="container">
    <h2>Cadastro de Nova Peça</h2>
    
    <div v-if="etapa === 1" class="step-container">
      <h3>1. Informações Básicas</h3>
      <div class="form-group">
        <label>Descrição:</label>
        <input v-model="novaPeca.descricao" type="text" class="form-control" required />
      </div>
      <div class="form-group">
        <label>Quantidade de Peças:</label>
        <input v-model.number="novaPeca.quantidade_pecas" type="number" class="form-control" required />
      </div>
      <div class="form-group">
        <label>Pedido por:</label>
        <select v-model="novaPeca.pedido_por" class="form-control">
          <option v-for="fornecedor in fornecedoresRecentes" :key="fornecedor">{{ fornecedor }}</option>
        </select>
      </div>
      <button @click="proximaEtapa" class="btn btn-primary">Próximo</button>
    </div>
    
    <div v-if="etapa === 2" class="step-container">
      <h3>2. Processo de Produção</h3>
      <div class="predefinidos">
        <h4>Locais Pré-definidos</h4>
        <button v-for="local in locaisPredefinidos" :key="local" @click="adicionarLocalPredefinido(local)" class="btn-predefinido">
          {{ local }}
        </button>
      </div>
      <div class="drag-container">
        <div class="draggable-box" v-for="(local, index) in novaPeca.producao" :key="index" draggable="true" @dragstart="onDragStart(index)" @dragover.prevent="onDragOver(index)" @drop="onDrop(index)">
          {{ local }}
          <button @click="removerLocal(index)" class="btn-remove">×</button>
        </div>
      </div>
      <button @click="proximaEtapa" class="btn btn-primary">Próximo</button>
      <button @click="etapa--" class="btn btn-secondary">Voltar</button>
    </div>
    
    <div v-if="etapa === 3" class="step-container">
      <h3>3. Revisão e Cadastro</h3>
      <p><strong>Descrição:</strong> {{ novaPeca.descricao }}</p>
      <p><strong>Quantidade:</strong> {{ novaPeca.quantidade_pecas }}</p>
      <p><strong>Pedido por:</strong> {{ novaPeca.pedido_por }}</p>
      <p><strong>Processo de Produção:</strong> {{ novaPeca.producao.join(' → ') }}</p>
      
      <button @click="adicionarPeca" class="btn btn-success">Cadastrar Peça</button>
      <button @click="etapa--" class="btn btn-secondary">Voltar</button>
    </div>
  </div>
</template>

<script>
import Sidebar from '@/components/Sidebar.vue';

export default {
  data() {
    return {
      etapa: 1,
      novaPeca: {
        descricao: "",
        quantidade_pecas: null,
        pedido_por: "",
        producao: []
      },
      fornecedoresRecentes: ["Fornecedor A", "Fornecedor B", "Fornecedor C"],
      locaisPredefinidos: ["Corte", "Costura", "Acabamento", "Embalagem"],
      draggedIndex: null
    };
  },
  methods: {
    proximaEtapa() {
      this.etapa++;
    },
    adicionarPeca() {
      console.log("Peça cadastrada:", this.novaPeca);
      alert("Peça cadastrada com sucesso!");
      this.etapa = 1;
      this.novaPeca = { descricao: "", quantidade_pecas: null, pedido_por: "", producao: [] };
    },
    adicionarLocalPredefinido(local) {
      if (!this.novaPeca.producao.includes(local)) {
        this.novaPeca.producao.push(local);
      }
    },
    removerLocal(index) {
      this.novaPeca.producao.splice(index, 1);
    },
    onDragStart(index) {
      this.draggedIndex = index;
    },
    onDrop(index) {
      const draggedItem = this.novaPeca.producao[this.draggedIndex];
      this.novaPeca.producao.splice(this.draggedIndex, 1);
      this.novaPeca.producao.splice(index, 0, draggedItem);
      this.draggedIndex = null;
    }
  },
  components:{
    Sidebar
  }
};
</script>

<style scoped>
.container {
  font-family: Arial, sans-serif;
  background: #ffffff;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  margin: 0 auto;
}
.step-container {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 10px;
  margin-bottom: 20px;
}
.btn-predefinido {
  background: #007bff;
  color: white;
  padding: 8px 15px;
  margin: 5px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
}
.drag-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px;
  border: 2px dashed #007bff;
  border-radius: 10px;
  background: #e3f2fd;
  justify-content: center;
}
.draggable-box {
  background: #007bff;
  color: white;
  padding: 10px;
  border-radius: 5px;
  text-align: center;
  width: 120px;
  cursor: grab;
}
.btn-remove {
  background: red;
  border: none;
  color: white;
  font-size: 16px;
  padding: 2px 6px;
  border-radius: 50%;
  cursor: pointer;
  margin-left: 5px;
}
</style>
