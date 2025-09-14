<template>
  <div>
    <!-- Navbar mobile -->
    <nav class="mobile-navbar d-md-none d-flex justify-content-end align-items-center p-2">
      <button class="btn btn-outline-secondary" @click="isMinimized = !isMinimized">
        <i class="bi bi-list"></i>

      </button>
      <NavBarUser class="ms-2" />
    </nav>

    <!-- Sidebar -->
    <div :class="['sidebar', { minimized: isMinimized, 'mobile-open': isMinimized }]">
      <div class="menu">
        <!-- Logo só no desktop -->
        <div>
          <img class="icon-logo"
            :src="isMinimized ? require('@/assets/Logo.png') : require('@/assets/Logo.png')"
            :class="{ 'logo-minimized': isMinimized }" alt="Logo">
        </div>
        
        <div class="list-group">
          <div class="list-group-item" @click="toggleSidebar">
            <router-link to="/dashboard" class="d-flex align-items-center text-reset">
              <i class="bi bi-house-door-fill icon"></i>
              <span>Dashboard</span>
            </router-link>
          </div>
          <div class="list-group-item" @click="toggleSidebar">
            <router-link to="/MinhaEquipe" class="d-flex align-items-center text-reset">
              <i class="bi bi-person-fill icon"></i>
              <span>Minha equipe</span>
            </router-link>
          </div>
          <div class="list-group-item" @click="toggleSidebar">
            <router-link to="/Producao" class="d-flex align-items-center text-reset">
              <i class="bi bi-bar-chart-line-fill icon"></i>
              <span>Produção</span>
            </router-link>
          </div>
          <div class="list-group-item" @click="toggleSidebar">
            <router-link to="/adicionar-peca" class="d-flex align-items-center text-reset">
              <i class="bi bi-plus-circle-fill icon"></i>
              <span>Adicionar OP</span>
            </router-link>
          </div>
          <div class="list-group-item" @click="toggleSidebar">
            <router-link to="/relatorios" class="d-flex align-items-center text-reset">
              <i class="bi bi-graph-up-arrow icon"></i>
              <span>Relatórios</span>
            </router-link>
          </div>
          <div class="list-group-item" @click="toggleSidebar">
            <router-link to="/" class="d-flex align-items-center text-reset">
              <i class="bi bi-gear-fill icon"></i>
              <span>Sair</span>
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Overlay mobile -->
    <div v-if="isMinimized" class="overlay" @click="isMinimized = false"></div>
  </div>
</template>

<script>
import NavBarUser from './NavBarUser.vue';

export default {
  name: 'Sidebar-menu',
  data() {
    return {
      isMinimized: false,
    };
  },
  components: {
    NavBarUser,
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
/* Mantendo exatamente seu estilo pré-definido */
.icon-logo {
  margin-top: 20px;
  margin-bottom: 20px;
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
}

.minimized {
  width: 80px;
}

.logo-minimized {
  width: 80px;
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

.menu .list-group-item {
  margin-left: 10px;
  color: #616161;
}

.menu .list-group-item:hover {
  color: rgb(41, 41, 41);
}

.arrasta img {
  display: none;
  margin-left: 10px;
  margin-top: 70px;
  width: 50px;
  cursor: pointer;
}

a {
  text-decoration: none;
}

/* Mobile navbar e off-canvas */
.mobile-navbar {
  display: none;
  background-color: #fff;
  border-bottom: 1px solid #ddd;
  z-index: 1100;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  z-index: 900;
}

.mobile-open {
  left: 0;
}

@media screen and (max-width: 600px) {
  .mobile-navbar {
    display: flex;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: -250px;
    width: 250px;
    height: 100%;
    transition: all 0.3s;
    z-index: 1001;
  }

  .mobile-open {
    left: 0;
  }

  .icon-logo {
    display: flex;
    margin-left: 15px;
    width: 150px;
  }

  /* Overlay */
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    z-index: 1000;
  }
}
</style>
