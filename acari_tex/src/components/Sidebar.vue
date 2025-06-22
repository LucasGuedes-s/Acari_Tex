<template>
  <div>
    <div :class="{ 'sidebar': true, 'minimized': isMinimized }">
      <div class="menu">
        <div>
          <!-- Alterando a classe da imagem da logo com base no estado 'isMinimized' -->
          <img 
            class="icon-logo" 
            :src="isMinimized ? require('@/assets/LogoAcariTex.png') : require('@/assets/Logo.png')" 
            :class="{'logo-minimized': isMinimized}" 
            alt="Logo">
        </div>
        <div class="list-group">
          <div class="list-group-item" @click="toggleSidebar">
            <router-link to="/Dashboard" class="d-flex align-items-center text-reset">
              <i class="bi bi-house-door-fill icon"></i>
              <span v-if="!isMinimized" class="ms-2">Dashboard</span>
            </router-link>
          </div>
          <div class="list-group-item" @click="toggleSidebar">
            <router-link to="/MinhaEquipe" class="d-flex align-items-center text-reset">
              <i class="bi bi-person-fill icon"></i>
              <span v-if="!isMinimized" class="ms-2">Minha equipe</span>
            </router-link>
          </div>
          <div class="list-group-item" @click="toggleSidebar">
            <router-link to="/Producao" class="d-flex align-items-center text-reset">
              <i class="bi bi-bar-chart-line-fill icon"></i>
              <span v-if="!isMinimized" class="ms-2">Produção</span>
            </router-link>
          </div>
          <div class="list-group-item" @click="toggleSidebar">
            <router-link to="/Eficiencia" class="d-flex align-items-center text-reset">
              <i class="bi bi-gear-fill icon"></i>
              <span v-if="!isMinimized" class="ms-2">Configurações</span>
            </router-link>
          </div>
        </div>
      </div>
      <div class="arrasta" @click="toggleSidebar">
        <img src="@/assets/setas.png" alt="Toggle Sidebar" />
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
      if (window.innerWidth <= 600) {
        this.isMinimized = !this.isMinimized;
      }
    }
  },
};
</script>

<style scoped>
.icon-logo {
  margin-top: 20px;
  margin-bottom: 40px;
  padding: 5px;
  width: 150px;
}

.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  background-color: #ffffff;
  width: 200px;
  transition: width 0.3s;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
}

.minimized {
  width: 80px;
}
.logo-minimized{
  width: 80px;
}
.minimized .list-group-item span {
  display: none;
}

.icon {
  font-size: 1.5em;
  margin-right: 10px;
}

.menu .list-group-item {
  padding: 10px 20px;
  border: none;
  transition: background-color 0.3s;
  cursor: pointer;
}
.menu .list-group-item{
  margin-left: 10px;
  color: #616161;
}
.menu .list-group-item:hover {
  color:rgb(41, 41, 41);
}

.arrasta img {
  margin-left: 10px;
  margin-top: 70px;
  width: 50px;
  cursor: pointer;
}
a{
  text-decoration: none;
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
