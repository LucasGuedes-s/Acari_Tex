<template>
    <div>
      <h1>Estoque de Agulhas</h1>
      <div>
        <SidebarNav />
      </div>
      <div>
        <AdicionarEstoque @getEstoqueAgulhas="getEstoqueAgulhas" />
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
    import AdicionarEstoque from '@/components/AdicionarAgulhas.vue';
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
</style>

  