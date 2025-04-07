<template>
  <div class="titulo-subtitulo-container">
    <div class="titulo-subtitulo">
      <h2 class="titulo">{{ titulo }}</h2>
      <h3 class="subtitulo">{{ subtitulo }}</h3>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    titulo: {
      type: String,
      required: true
    },
    subtitulo: {
      type: String,
      required: true
    }
  }
};
</script>

<style scoped>
.titulo-subtitulo-container {
  width: 100%;
  background-color: white;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  padding: 25px;
  margin-bottom: 25px;
}

.titulo-subtitulo {
  text-align: center;
}

.titulo {
  font-size: 2.5rem;
  color: #00692b;
  font-weight: 600;
}

.subtitulo {
  font-size: 1.5rem;
  color: #555;
  font-weight: 400;
  margin-top: 5px;
}
</style>
