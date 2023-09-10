<template>
    <div>
      <h1>Estoque de Agulhas</h1>
      <div>
        <SidebarNav />
      </div>
      <div>
        <AdicionarEstoque/>
      </div>
      <div class="conteiner-produtos" v-for="item in agulhas" :key="item.id_da_agulha">
        <div class="produtos">Valor: R$ {{ item.valor }}</div>
        <div class="produtos">Estoque: {{ item.estoque }}</div>
        <div class="produtos">Fornecedor: {{ item.fornecedor }}</div>
        <div class="button-container" @click="getAgulha(item.id_da_agulha)">
          <span class="tooltip" >Detalhar</span>
        </div>
      </div>
    </div>
</template>
<script>
    import SidebarNav from '@/components/Sidebar.vue';
    import AdicionarEstoque from '@/components/AdicionarTecido.vue';
    import Axios from 'axios'

    export default {
    name: 'Dashbboard-tecidos',
    data(){
      return{
        agulhas: null,
        produto: null
      }
    },
    methods:{
      async getEstoqueAgulhas(){
        Axios.get(`http://localhost:3333/EstoqueAgulhas`)
        .then(response => {
          console.log(response.status)
          console.log(response.data.produtos)
          this.agulhas = response.data.produtos
        })
      },
      async getAgulha(id_da_agulha){
        Axios.get(`http://localhost:3333/EstoqueAgulhas/${id_da_agulha}`)
        .then(response => {
          console.log(response.status)
          console.log(response.data.produto)
          this.produto = response.data.produto
          this.showModalProduto = true
        })
      }
    },
    components:{
        SidebarNav,
        AdicionarEstoque
    },
    mounted () {
      this.getEstoqueAgulhas()
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
    border-radius: 30px;
    align-items: center;
    cursor: pointer;
    float: right;
    padding: 10px;
    background-color: #00692b;
    color: #fff;
  }
  .produtos{
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
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 10px;
    font-size: 16px;
    color: #333;
  }

  .produtos-modal:nth-child(even) {
    background-color: #f2f2f2;
  }
  .button-deletar{
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
  .button{
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
  .button-tecido{
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

  