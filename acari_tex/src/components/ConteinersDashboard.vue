<template>
  <div class="row align-items-stretch">
    <div class="col-12 col-md-4 mb-3">
      <div class="card border-0 shadow-sm h-100 text-start p-4 bg-white">
        <div class="card-body">
          <div class="d-flex align-items-center mb-3">
            <i :class="['bi', notifIcon, 'me-2']" style="font-size: 1.8rem;"></i>
            <h5 class="card-title mb-0">{{ notifTitle }}</h5>
          </div>
          <p class="text-muted mb-0">{{ notifMessage }}</p>
        </div>
      </div>
    </div>

    <div class="col-12 col-md-8 mb-3">
      <div class="card border-0 shadow h-100 p-4 text-start bg-white">
        <div class="card-body">
          <h4 class="card-title mb-3">{{ textTitle }}</h4>
          <p class="card-text fs-6">{{ textContent }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "ContainersGerais",
  props: {
    // Notificações
    notifIcon: {
      type: String,
      default: "bi-bell"
    },
    notifTitle: {
      type: String,
      default: "Notificações"
    },
    notifMessage: {
      type: String,
      default: "Nenhuma notificação no momento."
    },

    // Texto
    textTitle: {
      type: String,
      default: "Resumo"
    },
    textContent: {
      type: String,
      default: "Nenhum dado disponível para exibição."
    }
  }
};
</script>

<style scoped>
.card {
  border-radius: 12px;
  transition: transform 0.2s, box-shadow 0.2s;
  background: #fff;
}

.card:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
}

.card-title {
  font-weight: 600;
}

.text-muted {
  font-size: 0.95rem;
}
</style>
