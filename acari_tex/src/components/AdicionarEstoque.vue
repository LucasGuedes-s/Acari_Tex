<template>
    <div>
        <div>
            <button class="botao" type="submit" @click="showModal = true">Adicionar Tecido</button>
        </div>
        <div v-if="showModal" class="modal-background">
            <img class = "img-close" @click="showModal = false" src="@/assets/close.png" />
            <div class="modal-content">
                <form class="form-container" method="POST"> <!-- Formulário de cadastro de produto-->
                    <!-- O usuário define o produto-->
                    <div class="form-item">
                        <label>Produto:</label>
                        <input type="text" placeholder="Produto" v-model="produto">
                    </div>
                    <!-- O usuário define o valor do produto -->
                    <div class="form-item">
                        <label>Valor:  </label>
                        <input type="number" placeholder="Ex: 4,99" v-model="valor">
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>
<script>
    export default{
        data(){
            return{
                showModal: false,
            }
        },
        methods:{
            async Adicionar(){
                console.log('Cheguei aqui!!')
            }
        }
    }
    
</script>
<style scoped>
    .botao{
        padding: auto;
        margin: auto;
        background-color: #00692b;
        color: #fff;
        height: 40px;
        box-sizing: border-box;
        border-radius: 25px;
        border: none;
    }
    .modal-background {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 999;
    }
    /* Estilo para a div de conteúdo do modal */
    .modal-content {
      background-color: #fff;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.5);
      max-width: 500px;
      width: 100%;
    }
</style>