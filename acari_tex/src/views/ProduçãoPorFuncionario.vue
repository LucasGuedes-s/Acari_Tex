<template>
    <Sidebar />
    <main class="content-wrapper flex-grow-1">
        <div class="container-fluid">
            <div class="row justify-content-center mt-2">
                <div class="form col-12 col-md-10 col-lg-8">
                    <TituloSubtitulo titulo="Produção por Funcionário"
                        subtitulo="Visualize a produção diária de cada funcionário" icone="fa-solid fa-chart-bar" />
                    <GraficoProducao :email-funcionario="emailFuncionario" />
                </div>
            </div>
        </div>
    </main>
</template>
<script>
import GraficoProducao from '@/components/ProducaoPorFuncionario.vue'
import Sidebar from '@/components/Sidebar.vue';
import TituloSubtitulo from '@/components/TituloSubtitulo.vue';
export default {
    name: 'ProducaoPorFuncionario',
    components: {
        GraficoProducao,
        Sidebar,
        TituloSubtitulo
    },
    props: {
        emailFuncionario: {
            type: String,
            default: ''
        }
    },
}
</script>
<style scoped>
.content-wrapper {
    padding-left: 200px;
    width: 100%;
}

.d-flex {
    display: flex;
    flex-direction: row;
    height: 100vh;
}

.form {
    width: 100%;
}

.content-wrapper {
    flex-grow: 1;
    padding-left: 200px;
    width: 100%;
}
</style>