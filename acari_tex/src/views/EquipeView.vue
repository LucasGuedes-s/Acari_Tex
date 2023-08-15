<template>
    <div>
      <h1>Minha Equipe</h1>
      <div>
        <SidebarNav />
      </div>
    </div>
</template>
<script>
    import SidebarNav from '@/components/Sidebar.vue';
    export default {
    name: 'Dashbboard-home',
    data(){
      return{
      }
    },
    components:{
        SidebarNav,
        //AdicionarEstoque
    }

    }
</script>

<style scoped>
</style>

  