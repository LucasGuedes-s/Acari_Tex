<template>
    <div>
      <h1>Estoque de Tecidos</h1>
      <div>
        <SidebarNav />
      </div>
      <div>
        <AdicionarEstoque @getEstoque="getEstoque" @gerarPDF="gerarPDF"/>
      </div>
      <div class="conteiner-produtos" v-for="item in estoque" :key="item.id_do_tecido">
        <div class="produtos">Tecido: {{ item.nome_do_tecido }}</div>
        <div class="produtos">Estoque: {{ item.estoque }}</div>
        <div class="produtos">Fornecedor: {{ item.fornecedor }}</div>
        <div class="button-container" @click="getTecido(item.id_do_tecido)">
          <span class="tooltip" >Detalhar</span>
        </div>
      </div>
      <div v-if="showModalProduto" class="modal-background">
        <div class="modal-content">
          <img class = "img-close" @click="showModalProduto = false" src="@/assets/close.png" />
          <div class="produtos-modal">
            <div class="produtos-modal">Tecido: {{ produto.nome_do_tecido }}</div>
            <div class="produtos-modal">Valor: R$ {{ produto.valor }}</div>
            <div class="produtos-modal">Fornecedor: {{ produto.fornecedor }}</div>
            <div class="produtos-modal">Estoque: {{ produto.estoque }}</div>
            <div class="produtos-modal">Composição: {{ produto.composicao }}</div>
            <div class="produtos-modal">Notas: {{ produto.notas }}</div>
            <div class="button">
              <span class="tooltip" >Gerar Relatório</span>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>
<script>
    import SidebarNav from '@/components/Sidebar.vue';
    import AdicionarEstoque from '@/components/AdicionarEstoque.vue';
    import Axios from 'axios'
    import { jsPDF } from "jspdf";

    export default {
    name: 'Dashbboard-tecidos',
    data(){
      return{
        id: null,
        estoque: null,
        produto: null,
        showModalProduto: false
      }
    },
    methods:{
      async getEstoque(){
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
      async getTecido(id_do_tecido){
        Axios.get(`http://localhost:3333/Estoque/${id_do_tecido}`)
        .then(response => {
          console.log(response.status)
          console.log(response.data.produto)
          this.produto = response.data.produto
          this.showModalProduto = true
        })
      },
      async gerarPDF() {
        console.log('Só cheguei aqui')

        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: 'a4'
        });

        doc.text("Hello world!", 10, 10);
              // Cabeçalho da tabela
        const headers = [["Tecido", "Estoque", "Fornecedor"]];

        // Dados da lista de estoque
        //const data = this.estoque.map(item => [item.nome_do_tecido, item.estoque, item.fornecedor]);

        doc.table(headers)
        doc.save("Relatório de estoque.pdf");
      }
    },
    mounted() {
      this.getEstoque();
    },
    components:{
        SidebarNav,
        AdicionarEstoque
    }

    }
</script>

<style scoped>
  .conteiner-produtos{
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
    display: flex;
    align-items: center;
    cursor: pointer;
    float: right;
    padding: 10px;
    background-color: #00692b;
    color: #fff;
  }
  .produtos{
    display: flex;
    flex-direction: column;
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
  .produtos-modal{
    font-size: 20px;
    display: table;
    padding: 10px;
    margin-left: 15px;
  }
  .button{
    display: flex;
    align-items: center;
    cursor: pointer;
    float: right;
    padding: 10px;
    background-color: #00692b;
    color: #fff;
    margin-top: 10px;
  }
  .img-close {
    position: absolute;
    top: 20px;
    right: 20px;
    cursor: pointer;
  }
</style>

  