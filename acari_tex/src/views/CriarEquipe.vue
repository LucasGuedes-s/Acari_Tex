<template>
  <div class="d-flex flex-column flex-md-row">
    <Sidebar class="flex-shrink-0" />

    <main class="content-wrapper flex-grow-1">
      <div class="container-fluid my-4 mt-md-0 mt-3">
        <div class="row justify-content-center mt-3">
          <div class="col-12">
            <TituloSubtitulo
              titulo="Cadastro de Nova Equipe"
              subtitulo="Crie uma equipe, adicione descrição e escolha os profissionais."
            />

            <div class="card shadow-sm section p-4">
              <div class="d-flex align-items-start gap-3 mb-3">
                <div class="ms-auto">
                  <span class="badge-count">{{ selectedEmployees.length }}</span>
                </div>
              </div>

              <form @submit.prevent="cadastrarEquipe" class="mt-3">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label fw-600">Nome da equipe</label>
                    <input v-model="novaEquipe.nome" class="form-control input-lg" placeholder="Ex: Equipe Produção" required />
                  </div>

                  <div class="col-md-6">
                    <label class="form-label fw-600">Descrição</label>
                    <input v-model="novaEquipe.descricao" class="form-control" placeholder="Descrição curta (opcional)" />
                  </div>
                </div>

                <div class="dualbox row mt-4">
                  <!-- Disponíveis -->
                  <div class="col-md-5">
                    <label class="form-label fw-600">Disponíveis</label>
                    <div class="card listcard p-2">
                      <select
                        multiple
                        size="10"
                        class="form-select listbox"
                        v-model="selectedAvailableIds"
                        @dblclick="addSelected"
                      >
                        <option
                          v-for="emp in availableEmployees"
                          :key="emp.id"
                          :value="emp.id"
                        >
                          {{ emp.nome }} — <small class="text-muted">{{ emp.funcao || '—' }}</small>
                        </option>
                      </select>
                    </div>
                  </div>

                  <!-- Controls -->
                  <div class="col-md-2 d-flex flex-column align-items-center justify-content-center gap-2 controls-col">
                    <button type="button" class="btn btn-sm btn-outline-primary w-100" :disabled="!selectedAvailableIds.length" @click="addSelected" title="Adicionar selecionados">››</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary w-100" :disabled="!availableEmployees.length" @click="addAll" title="Adicionar todos">Todos →</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary w-100" :disabled="!selectedEmployees.length" @click="removeAll" title="Remover todos">← Todos</button>
                    <button type="button" class="btn btn-sm btn-outline-danger w-100" :disabled="!selectedChosenIds.length" @click="removeSelected" title="Remover selecionados">‹‹</button>
                  </div>

                  <!-- Selecionados -->
                  <div class="col-md-5">
                    <label class="form-label fw-600">Selecionados</label>
                    <div class="card listcard p-2">
                      <select
                        multiple
                        size="10"
                        class="form-select listbox"
                        v-model="selectedChosenIds"
                        @dblclick="removeSelected"
                      >
                        <option
                          v-for="emp in selectedEmployees"
                          :key="emp.id"
                          :value="emp.id"
                        >
                          {{ emp.nome }} — <small class="text-muted">{{ emp.funcao || '—' }}</small>
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                <div class="mt-3 d-flex justify-content-end gap-2">
                  <button type="button" class="btn btn-outline-secondary" @click="resetForm">Limpar</button>
                  <button type="submit" class="btn btn-primary btn-lg">Cadastrar Equipe</button>
                </div>
              </form>
            </div>

          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import TituloSubtitulo from '@/components/TituloSubtitulo.vue'
import api from '@/Axios'
import Swal from 'sweetalert2'
import { useAuthStore } from '@/store/store'

const store = useAuthStore()

const availableEmployees = ref([])
const selectedEmployees = ref([])
const selectedAvailableIds = ref([])
const selectedChosenIds = ref([])

const novaEquipe = ref({
  nome: '',
  descricao: '',
  funcionarios: []
})

// Fetch funcionários
onMounted(async () => {
  try {
    const token = store.pegar_token
    const res = await api.get('/Funcionarios', { headers: { Authorization: token } })
    const list = (res.data && (res.data.funcionarios || res.data)) || []
    availableEmployees.value = list.map(f => ({
      id: f.id ?? f.email, // fallback
      nome: f.nome ?? f.email,
      funcao: f.funcao ?? f.funcoes ?? ''
    }))
  } catch (err) {
    console.error('Erro ao carregar funcionários', err)
    Swal.fire('Erro', 'Não foi possível carregar os funcionários', 'error')
  }
})

