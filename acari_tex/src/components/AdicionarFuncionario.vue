<template>
    <div>
        <div class="conteiner-icons">
            <div class="button-container" @click="showModal = true">
                <span class="tooltip">Adicionar Funcionario</span>
                <img src="@/assets/Adicionar.svg" alt="Adicionar" class="add-button">
            </div>
        </div>
        <div v-if="showModal" class="modal-background">
            <img class="img-close" @click="showModal = false" src="@/assets/close.png" />
            <div class="modal-content">
                <h1>Adicionar Funcionario</h1>
                <form class="form-container" method="POST"> <!-- Formulário de cadastro de produto-->
                    <div class="form-item">
                        <label>Nome:</label>
                        <input type="text" placeholder="Nome" v-model="nome">
                    </div>
                    <div class="form-item">
                        <label>Idade: </label>
                        <input type="number" placeholder="Ex: 30" v-model="idade">
                    </div>
                    <div class="form-item">
                        <label>Funções: </label>
                        <input type="text" placeholder="Ex: Costureira, Gerente" v-model="funcoes">
                    </div>
                    <div class="form-item">
                        <label>Aniversário: </label>
                        <input type="date" v-model="aniversario">
                    </div>
                    <div class="form-item">
                        <label>Identidade: </label>
                        <input type="number" placeholder="Ex: 15465364 (Sem pontos e traços)" v-model="identidade">
                    </div>
                    <div class="form-item">
                        <label>Imagem: </label>
                        <input type="file" id="imagem" @change="handleFileUpload" required><br><br>
                    </div>
                    <div class="form-item">
                        <label>CPF: </label>
                        <input type="number" placeholder="Ex: 15465364 (Sem pontos e traços)" v-model="cpf">
                    </div>
                    <div class="form-item">
                        <label>Pis: </label>
                        <input type="number" placeholder="Ex: 15465364 (Sem pontos e traços)" v-model="pis">
                    </div>
                    <div class="form-item">
                        <label>PIX: </label>
                        <input type="text" placeholder="PIX para pagamentos" v-model="pix">
                    </div>
                    <div class="form-item">
                        <label>Notas: </label>
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
import Axios from 'axios';
import Swal from 'sweetalert2'
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from '../firebase.js'; // Certifique-se de ajustar o caminho conforme necessário
import 'jspdf-autotable';
import { v4 as uuidv4 } from 'uuid';

export default {
    data() {
        return {
            showModal: false,
            showTooltip: false,
            nome: '',
            idade: null,
            funcoes: '',
            aniversario: '',
            identidade: null,
            cpf: null,
            pis: null,
            pix: null,
            notas: '',
            imagem: null,
        }
    },
    methods: {
        async handleFileUpload(event) {
            this.imagem = event.target.files[0];
        },
        async submitForm() {

            // Gera um identificador único para a imagem
            const uniqueImageName = uuidv4() + '_' + this.imagem.name;

            // Cria uma referência para o armazenamento
            const storageRef = ref(storage, 'uploads/' + uniqueImageName);

            // Faz o upload da imagem
            const snapshot = await uploadBytes(storageRef, this.imagem);

            // Obtém a URL pública da imagem
            const imageUrl = await getDownloadURL(snapshot.ref);

            await Axios.post("http://localhost:3333/AdicionarFuncionario", {
                funcionario: {
                    nome_do_funcionario: this.nome,
                    idade: this.idade,
                    funcoes: this.funcoes,
                    aniversario: this.aniversario,
                    identidade: this.identidade,
                    cpf: this.cpf,
                    pis: this.pis,
                    pix: this.pix,
                    notas: this.notas,
                    foto: imageUrl
                }
            }).then(
                this.showModal = false,
                Swal.fire({
                    icon: 'success',
                    title: 'Funcionário Adicionado!',
                    text: 'Seu funcionário foi adicionado com sucesso.',
                    timer: 2000,
                    timerProgressBar: true,
                    showConfirmButton: false
                })
            ).catch(error => {
                console.log(error)
                Swal.fire({
                    icon: 'error',
                    title: 'Funcionário não adicionado!',
                    text: 'Seu funcionário não foi adicionado',
                    timer: 2000,
                    timerProgressBar: true,
                    showConfirmButton: false
                })
            }

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

.conteiner-icons {
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
    margin-right: 10px;
}

.button-container img {
    width: 60px;
}

.tooltip {
    display: none;
}

.button-container:hover {
    .tooltip {
        display: block;
        background-color: #ffffff;
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

.botao {
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