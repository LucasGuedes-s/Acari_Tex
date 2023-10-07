<template>
  <div>
    <h1>Calendário</h1>
    <VCalendar />

  </div>
</template>

<script>
import VCalendar from 'v-calendar';

export default {
  name: 'CalendarioVue',
  components: {
    VCalendar, // Registre o componente VCalendar
  },
}
</script>
