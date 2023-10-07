<template>
  <h1>Gráficos</h1>
  <div style="width: 1500px; height: 300px; ">
    <GChart :type="chartType" :data="chartData" :options="chartOptions" :width="chartWidth" :height="chartHeight" />
  </div>
  
</template>

<script>import { GChart } from 'vue-google-charts'

export default {
  data () {
    return {
      chartType: 'PieChart',
      // Array will be automatically processed with visualization.arrayToDataTable function
      chartData: [
      ['Task', 'Hours per Day'],
      ['Work', 11],
      ['Eat', 2],
      ['Commute', 2],
      ['Watch TV', 2],
      ['Sleep', 7],
    ],
      chartOptions: {
        title: 'Vendas por Mês',
        chartArea: { width: '70%', height: '40%' }, // Defina a largura e a altura desejadas aqui
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
  }
}
</script>
