<template>
  <router-view/>
  <div v-if="!online" class="offline-banner">
    ⚠️ Você está sem internet. Os dados serão sincronizados depois.
  </div>
</template>
<script>
export default {
  data() {
    return {
      online: navigator.onLine
    }
  },

  mounted() {

    window.addEventListener("online", () => {
      this.online = true
      console.log("Internet voltou")
    })

    window.addEventListener("offline", () => {
      this.online = false
      console.log("Sem internet")
    })

  }
}
</script>
<style>
#app {
  font-family: 'Montserrat', sans-serif; 
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
:root {
  --verde-escuro: #0d3927;
  --verde-claro: #266c44;
  --cinza-claro: #dedede;
  --bs-primary: #145a32
}

nav {
  padding: 30px;
}

nav a {
  font-weight: bold;
  color: #2c3e50;
}

nav a.router-link-exact-active {
  color: #42b983;
}
.offline-banner{
  background:#ff4444;
  color:white;
  text-align:center;
  padding:8px;
  font-weight:bold;
}
</style>
