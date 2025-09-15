<template>
  <div class="titulo-subtitulo-user-container">
    <div class="titulo-subtitulo">
      <h2 class="titulo">{{ titulo }}</h2>
      <h3 class="subtitulo">{{ subtitulo }}</h3>
    </div>

    <NavBarUser v-if="!isMobile" />
  </div>
</template>

<script>
import NavBarUser from '@/components/NavBarUser.vue'  // ajuste o caminho conforme seu projeto

export default {
  components: { NavBarUser },

  props: {
    titulo: { type: String, required: true },
    subtitulo: { type: String, required: true }
  },

  data() {
    return {
      isMobile: false
    }
  },

  mounted() {
    this.checkIsMobile()
    window.addEventListener('resize', this.checkIsMobile)
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.checkIsMobile)
  },

  methods: {
    checkIsMobile() {
      this.isMobile = window.innerWidth <= 600
    }
  }
}
</script>

<style scoped>
.titulo-subtitulo-user-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: white;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-radius: 10px; 
  padding: 10px 25px; 
  margin-bottom: 25px;

  max-width: 100%;
  margin-left: auto;
  margin-right: auto;
  margin-top: 10px;
}

.titulo-subtitulo {
  text-align: left;
}

.titulo {
  font-size: 1.6rem; /* menor que antes */
  color: var(--verde-escuro);
  font-weight: 600;
  margin: 0;
  width: max-content;
}

.subtitulo {
  font-size: 1rem; /* menor que antes */
  color: #555;
  font-weight: 400;
  margin-top: 3px;
  margin-bottom: 0;
}
</style>
