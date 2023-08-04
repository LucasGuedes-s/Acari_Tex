<template>
    <div>
      <h1>Estoque</h1>
      <div>
        <SidebarNav />
      </div>

      <div>
        <AdicionarEstoque />
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
        estoque: ""
      }
    },
    methods:{
      async getEstoque(){
        const id = this.id;

        Axios.get(`http://localhost:3333/Estoque/${id}`)
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
</style>

  