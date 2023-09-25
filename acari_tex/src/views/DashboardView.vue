<template>
    <div >
      <div>
        <SidebarNav />
      </div>
      <div class="conteiner-dashboard">
        <div class="conteiner-principal">
          <h1>Seja bem vindo</h1>
          <img src="@/assets/trabalho.png">
        </div>
      </div>
      <div>
        <div class="conteiner">
          <div class="conteiner-quantidade"> 
            <h1>Estoque de Tecidos</h1>
            <h2>Quantidade: {{ quantidadeDeTecidos }}</h2>
            <div class="button-container">
              <RouterLink to="/EstoqueTecidos"><a class="tooltip">Detalhar</a></RouterLink>
            </div>
          </div>
            <div class="conteiner-quantidade"> 
              <h1>Estoque de Agulhas</h1>
              <h2>Quantidade: 01</h2>
              <div class="button-container">
                <RouterLink to="/EstoqueAgulhas"><a class="tooltip" >Detalhar</a></RouterLink>
              </div>
            </div>
          </div>
          <div class="conteiner-dashboard">
            <div>
              <h1>Tarefas</h1>
              <div class="conteiner-tarefas" v-for="item in tarefas" :key="item.id ">
                <div class="tarefa">Tarefa: {{ item.tarefa }}</div>
                <div class="tarefa">Status: {{ item.status }}</div>
                <div class="tarefa">Data: {{ item.data }}</div>
                <div class="button-container">
                  <RouterLink to="/"><a class="tooltip" >Concluída</a></RouterLink>
                </div>
              </div>
              <div class="button">
                  <a class="adicionar" >Adicionar</a>
                </div>
            </div>
          </div>
        </div>
        <div>
          <Calendario />
        </div>
    </div>
</template>
<script>
    import SidebarNav from '@/components/Sidebar.vue';
    import Calendario from '@/components/Calendario.vue';
    import Axios from 'axios'

    export default {
    name: 'Dashbboard-home',
    data(){
      return{
        id: 1,
        estoque: null,
        quantidadeDeTecidos: null,
        showModalProduto: false,
        tarefas: null,
      }
    },
    methods:{
      async getEstoque(){
        Axios.get(`http://localhost:3333/Estoque`)
        .then(response => {
            console.log(response.status)
            console.log(response.data.produtos)
            this.estoque = response.data.produtos
            this.quantidadeDeTecidos = this.estoque.length;
        })
        .catch(error => {
            console.error(error);
        });
      },
      async getTarefas(){
        Axios.get(`http://localhost:3333/Tarefas`)
        .then(response => {
            console.log(response.status)
            console.log(response.data.tarefas)
            this.tarefas = response.data.tarefas
        })
        .catch(error => {
            console.error(error);
        });
      },
    },
    mounted() {
      this.getEstoque();
      this.getTarefas()
    },
    components:{
        SidebarNav,
        Calendario
    }

    }
</script>

<style scoped>
  .conteiner-tarefas{
    display: flex;
    margin: auto;
    background-color: #e0e0e0;
    border: 1px solid #ddd;
    padding: 10px;
    text-align: center;
    border-radius: 10px;
    margin-bottom: 20px;
    justify-content: space-between;
    align-items: center;
  }
  .tarefa{
    width: 200px;
  }
  .conteiner-dashboard{
    background-color: #ffff;
    padding: 20px;
    margin: 10px auto;
    width: 50%;
    border-radius: 20px;
  }
  .conteiner-principal img{
    width: 250px;
  }
  .conteiner-principal{
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .conteiner h1{
    display: flex;
    text-align: center;
    justify-content: center;
  }
  .conteiner{
    display: flex;
    justify-content: center;
  }
  .conteiner-quantidade{
    background-color: #ffff;
    padding: 20px;
    margin: 10px;
    border-radius: 20px;
  }
  .conteiner-quantidade img{
    width: 50px;
  }
  .tooltip {
    display: flex;
    align-items: center;
    cursor: pointer;
    float: right;
    padding: 10px;
    background-color: #00692b;
    text-decoration: none;
    margin: 10px;
    border-radius: 10px;
  }
  .adicionar{
    display: flex;
    width: 80px;
    align-items: center;
    cursor: pointer;
    padding: 10px;
    background-color: #00692b;
    color: #ddd;
    text-decoration: none;
    border-radius: 10px;
    justify-content: space-around;
  }
  .button-container{
    display: flex;
    align-items: center;
    cursor: pointer;
    justify-content: space-evenly;
  }
  .button{
    align-items: center;
    cursor: pointer;
    justify-content: space-evenly;
  }
  .button-container a {
    color: #ffff;
    text-decoration: none;
  }
  .tooltip{
    align-items: center;
  }

  @media screen and (max-width: 600px) {
    .conteiner-principal{
      display: block;
    }
    .conteiner-dashboard{
      background-color: #ffff;
      padding: 10px;
      margin: 10px 85px auto;
      width: 70%;
      border-radius: 20px;
    }
    .conteiner{
      display: flex;
      margin-left: 80px;
      justify-content: center;
      flex-wrap: wrap;
      flex-direction: row-reverse;
    }
    .conteiner-principal img{
      display: none;
      width: 150px;
    }
  }
</style>

  