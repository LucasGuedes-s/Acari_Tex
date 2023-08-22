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
            <h2>Quantidade: 01</h2>
            <div class="button-container">
              <!-- <RouterLink to="/EstoqueTecidos"><a class="tooltip">Adicionar</a></RouterLink>-->
              <RouterLink to="/EstoqueTecidos"><a class="tooltip">Detalhar</a></RouterLink>
            </div>
          </div>
            <div class="conteiner-quantidade"> 
              <h1>Estoque de Agulhas</h1>
              <h2>Quantidade: 01</h2>
              <div class="button-container">
                <!-- <RouterLink to="/EstoqueTecidos"><a class="tooltip" >Adicionar</a></RouterLink>-->
                <RouterLink to="/EstoqueTecidos"><a class="tooltip" >Detalhar</a></RouterLink>
              </div>
            </div>
          </div>
        </div>
    </div>
</template>
<script>
    import SidebarNav from '@/components/Sidebar.vue';
    import Axios from 'axios'

    export default {
    name: 'Dashbboard-home',
    data(){
      return{
        id: 1,
        estoque: null,
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
      }
    },
    mounted() {
      this.getEstoque();
    },
    components:{
        SidebarNav,
    }

    }
</script>

<style scoped>
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
  .button-container{
    display: flex;
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
</style>

  