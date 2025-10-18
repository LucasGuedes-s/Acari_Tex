<template>
  <div class="not-found d-flex flex-column justify-content-center align-items-center text-center">
    <h1 class="display-4">404</h1>
    <p class="lead mb-4">Ops! Página não encontrada.</p>
    <router-link to="/dashboard" class="btn btn-outline-success">
      Voltar para o início
    </router-link>
  </div>
</template>

<script>
export default {
  name: 'NotFound'
}
</script>

<style scoped>
.not-found {
  height: 100vh;
  background-color: #f9fafb;
  color: #333;
}

.display-4 {
  font-size: 5rem;
  font-weight: 700;
  color: var(--verde-escuro);
}

.btn {
  margin-top: 20px;
}
</style>
