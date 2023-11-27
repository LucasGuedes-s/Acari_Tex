<template>
  <div>
    <div>
      <SidebarNav />
    </div>
    <div class="conteiner-dashboard">
      <div class="conteiner-principal">
        <h1>Seja bem vindo</h1>
        <img src="@/assets/trabalho.png">
      </div>
    </div>
    <div>
      <div class="conteiner">
        <div class="conteiner-quantidade">
          <h1>Estoque de Tecidos</h1>
          <h2>Quantidade: {{ quantidadeDeTecidos }}</h2>
          <div class="button-container">
            <RouterLink to="/EstoqueTecidos"><a class="tooltip">Detalhar</a></RouterLink>
          </div>
        </div>
        <div class="conteiner-quantidade">
          <h1>Estoque de Agulhas</h1>
          <h2>Quantidade: 01</h2>
          <div class="button-container">
            <RouterLink to="/EstoqueAgulhas"><a class="tooltip">Detalhar</a></RouterLink>
          </div>
        </div>
      </div>
      <div class="conteiner-dashboard">
        <div>
          <h1>Tarefas</h1>
          <div class="conteiner-tarefas" v-for="item in tarefas" :key="item.id">
            <div class="tarefa">Tarefa: {{ item.tarefa }}</div>
            <div class="tarefa">Status: {{ item.status }}</div>
            <div class="tarefa">Data: {{ item.data_abertura }}</div>
            <div class="button-container">
              <a class="tooltip" @click="alterarStatus(item.id)" >Concluída</a>
            </div>
          </div>
          <div class="button" >
            <input type="text" placeholder="Tarefa: " v-model="tarefa"> 
            <input type="text" placeholder="Notas: " v-model="notas"> 
            <a class="adicionar" @click="postTarefa()">Adicionar</a>
          </div>
        </div>
      </div>
    </div>
    <div>
      <Calendario />
    </div>
  </div>
</template>
<script>
import SidebarNav from '@/components/Sidebar.vue';
import Axios from 'axios'
import Swal from 'sweetalert2'

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
      ).catch(error =>{
            console.error(error)
        })
    },
    async alterarStatus(id_tarefa){
      const confirmResult = await Swal.fire({
        title: 'Marcar como concluído?',
        text: 'Tem certeza que deseja marcar como concluído?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sim',
        cancelButtonText: 'Cancelar'
      });
      if (confirmResult.isConfirmed) {
        console.log(id_tarefa)
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
      else if (confirmResult.dismiss === Swal.DismissReason.cancel){
        console.log('Cancelado')
      }
    },

    async getEstoque() {
      Axios.get(`http://localhost:3333/tecido/estoque`)
        .then(response => {
          console.log(response.status)
          console.log(response.data.produtos)
          this.estoque = response.data.produtos
          this.quantidadeDeTecidos = this.estoque.length;

          this.$emit(this.quantidadeDeTecidos)
        })
        .catch(error => {
          console.error(error);
        });
    },
    async getTarefas() {
      Axios.get(`http://localhost:3333/Tarefas`)
        .then(response => {
          console.log(response.status)
          console.log(response.data.tarefas)
          this.tarefas = response.data.tarefas
        })
        .catch(error => {
          console.error(error);
        });
    },
  },
  mounted() {
    this.getEstoque();
    this.getTarefas()
  },
  components: {
    SidebarNav,
  }

}
</script>

<style scoped>
.conteiner-tarefas {
  display: flex;
  margin: auto;
  background-color: #e0e0e0;
  border: 1px solid #ddd;
  padding: 10px;
  text-align: center;
  border-radius: 10px;
  margin-bottom: 20px;
  justify-content: space-between;
  align-items: center;
}

.tarefa {
  width: 200px;
}

.conteiner-dashboard {
  background-color: #ffff;
  padding: 10px;
  margin: 10px auto;
  width: 50%;
  border-radius: 20px;
}

.conteiner-principal img {
  width: 150px;
}

.conteiner-principal {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.conteiner h1 {
  display: flex;
  text-align: center;
  justify-content: center;
}

.conteiner {
  display: flex;
  justify-content: center;
}

.conteiner-quantidade {
  background-color: #ffff;
  padding: 20px;
  margin: 5px;
  border-radius: 20px;
}

.conteiner-quantidade img {
  width: 50px;
}

.tooltip {
  display: flex;
  align-items: center;
  cursor: pointer;
  float: right;
  padding: 10px;
  background-color: #00692b;
  text-decoration: none;
  margin: 10px;
  border-radius: 10px;
}

.adicionar {
  display: flex;
  width: 80px;
  align-items: center;
  cursor: pointer;
  padding: 10px;
  background-color: #00692b;
  color: #ddd;
  text-decoration: none;
  border-radius: 10px;
  justify-content: space-around;
}

.button-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  justify-content: space-evenly;
}

.button {
  align-items: center;
  cursor: pointer;
  display: flex;
  justify-content: space-evenly;
}
.button input{
  flex: 2;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  outline: none;
  margin: 5px;
}
.button-container a {
  color: #ffff;
  text-decoration: none;
}

.tooltip {
  align-items: center;
}

@media screen and (max-width: 600px) {
  .tarefa{
    padding: 10px;
  }
  .conteiner-principal {
    display: block;
  }
  
  .conteiner-dashboard {
    background-color: #ffff;
    padding: 10px;
    margin: 10px 85px auto;
    width: 70%;
    border-radius: 20px;
  }

  .conteiner {
    display: flex;
    margin-left: 80px;
    justify-content: center;
    flex-wrap: wrap;
    flex-direction: row-reverse;
  }
  .conteiner-tarefas {
    display: block;
    margin: auto;
    background-color: #e0e0e0;
    border: 1px solid #ddd;
    padding: 10px;
    text-align: center;
    border-radius: 10px;
    margin-bottom: 20px;
  }
  .conteiner-principal img {
    display: none;
    width: 150px;
  }
  .button{
    display: inline-grid;
    align-items: center;
    justify-content: center;
    align-content: space-around;
    justify-items: end;
  }
}

@media screen and (max-width: 900px){
  .tarefa{
    padding: 10px;
  }
  .conteiner-principal {
    display: block;
  }
  
  .conteiner-dashboard {
    background-color: #ffff;
    padding: 15px;
    margin: 10px 85px auto;
    width: 70%;
    border-radius: 20px;
  }

  .conteiner {
    display: flex;
    margin-left: 80px;
    justify-content: center;
    flex-wrap: wrap;
    flex-direction: row-reverse;
  }
  .conteiner-principal img {
    display: none;
    width: 150px;
  }
}

@media screen and (min-width: 1400px){
  .conteiner-quantidade {
    width: 20%;
    background-color: #ffff;
    padding: 20px;
    margin: 5px;
    border-radius: 20px;
  }
}
</style>

  