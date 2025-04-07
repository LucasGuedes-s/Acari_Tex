<template>
  <div class="container-fluid px-4"> 
    <div class="row align-items-center justify-content-between">
      <!-- Informações do usuário alinhadas à direita -->
      <div class="col-auto ms-auto user-info d-flex align-items-center">
        <!-- Botão de "+" -->
        <button class="btn btn-sm border d-flex align-items-center justify-content-center"
          style="width: 40px; height: 40px; border-radius: 50%;" @click="Adicionar()">
          <i class="fas fa-plus"></i>
        </button>
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
import router from '@/router';
import { useAuthStore } from '@/store/store';
import Swal from 'sweetalert2';

export default {
  name: 'Dashbboard-home',
  setup() {
    const authStore = useAuthStore();
    const usuario = authStore.usuario; // Pega o usuário da store
    return {
      usuario
    };
  },
  methods: {
    async Adicionar() {
      const resultado = await Swal.fire({
        title: 'Deseja',
        text: 'Deseja adicionar peças OP ou adicionar funcionários',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Adicionar peças',
        cancelButtonText: 'Cancelar',
        showDenyButton: true,
        denyButtonText: 'Adicionar funcionário',
      });
      if (resultado.isConfirmed) {
        router.push('/Adicionar/peca')
      }
      if (resultado.isDenied) {
        router.push('/Adicionar/funcionario')
      }
    }
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