function addSelected() {
  const ids = Array.from(selectedAvailableIds.value)
  ids.forEach(id => {
    const idx = availableEmployees.value.findIndex(e => e.id === id)
    if (idx !== -1) {
      const [emp] = availableEmployees.value.splice(idx, 1)
      if (!selectedEmployees.value.find(e => e.id === emp.id)) selectedEmployees.value.push(emp)
    }
  })
  // limpa seleção
  selectedAvailableIds.value = []
}

function removeSelected() {
  const ids = Array.from(selectedChosenIds.value)
  ids.forEach(id => {
    const idx = selectedEmployees.value.findIndex(e => e.id === id)
    if (idx !== -1) {
      const [emp] = selectedEmployees.value.splice(idx, 1)
      if (!availableEmployees.value.find(e => e.id === emp.id)) availableEmployees.value.push(emp)
    }
  })
  selectedChosenIds.value = []
}

function addAll() {
  availableEmployees.value.forEach(emp => {
    if (!selectedEmployees.value.find(e => e.id === emp.id)) selectedEmployees.value.push(emp)
  })
  availableEmployees.value = []
  selectedAvailableIds.value = []
}

function removeAll() {
  selectedEmployees.value.forEach(emp => {
    if (!availableEmployees.value.find(e => e.id === emp.id)) availableEmployees.value.push(emp)
  })
  selectedEmployees.value = []
  selectedChosenIds.value = []
}

function resetForm() {
  novaEquipe.value.nome = ''
  novaEquipe.value.descricao = ''
  selectedEmployees.value.forEach(emp => {
    if (!availableEmployees.value.find(e => e.id === emp.id)) availableEmployees.value.push(emp)
  })
  selectedEmployees.value = []
  selectedAvailableIds.value = []
  selectedChosenIds.value = []
}

async function cadastrarEquipe() {
  try {
    if (!novaEquipe.value.nome.trim()) {
      Swal.fire('Atenção', 'Preencha o nome da equipe.', 'warning')
      return
    }

    Swal.fire({ title: 'Cadastrando equipe...', allowOutsideClick: false, didOpen: () => Swal.showLoading() })

    novaEquipe.value.funcionarios = selectedEmployees.value.map(e => e.id)
    const token = store.pegar_token
    console.log('Enviando equipe:', novaEquipe.value)
    const res = await api.post('/funcionario/grupo', novaEquipe.value, { headers: { Authorization: token } })

    Swal.close()
    if (res.status === 201 || res.status === 200) {
      Swal.fire({ icon: 'success', title: 'Equipe cadastrada!', timer: 1500, showConfirmButton: false })
      resetForm()
    } else {
      Swal.fire('Erro', 'Não foi possível cadastrar a equipe.', 'error')
    }
  } catch (err) {
    Swal.close()
    console.error('Erro cadastrar equipe', err)
    Swal.fire('Erro', 'Não foi possível cadastrar a equipe.', 'error')
  }
}
</script>

<style scoped>
.content-wrapper {
  padding-left: 200px;
  width: 100%;
  min-height: 100vh;
}
label{
  display: flex;
}
.section {
  border-radius: 10px;
  background: #ffffff;
  padding: 20px;
}

/* Title styles */
.section-title {
  font-size: 1.25rem;
  color: var(--verde-escuro); 
  font-weight: 700;
}

.listcard {
  background: #fbfdfb;
  border-radius: 8px;
  border: 1px solid #e6efe6;
  height: 100%;
}

.listbox {
  width: 100%;
  height: 320px;
  border: none;
  background: transparent;
  padding: 8px;
  font-size: 0.95rem;
  outline: none;
}

.controls-col .btn {
  min-width: 100%;
  padding: 8px 6px;
}

.badge-count {
  display: inline-block;
  background: rgba(0,105,43,0.12);
  color: #00692b;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.95rem;
}

/* Form inputs */
.input-lg {
  padding: 12px;
  font-size: 1rem;
  border-radius: 8px;
  border: 1px solid #e6efe6;
  background: #fff;
}

.btn-primary {
  background: var(--verde-escuro);
  border-color: #00692b;
  box-shadow: 0 2px 6px rgba(0,105,43,0.08);
}
.btn-outline-primary {
  color: var(--verde-escuro);
  border-color: #cfe9d8;
  background: #fff;
}

/* Responsiveness */
@media (max-width: 992px) {
  .content-wrapper { padding-left: 0; }
  .listbox { height: 200px; }
  .container { padding: 0 12px; }
}

/* Small improvements */
.form-label { font-weight: 700; color: #3b3b3b; }
.text-muted { color: #6b6b6b !important; }
</style>
