<template>
  <div class="faq-container">
    <h2 class="faq-title">Como usar o Linha Tex</h2>
    <p class="faq-subtitle">
      Guia rápido para as ações mais comuns no sistema
    </p>

    <div class="faq-list">
      <div 
        class="faq-item" 
        v-for="(item, index) in faqs" 
        :key="index"
        @click="toggle(index)"
      >
        <div class="faq-question">
          <span>{{ item.pergunta }}</span>
          <span class="icon">
            {{ activeIndex === index ? '-' : '+' }}
          </span>
        </div>

        <transition name="fade">
          <div 
            v-if="activeIndex === index" 
            class="faq-answer"
          >
            <p v-html="item.resposta"></p>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const activeIndex = ref(null)

const toggle = (index) => {
  activeIndex.value = activeIndex.value === index ? null : index
}

const faqs = ref([
  {
    pergunta: 'Como registrar a produção de um funcionário?',
    resposta: `
      Acesse o <strong>menu lateral</strong> e clique em <strong>Funcionários</strong>.<br><br>
      Selecione o funcionário desejado e registre a produção informando a etapa, quantidade e tempo.<br><br>
      Tudo é feito direto no sistema, substituindo anotações em papel.
    `
  },
  {
    pergunta: 'Posso registrar mais de uma produção no mesmo horário?',
    resposta: `
      Sim. O Linha Tex permite registrar <strong>mais de uma produção na mesma hora</strong>, 
      desde que sejam <strong>etapas diferentes</strong>.<br><br>
      Isso é ideal para casos onde o funcionário atua em múltiplas atividades.
    `
  },
  {
    pergunta: 'Como visualizar relatórios de produção?',
    resposta: `
      Vá até <strong>Funcionários</strong>, selecione o profissional e clique em <strong>"Ver mais"</strong>.<br><br>
      Lá você terá acesso aos dados detalhados, incluindo produção, desempenho e eficiência.
    `
  },
  {
    pergunta: 'Como adicionar uma nova OP (Ordem de Produção)?',
    resposta: `
      Acesse a opção <strong>"Adicionar OP"</strong> no sistema.<br><br>
      Preencha as informações necessárias como modelo, etapas e tempos.<br><br>
      Após isso, a OP já estará disponível para uso na produção.
    `
  },
  {
    pergunta: 'Existe uma forma mais rápida de cadastrar várias OPs?',
    resposta: `
      Sim. Você pode utilizar nossa planilha padrão para cadastro em lote.<br><br>
      Basta preencher os dados e importar no sistema.<br><br>
      👉 <a href="#" target="_blank">Baixar planilha de cadastro</a>
    `
  },
  {
    pergunta: 'Preciso usar papel ou caderno?',
    resposta: `
      Não. O Linha Tex foi criado para substituir totalmente o controle manual.<br><br>
      Todas as informações ficam registradas digitalmente e organizadas automaticamente.
    `
  },
  {
    pergunta: 'Consigo acompanhar a produção em tempo real?',
    resposta: `
      Sim. O sistema atualiza os dados em tempo real, permitindo ao gestor identificar 
      produtividade, atrasos e gargalos imediatamente.
    `
  },
  {
    pergunta: 'O que acontece se eu errar um lançamento?',
    resposta: `
      Você pode corrigir ou ajustar os dados diretamente no sistema, garantindo 
      que as informações fiquem sempre atualizadas e confiáveis.
    `
  }
])
</script>

<style scoped>
.faq-container {
  padding: 24px;
  max-width: 720px;
  margin: auto;
}

.faq-title {
  font-size: 26px;
  font-weight: 700;
}

.faq-subtitle {
  color: #666;
  margin-bottom: 20px;
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.faq-item {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 16px;
  cursor: pointer;
  background: #fff;
  transition: all 0.2s ease;
}

.faq-item:hover {
  border-color: #3b82f6;
  transform: translateY(-1px);
}

.faq-question {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
}

.icon {
  font-size: 18px;
}

.faq-answer {
  margin-top: 12px;
  color: #555;
  font-size: 14px;
  line-height: 1.5;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>