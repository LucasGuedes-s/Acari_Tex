<template>
    <div class="container position-absolute top-0 end-0 p-3">
      <div class="row align-items-center justify-content-end">
        <div class="col-md-6 user-info d-flex align-items-center justify-content-end">
          <i class="fas fa-bell me-3"></i>
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