<template>
  <div class="col-12 col-sm-6 col-md-3 mb-3">
    <div class="card card-atalho border-0 shadow h-100 text-center">
      <div class="card-body d-flex flex-column justify-content-center align-items-center">
        <i :class="['bi', icon]" class="atalho-icon mb-2"></i>
        <p class="atalho-text mb-0">{{ title }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    icon: String,
    title: String,
  },
};
</script>
<style scoped>
.card-atalho {
  background: linear-gradient(135deg, #1b5e20, #2e7d32); /* verdes mais escuros */
  color: white;
  border-radius: 12px;
  transition: transform 0.2s, box-shadow 0.3s;
  cursor: pointer;
}
.card-atalho:hover {
  transform: scale(1.05);
  box-shadow: 0px 8px 20px rgba(27, 94, 32, 0.4); /* sombra mais intensa */
}

.atalho-icon {
  font-size: 2rem;
}

.atalho-text {
  font-size: 1rem;
  font-weight: 500;
}
</style>
