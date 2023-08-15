<template>
    <div>
        <div class="conteiner-icons">
            <div class="button-container" @click="showModal = true">
                <span class="tooltip" >Adicionar Tecido</span>
                <img src="@/assets/Adicionar.svg" alt="Adicionar" class="add-button">
            </div>
            <div class="button-container">
                <span class="tooltip" >Gerar relatório</span>
                <img src="@/assets/relatorio.png" alt="Adicionar" class="add-button">
            </div>
        </div>
        <div v-if="showModal" class="modal-background">
            <img class = "img-close" @click="showModal = false" src="@/assets/close.png" />
            <div class="modal-content">
                <h1>Adicionar tecido</h1>
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
                    <div class="form-item">
                        <label>Fornecedor:  </label>
                        <input type="text" placeholder="Ex: AcariTex" v-model="fornecedor">
                    </div>                    
                    <div class="form-item">
                        <label>Composição:  </label>
                        <input type="text" placeholder="Ex: Algodão" v-model="composicao">
                    </div>
                    <div class="form-item">
                        <label>Estoque:  </label>
                        <input type="number" v-model="estoque">
                    </div>
                    <div class="form-item">
                        <label>Largura:  </label>
                        <input type="number" placeholder="Ex: 4,99" v-model="largura">
                    </div>
                    <div class="form-item">
                        <label>Peso:  </label>
                        <input type="number" v-model="peso">
                    </div>
                    <div class="form-item">
                        <label>Notas:  </label>
                        <input type="text" v-model="notas">
                    </div>
                    <div>
                        <button class="botao" type="submit" @click.prevent="submitForm">Enviar</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>
<script>
import axios from 'axios';
    export default{
        data(){
            return{
                showModal: false,
                showTooltip: false,
                produto: '',
                valor: null,
                fornecedor: '',
                composicao: '',
                estoque: null,
                largura: null,
                peso: null,
                notas: ''
            }
        },
        methods:{
            async emitFunction() {
                this.$emit('getEstoque');
            },
            async submitForm(){
                await axios.post("http://localhost:3333/AdicionarProduto", {   
                    produto: {
                        nome: this.produto,
                        preco: this.valor,
                        fornecedor: this.fornecedor,
                        composicao: this.composicao,
                        estoque: this.estoque,
                        largura: this.largura,
                        peso: this.peso,
                        notas: this.notas,                   
                    }
                }).then(
                    this.$emit('getEstoque'),
                    this.showModal = false,
                )
            }
        }
    }
    
</script>
<style scoped>
    .img-close {
        position: absolute;
        top: 20px;
        right: 20px;
        cursor: pointer;
    }
    .conteiner-icons{
        margin-top: 10%;
        position: absolute;
        right: 5px;
        display: flex;
        flex-direction: column-reverse;
        align-items: flex-end;
        float: right;
    }
    .button-container {
        display: flex;
        align-items: center;
        cursor: pointer;
        float: right;
        padding: 10px;
    }

    .add-button {
        margin-right: 10px; /* Ajuste a margem conforme necessário */
    }

    .button-container img{
        width: 60px;
    }
    .tooltip{
        display: none;
    }
    .button-container:hover{
        .tooltip{
            display: block;

        }
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
    .form-container {
        max-width: 400px;
        margin: 0 auto;
        padding: 20px;
        border-radius: 5px;
    }

    .form-item {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
    }

    .form-item label {
        flex: 1;
        font-weight: bold;
        margin-right: 10px;
        text-align-last: justify;

    }
    .form-item input {
        flex: 2;
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
        outline: none;
    }

    .form-item input[type="number"] {
        width: 100px;
    }

    .form-item input[type="submit"] {
        width: 100%;
        padding: 10px;
        background-color: #007bff;
        color: #fff;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    .form-item input[type="submit"]:hover {
        background-color: #0056b3;
    }
    .botao{
        background-color: #00692b;
        padding: 10px;
        color: #fff;
        border-radius: 5px;
        border: none;
        font-weight: bold;
        text-transform: uppercase;
        font-size: 14px;
    }
</style>