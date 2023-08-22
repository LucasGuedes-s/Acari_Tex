<template>
    <div>
      <h1>Minha Equipe</h1>
      <div>
        <div class="conteiner" v-for="item in funcionarios" :key="item.id">
          <img src="@/assets/imagem.jpeg">
          <div class="funcionario">Nome: {{ item.nome_do_funcionario }}</div>
          <div class="funcionario">Idade: {{ item.idade }}</div>
          <div class="funcionario">Funções: {{ item.funcoes }}</div>
          <div class="funcionario">Notas: {{ item.notas }}</div>
        </div>
      </div>
      <div>
        <SidebarNav />
      </div>
      <section>
        <h1></h1>
      </section>
    </div>
</template>
<script>
    import SidebarNav from '@/components/Sidebar.vue';
    import Axios from 'axios'

    export default {
    name: 'funcionarios-equipe',
    data(){
      return{
        funcionarios: null
      }
    },
    components:{
        SidebarNav,
    },
    methods:{
      async getFuncionarios(){
        Axios.get(`http://localhost:3333/Funcionarios`)
        .then(response => {
            console.log(response.status)
            console.log(response.data.funcionarios)
            this.funcionarios = response.data.funcionarios
        })
        .catch(error => {
            console.error(error);
        });
      }
    },
    mounted(){
      this.getFuncionarios();
    }

    }
</script>

<style scoped>
.conteiner{
  background-color: #ffff;
  padding: 30px;
  margin: 10px auto;
  width: 50%;
  border-radius: 20px;
}
.conteiner img{
  width: 100px;
  float: left;
}
.funcionario{
  font-size: 18px;
  display: flex;
  flex-direction: row;
  padding: 5px;
  padding-left: 25px;
  align-items: center;
}
</style>

  