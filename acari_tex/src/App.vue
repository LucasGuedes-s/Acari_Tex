<template>
  <router-view/>
</template>

<style>
#app {
  font-family: 'Montserrat', sans-serif; 
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
:root {
  --verde-escuro: #145a32;
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
</style>
