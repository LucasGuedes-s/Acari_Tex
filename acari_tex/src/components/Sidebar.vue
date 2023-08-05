<template>
    <div>
      <div class="list">
        <div :class="{ 'sidebar': true, 'minimized': isMinimized }">
          <div class="menu">
  
            <div class="item" @click="toggleSidebar">
              <router-link to="/">
                <img class="icon" src="@/assets/Dashboard.png"/><p>Dashboard</p>
              </router-link>
            </div>
  
            <div class="item" @click="toggleSidebar">
              <router-link to="/">
                <img class="icon" src="@/assets/funcionarios.png"/><p>Funcionários</p>
              </router-link>
            </div>

            <div class="item" @click="toggleSidebar">
              <router-link to="/">
                <img class="icon" src="@/assets/pedidos.png"/><p>Pedidos</p>
              </router-link>
            </div> 

            <div class="item" @click="toggleSidebar">
              <router-link to="/">
                <img class="icon" src="@/assets/eficiencia.png"/><p>Eficiencia</p>
              </router-link>
            </div>
  
          </div>
          <div class="arrasta" @click="toggleSidebar">
            <img src="@/assets/logo.png"/>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'Sidebar-menu',
    data() {
      return {
        isMinimized: false,
      };
    },
    methods: {
      toggleSidebar() {
        this.isMinimized = !this.isMinimized;
      },
    },
  };
  </script>
  
  <style scoped>
    .list{
      align-items: center;
    }
    .sidebar {
      box-shadow: 3px 3px 3px grey;
      text-align: center;
      font-size: medium;
      width: 200px;
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      background: #00692b;
      transition: left 0.3s;
    }
    .minimized {
      width: 80px;
    }
    .minimized .item p{
      display: none;
    }
    .minimized .menu .item img{
      width: 50px;
      margin-left: 5px;
    }
    .menu .item a{
      font-family: Verdana, Geneva, Tahoma, sans-serif;
      color: #ffffff;
      font-size:16px;
      text-decoration: none;
      display: flex; 
      align-items: center;
      line-height: 50px;
    }
    .menu .item{
      margin-top: 50px;
    }
    .menu .item img{
      width: 50px;
      padding: 10px;
    }
    .menu .item a:hover{
      background: #750075;
      transition: o.3s ease;
    }
    /*Diminuindo o sideBar */
    .arrasta img{
      margin-left: 10px;
      margin-top: 70px;
      width: 50px;
    } 

    @media screen and (max-width: 600px) {
        .menu .item img{
            width: 50px;
            padding: 5px;
        }
        .arrasta img{
          margin-left: 0px;
          margin-top: 20px;
          width: 50px;
        } 
    }
</style>
  