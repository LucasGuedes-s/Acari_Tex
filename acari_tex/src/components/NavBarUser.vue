<template>
  <div class="container-fluid px-4"> 
    <div class="row align-items-center justify-content-between">
      <!-- Informações do usuário alinhadas à direita -->
      <div class="col-auto ms-auto user-info d-flex align-items-center">
        <!-- Foto e Informações do Usuário -->
        <div class="foto me-3">
          <img :src="usuario?.foto" alt="Foto" class="rounded-circle" style="width: 40px; height: 40px;">
        </div>
        <div>
          <div class="user-name fw-bold">{{ usuario?.nome }}</div>
          <div class="user-role text-muted">{{ usuario?.funcoes }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { useAuthStore } from '@/store/store';

export default {
  name: 'Dashbboard-home',
  setup() {
    const authStore = useAuthStore();
    const usuario = authStore.usuario; // Pega o usuário da store
    return {
      usuario
    };
  }
}
</script>
<style>
.btn {
  margin: 10px;
  background-color: #00692b;
  color: rgb(255, 255, 255);
}
.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

@media (max-width: 768px) {
  .user-info {
    flex-direction: row; /* Mantém os itens alinhados horizontalmente */
  }
}

</style>