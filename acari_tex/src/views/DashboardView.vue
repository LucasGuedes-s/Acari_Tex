<template>
    <div>
      <h1>Estoque</h1>
      <div>
        <SidebarNav />
      </div>
      <div>
        <AdicionarEstoque />
      </div>
      <div class="conteiner-produtos" v-for="item in estoque" :key="item.id_do_tecido">
        <div class="produtos">Tecido: {{ item.nome_do_tecido }}</div>
        <div class="produtos">Valor: R${{ item.nome_do_tecido }}</div>
        <div class="produtos">Fornecedor: {{ item.fornecedor }}</div>
        <div class="produtos">Composição: {{ item.composicao }}</div>
        <div class="produtos">Estoque: {{ item.estoque }}</div>
        <div class="produtos">Notas: {{ item.notas }}</div>
      </div>
    </div>
</template>
<script>
    import SidebarNav from '@/components/Sidebar.vue';
    import AdicionarEstoque from '@/components/AdicionarEstoque.vue';
    import Axios from 'axios'

    export default {
    name: 'Dashbboard-home',
    data(){
      return{
        id: 1,
        estoque: null
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
  h1{
    display: flex;
    text-align: center;
    justify-content: center;
  }
  .conteiner-produtos{
    width: 25%;
    display: inline-grid;
    margin: 30px 10px auto;
    background-color: #f2f2f2;
    padding: 10px;
    text-align: center;
    border-radius: 10px;
    margin-bottom: 20px;
  }
  .produtos{
    display: flex;
    justify-content: left;
    padding: 10px;
  }
</style>

  