<template>
  <div class="detalhes-pecas-page">
    <SidebarNav />
    <carregandoTela v-if="loading" />

    <main v-else class="content-wrapper flex-grow-1">
      <div class="container-fluid py-4">
        <TituloSubtitulo
          titulo="Relatório de Eficiência"
          subtitulo="Acompanhe o desempenho produtivo das turmas"
        />
        <div class="card p-4 mt-4">
          <GraficoEficiencia />
        </div>
    </div>
    </main>   
  </div>
</template>

<script>
import SidebarNav from '@/components/Sidebar.vue';
import TituloSubtitulo from '@/components/TituloSubtitulo.vue';
import carregandoTela from '@/components/carregandoTela.vue';
import GraficoEficiencia from '@/components/GraficoEficiencia.vue';

export default {
  name: 'RelatorioEficiencia',
  components: { SidebarNav, TituloSubtitulo, carregandoTela, GraficoEficiencia },
};
</script>

<style scoped>
.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
}

.card h6 {
  font-size: 0.9rem;
}

.card h4 {
  color: var(--verde-escuro);
}

.text {
  color: var(--verde-escuro);
}

@media (max-width: 768px) {
  .content-wrapper {
    padding-left: 0;
  }
}
</style>
