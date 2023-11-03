<template>
  <div>
    <div class="list">
      <div :class="{ 'sidebar': true, 'minimized': isMinimized }">
        <div class="menu">
          <div>
            <img class="icon-logo" src="@/assets/LogoAcariTex.png">
          </div>
          <div class="item" @click="toggleSidebar">
            <router-link to="/Dashboard">
              <img class="icon" src="@/assets/dashboard1.png" />
              <p>Dashboard</p>
            </router-link>
          </div>

          <div class="item" @click="toggleSidebar">
            <router-link to="/MinhaEquipe">
              <img class="icon" src="@/assets/funcionarios1.png" />
              <p>Minha equipe</p>
            </router-link>
          </div>

          <div class="item" @click="toggleSidebar">
            <router-link to="/Dashboard">
              <img class="icon" src="@/assets/pedidos1.png" />
              <p>Pedidos</p>
            </router-link>
          </div>

          <div class="item" @click="toggleSidebar">
            <router-link to="/Dashboard">
              <img class="icon" src="@/assets/eficiencia1.png" />
              <p>Eficiencia</p>
            </router-link>
          </div>

        </div>
        <div class="arrasta" @click="toggleSidebar">
          <img src="@/assets/setas.png" />
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
.icon-logo {
  margin-top: 20px;
  padding: 5px;
  width: 100px;
}

.list {
  align-items: center;
}

.sidebar {
  /*box-shadow: 1px 1px 1px grey;*/
  text-align: center;
  font-size: medium;
  width: 200px;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  background: #ffffff;
  transition: left 0.3s;
}

.minimized {
  width: 80px;
}

.minimized .item p {
  display: none;
}

.minimized .menu .item img {
  width: 50px;
  margin-left: 5px;
}

.minimized .icon-logo {
  margin-top: 20px;
  padding: 5px;
  width: 70px;
}

.menu .item a {
  font-family: Verdana, Geneva, Tahoma, sans-serif;
  color: black;
  font-size: 16px;
  text-decoration: none;
  display: flex;
  align-items: center;
  /*line-height: 50px;*/
}

.menu .item {
  margin-top: 20px;
}

.menu .item img {
  width: 50px;
  padding: 10px;
}

.menu .item a:hover {
  background: #dbdbdb;
  transition: o.3s ease;
}

/*Diminuindo o sideBar */
.arrasta img {
  margin-left: 10px;
  margin-top: 70px;
  width: 50px;
}

@media screen and (max-width: 600px) {
  .menu .item img {
    width: 50px;
    padding: 5px;
  }

  .arrasta img {
    margin-left: 0px;
    margin-top: 20px;
    width: 50px;
  }
}
</style>
  