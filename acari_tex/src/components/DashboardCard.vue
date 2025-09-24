<template>
    <div class="col-12 col-sm-6 col-md-3 mb-3">
      <div class="card border-0 shadow h-100 text-center" :class="bgClass">
        <div class="card-body">
          <div class="d-flex justify-content-center align-items-center mb-3">
            <i :class="['bi', icon]" style="font-size: 2rem;"></i>
          </div>
          <h3 class="card-title mb-1">{{ count }}</h3>
          <p class="card-text">{{ title }}</p>
          <p v-if="subcount">OPs: {{ subcount }}</p>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    props: {
      icon: String,
      title: String,
      count: Number,
      subcount: Number,
      bgClass: String,
    },
  };
  </script>
  
  <style scoped>
  .card {
    transition: transform 0.2s;
  }
  .card:hover {
    transform: scale(1.05);
  }
  </style>
  