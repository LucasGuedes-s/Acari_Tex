<template>
  <!-- <h1>Gráficos</h1>-->
  <div class="conteiner-graficos">
    <GChart :type="chartType" :data="chartData" :options="chartOptions" :width="chartWidth" :height="chartHeight"/>
  </div>

  <div class="conteiner-graficos">
    <GChart :type="chartType2" :data="chartData" :options="chartOptions" :width="chartWidth" :height="chartHeight"/>
  </div>
</template>

<script>
import { GChart } from 'vue-google-charts'

export default {
  name:'Graficos-Vue',  
  data () {
    return {
      estoque: 482,
      quantidadeDeTecidos: null,
      chartType: 'PieChart',
      chartType2: 'ColumnChart',
      // Array will be automatically processed with visualization.arrayToDataTable function
      chartData: [
      ['Task', 'Hours per Day'],
      ['Tecidos', 84],
      ['Agulhas', 2],
      ['Funcionários', 7],
    ],
      chartOptions: {
        title: 'Vendas por Mês',
        chartArea: { width: '80%', height: '80%' }, // Ajuste o tamanho da área do gráfico
        legend: { position: 'right' },   
        //backgroundColor: '#fffffff',    
        backgroundColor: 'transparent',
        hAxis: { title: 'Mês' },
        vAxis: { title: 'Vendas' },
      },
      chartWidth: 100, // Defina a largura desejada em pixels
      chartHeight: 100, // Defina a altura desejada em pixels
    }
  },
  
  components: {
    GChart
  },
  methods:{}
}
</script>
<style>
.chart-container {
  width: 100%;
  height: 500px;
}
.conteiner-graficos{
  width: 50%;
  border-radius: 20px;
  display: flex;
  margin: 20px auto 20px;
  align-items: center;
  justify-content: center;
  background-color: #ffff;
}
</style>