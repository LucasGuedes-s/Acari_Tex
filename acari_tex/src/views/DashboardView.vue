<template>
    <SidebarNav />
    <NavBarUser class="d-none d-md-block" />
    <div class="container my-3">
    <div class="row">
      <div 
        class="col-12 col-sm-6 col-md-3 mb-3" 
        v-for="(item, index) in data" 
        :key="index"
      >
        <div :class="`card border-0 shadow h-100 text-center bg-${item.bgColor}`">
          <div class="card-body">
            <div class="d-flex justify-content-center align-items-center mb-3">
              <i :class="item.icon" style="font-size: 2rem;"></i>
            </div>
            <h3 class="card-title mb-1">{{ item.count }}</h3>
            <p class="card-text">{{ item.label }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SidebarNav from '@/components/Sidebar.vue';
import Axios from 'axios'
import Swal from 'sweetalert2'
import NavBarUser from '@/components/NavBarUser.vue';

export default {
  name: 'Dashbboard-home',
  data() {
    return {
      id: 1,
      estoque: null,
      quantidadeDeTecidos: null,
      showModalProduto: false,
      tarefas: null,
      tarefa: null,
      notas: null,
      nova_data: null,
      data: [
        { count: "02", label: "Não iniciadas", icon: "bi bi-kanban", bgColor: "light-pink" },
        { count: "08", label: "Em andamento", icon: "bi bi-graph-up-arrow", bgColor: "light-blue" },
        { count: "06", label: "Concluídas", icon: "bi bi-check-circle", bgColor: "light-green" },
        { count: "12", label: "Aguardando coleta", icon: "bi bi-truck", bgColor: "green" },
      ]
    }
  },

  methods: {
    async postTarefa() {
      await Axios.post("http://localhost:3333/AdicionarTarefa", {
        tarefa: {
          tarefa: this.tarefa,
          notas: this.notas,
        }
      }).then(
        Swal.fire({
          icon: 'success',
          title: 'Tarefa Adicionado!',
          text: 'Sua tarefa foi adicionada com sucesso.',
          timer: 4000,
          timerProgressBar: true,
          showConfirmButton: false
        }),
        this.tarefa = '',
        this.notas = '',
        this.getTarefas(),
      ).catch(error => {
        console.error(error)
      })
    },
    async alterarStatus(id_tarefa) {
      const confirmResult = await Swal.fire({
        title: 'Marcar como concluído?',
        text: 'Tem certeza que deseja marcar como concluído?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sim',
        cancelButtonText: 'Cancelar'
      });
      if (confirmResult.isConfirmed) {
        await Axios.post(`http://localhost:3333/Tarefas/Status/${id_tarefa}`)
          .then(response => {
            console.log(response.status)
            this.getTarefas(),
              Swal.fire({
                icon: 'success',
                title: 'Tarefa Concluida!',
                text: 'Sua tarefa foi concluida com sucesso.',
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false
              })
          })
          .catch(error => {
            console.error(error);
          });
      }
      else if (confirmResult.dismiss === Swal.DismissReason.cancel) {
        console.log('Cancelado')
      }
    }
  },
  components: {
    SidebarNav,
    NavBarUser
  }


}
</script>

<style scoped>
.container{
  margin-left: 200px;
}
.row{
  margin-top: 100px;
}
.bg-light-pink {
  background-color: #fdecef;
}
.bg-light-blue {
  background-color: #e8f9fd;
}
.bg-light-green {
  background-color: #e6fbe9;
}
.bg-green {
  background-color: #d1f5d3;
}
.card-title {
  font-size: 1.5rem;
  font-weight: bold;
}
@media screen and (max-width: 600px) {
  .container{
    width: 50%;
  }
}
</style>
