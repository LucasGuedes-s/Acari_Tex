<template>
  <div>
    <h1>Estoque de Tecidos</h1>
    <div>
      <SidebarNav />
    </div>
    <div>
      <AdicionarEstoque @getEstoque="getEstoque" />
    </div>
    <div class="conteiner-produtos" v-for="item in estoque" :key="item.id_do_tecido">
      <div class="produtos">Tecido: {{ item.nome_do_tecido }}</div>
      <div class="produtos">Estoque: {{ item.estoque }}</div>
      <div class="produtos">Fornecedor: {{ item.fornecedor }}</div>
      <div class="button-container" @click="getTecido(item.id_do_tecido)">
        <span class="tooltip">Detalhar</span>
      </div>
    </div>
    <div v-if="showModalProduto" class="modal-background">
      <div class="modal-content">
        <img class="img-close" @click="showModalProduto = false" src="@/assets/close.png" />
        <div class="produtos-modal">
          <div class="produtos-modal">Tecido: {{ produto.nome_do_tecido }}</div>
          <div class="produtos-modal">Valor: R$ {{ produto.valor }}</div>
          <div class="produtos-modal">Fornecedor: {{ produto.fornecedor }}</div>
          <div class="produtos-modal">Estoque: {{ produto.estoque }}</div>
          <div v-if="produto.largura != null" class="produtos-modal">Largura: {{ produto.largura }} metros</div>
          <div v-if="produto.largura != null" class="produtos-modal">Peso: {{ produto.peso }} Kg</div>
          <div v-if="produto.largura != null" class="produtos-modal">Composição: {{ produto.composicao }}</div>
          <div v-if="produto.largura != null" class="produtos-modal">Notas: {{ produto.notas }}</div>
          <div class="buttons">
            <div class="button-deletar" @click="deletarProduto(produto.id_do_tecido)">
              <span class="tooltip">Deletar Tecido</span>
            </div>
            <div class="button-tecido">
              <span class="tooltip">Editar tecido</span>
            </div>
            <div class="button" @click="gerarPDFdoTecido(produto.id_do_tecido)">
              <span class="tooltip">Gerar Relatório</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import SidebarNav from '@/components/Sidebar.vue';
import AdicionarEstoque from '@/components/AdicionarTecido.vue';
import imagem from '@/assets/LogoAcariTex.png';
import Swal from 'sweetalert2'

import Axios from 'axios'
import { jsPDF } from "jspdf";
import 'jspdf-autotable';

