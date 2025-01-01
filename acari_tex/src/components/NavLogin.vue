<template>
<nav class="navbar">
    <div class="container">
      <a class="navbar-brand" href="#">
        <img src="@/assets/Logo.png" alt="Logo" class="logo" />
      </a>
    </div>
  </nav>
</template>
<script>

export default {
    name: 'login-nav',
}
</script>
<style scoped>
.navbar {
    background-color: #ffffff;
    padding: 10px 20px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); 
  }
  
  .navbar-brand {
    display: flex;
    align-items: center;
  }
  
  .logo {
    height: 80px; /* Tamanho da logo */
    margin-right: 5px;
  }
  
</style>