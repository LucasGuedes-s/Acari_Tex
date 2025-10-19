<template>
  <div>
    <!-- Navbar (hamburguer + user) -->
    <nav class="mobile-navbar d-flex justify-content-between align-items-center p-2">
      <button class="btn btn-outline-secondary" @click="isMinimized = !isMinimized">
        <i class="bi bi-list"></i>
      </button>
      <NavBarUser class="ms-2" />
    </nav>

    <!-- Sidebar -->
    <div :class="['sidebar', { minimized: isMinimized, 'mobile-open': isMinimized }]">
      <div class="menu">
        <div @click="irPara()">
          <img class="icon-logo"
            :src="require('@/assets/Logo.png')"
            :class="{ 'logo-minimized': isMinimized }"
            alt="Logo">
        </div>
        
        <div class="list-group">
          <div class="list-group-item" @click="toggleSidebar">
            <router-link to="/dashboard" class="d-flex align-items-center text-reset" exact-active-class="ativo">
              <i class="bi bi-house-up icon"></i>
              <span>Dashboard</span>
            </router-link>
          </div>
          <div class="list-group-item" @click="toggleSidebar">
            <router-link to="/MinhaEquipe" class="d-flex align-items-center text-reset" exact-active-class="ativo">
              <i class="bi bi-people icon"></i>
              <span>Funcionários</span>
            </router-link>
          </div>
          <div class="list-group-item" @click="toggleSidebar">
            <router-link to="/Producao" class="d-flex align-items-center text-reset" exact-active-class="ativo">
              <i class="bi bi-bar-chart icon"></i>
              <span>Produção</span>
            </router-link>
          </div>
          <div class="list-group-item" @click="toggleSidebar">
            <router-link to="/adicionar-peca" class="d-flex align-items-center text-reset" exact-active-class="ativo">
              <i class="bi bi-plus-circle icon"></i>
              <span>Adicionar OP</span>
            </router-link>
          </div>

          <div class="list-group-item" @click="toggleSidebar">
            <router-link to="/not-found" class="d-flex align-items-center text-reset" exact-active-class="ativo">
              <i class="bi bi-cash-coin icon"></i>
              <span>Financeiro</span>
            </router-link>
          </div>
          <div class="list-group-item" @click="toggleSidebar">
            <router-link to="/relatorios" class="d-flex align-items-center text-reset" exact-active-class="ativo">
              <i class="bi bi-graph-up-arrow icon"></i>
              <span>Relatórios</span>
            </router-link>
          </div>
          <!-- 
          <div class="list-group-item" @click="toggleSidebar">
            <router-link to="/minha-equipe" class="d-flex align-items-center text-reset" exact-active-class="ativo">
              <i class="bi bi-bell icon"></i>
              <span>Notificações</span>
            </router-link>
          </div>-->

          <div class="list-group-item" @click="toggleSidebar">
            <router-link to="/" class="d-flex align-items-center text-reset" exact-active-class="ativo">
              <i class="bi bi-box-arrow-left icon"></i>
              <span>Sair</span>
            </router-link>
          </div>
        </div>
      </div>
    </div>
    <NotificacoesProd />
    <!-- Overlay mobile/tablet -->
    <div v-if="isMinimized" class="overlay" @click="isMinimized = false"></div>
  </div>
</template>

<script>
import router from '@/router';
import NavBarUser from './NavBarUser.vue';
import NotificacoesProd from './NotificacoesProd.vue';

export default {
  name: 'Sidebar-menu',
  data() {
    return {
      isMinimized: false,
    };
  },
  components: {
    NavBarUser,
    NotificacoesProd
  },
  methods: {
    toggleSidebar() {
      if (window.innerWidth <= 992) { // agora também pega tablet
        this.isMinimized = !this.isMinimized;
      }
    },
    irPara(){
      router.push('/dashboard')
    }
  },
};
</script>
<style scoped>
.ativo {
  background-color: #f2f4f7; 
  color: #2b2b2b !important; 
  border-left: 4px solid var(--verde-escuro); 
  font-weight: 500;
  border-radius: 0 8px 8px 0;
  padding-left: 10px;
}

.ativo i {
  color: var(--verde-escuro) !important;
}

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

.btn {
  background-color: var(--verde-escuro);
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

a {
  text-decoration: none;
}

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
/* 📱 + 📟 Celular e Tablet */
@media screen and (max-width: 1025px) {
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

@media screen and (min-width: 993px) {
  .mobile-navbar {
    display: none !important;
  }

  .sidebar {
    left: 0 !important;
    width: 200px;
    position: fixed;
  }
}

</style>