export default {
  name: 'Dashbboard-tecidos',
  data() {
    return {
      id: null,
      estoque: null,
      produto: null,
      pdf: null,
      showModalProduto: false
    }
  },
  methods: {
    async getEstoque() {
      //this.showModalProduto = false

      Axios.get(`http://localhost:3333/Estoque`)
        .then(response => {
          console.log(response.status)
          console.log(response.data.produtos)
          this.estoque = response.data.produtos
        })
        .catch(error => {
          console.error(error);
        });
    },
    async getTecido(id_do_tecido) {
      Axios.get(`http://localhost:3333/Estoque/${id_do_tecido}`)
        .then(response => {
          console.log(response.status)
          console.log(response.data.produto)
          this.produto = response.data.produto
          this.showModalProduto = true
        })
    },
    async deletarProduto(id_do_tecido) {
      Swal.fire({
        title: 'Tem certeza?',
        text: "Você deseja mesmo excluir este item?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          // Fazer a requisição Axios aqui
          Axios.get(`http://localhost:3333/Deletar/${id_do_tecido}`)
            .then(response => {
              console.log(response.status)
              this.showModalProduto = false
              Swal.fire(
                'Excluído!',
                'O item foi excluído com sucesso.',
                'success'
              );
              this.getEstoque();
            })
        }
      })
      //console.error('Erro ao deletar o produto:', error.response.data);
    },
    async gerarPDFdoTecido(id_do_tecido) {
      Axios.get(`http://localhost:3333/Estoque/${id_do_tecido}`)
        .then(response => {
          console.log(response.data.produto)
          this.pdf = response.data.produto

          const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: 'a4'
          });
          const width = 30;
          const x = (doc.internal.pageSize.width - width) / 2;
          const y = 10;
          const height = 30;

          //image.src = '/home/gabriel/Acari_Tex/acari_tex/src/assets/LogoAcariTex.png';
          doc.addImage(imagem, 'PNG', x, y, width, height);

          //doc.addImage(imagem, "PNG", 15, 40, 180, 180);

          // Cria o título
          doc.text("Relatório do tecido", 15, 60);

          const tableData = [
            ['Nome', 'Preço', 'Fornecedor', 'Estoque', 'largura (metros)', 'peso (Kg)'], [this.pdf.nome_do_tecido, `R$: ${this.pdf.valor}`, this.pdf.fornecedor, this.pdf.estoque, this.pdf.largura, this.pdf.peso]
          ];
          doc.autoTable({
            head: tableData.slice(0, 1), // Cabeçalho
            body: tableData.slice(1), // Conteúdo do corpo
            startY: 70, // Posição inicial da tabela
          });
          const text = `
          
          Este relatório apresenta a quantidade atual de estoque do tecido ${this.pdf.nome_do_tecido} sob o código de ${this.pdf.id_do_tecido}. 


          O objetivo é fornecer uma visão geral da disponibilidade do tecido para fins de referência e
          planejamento.

          Quantidade em Estoque:
          A quantidade total de tecido composto de ${this.pdf.composicao} disponível em estoque é e ${this.pdf.estoque} unidades.

          Observações:
          Não há observações adicionais a serem relatadas neste momento`;

          const fontSize = 12

          // Centralizar verticalmente
          doc.setFontSize(fontSize);
          doc.text(text, 5, 100);

          doc.save("Relatório de estoque.pdf");
        })
    },
  },
  mounted() {
    this.getEstoque();
  },
  components: {
    SidebarNav,
    AdicionarEstoque
  }
}
</script>

<style scoped>
.conteiner-produtos {
  display: flex;
  margin-left: 15%;
  margin-right: 10%;
  background-color: #ffff;
  padding: 10px;
  text-align: center;
  border-radius: 10px;
  margin-bottom: 20px;
  flex-wrap: nowrap;
  align-content: space-between;
  justify-content: space-between;
  align-items: center;
}

.button-container {
  border-radius: 30px;
  display: flex;
  align-items: center;
  cursor: pointer;
  float: right;
  padding: 10px;
  background-color: #00692b;
  color: #fff;
}

.produtos {
  display: flex;
  width: 200px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.modal-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

/* Estilo para a div de conteúdo do modal */
.modal-content {
  background-color: #fff;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.5);
  max-width: 500px;
  width: 100%;
}

.produtos-modal {
  background-color: #f8f8f8;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 10px;
  font-size: 16px;
  color: #333;
}

.produtos-modal:nth-child(even) {
  background-color: #f2f2f2;
}

.button-deletar {
  margin-left: 30px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  cursor: pointer;
  float: right;
  padding: 10px;
  background-color: #b80000;
  color: #fff;
  margin-top: 30px;
}

.buttons {
  display: inline-block;
}

.button {
  border-radius: 10px;
  display: flex;
  align-items: center;
  cursor: pointer;
  float: right;
  padding: 10px;
  background-color: #00692b;
  color: #fff;
  margin-top: 30px;
}

.button-tecido {
  margin-left: 30px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  cursor: pointer;
  float: right;
  padding: 10px;
  background-color: #00692b;
  color: #fff;
  margin-top: 30px;
}

.img-close {
  position: absolute;
  top: 20px;
  right: 20px;
  cursor: pointer;
}
</style>

  