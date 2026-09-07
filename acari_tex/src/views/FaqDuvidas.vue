<template>
  <div class="faq-page">
    <main class="faq-content">
      <!-- HERO -->
      <header class="hero-section">
        <div class="hero-inner">
          <div class="hero-icon">📚</div>
          <h1 class="hero-title">Central de Ajuda Linha Tex</h1>
          <p class="hero-subtitle">
            Encontre rapidamente respostas sobre produção, eficiência e gestão da sua fábrica.
          </p>
          <div class="article-count">{{ faqItems.length }} artigos disponíveis</div>
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              v-model="busca"
              type="text"
              placeholder="Pesquise uma dúvida..."
              class="search-input"
              @input="onSearch"
            />
            <button v-if="busca" class="search-clear" @click="limparBusca">✕</button>
          </div>
        </div>
      </header>

      <!-- POPULAR -->
      <section v-if="!busca && !categoriaAtiva" class="popular-section">
        <h2 class="section-title">⭐ Perguntas populares</h2>
        <div class="popular-grid">
          <button v-for="item in perguntasPopulares" :key="item.id" class="popular-card" @click="abrirPerguntaPopular(item)">
            <span class="popular-text">{{ item.pergunta }}</span>
            <span class="popular-arrow">→</span>
          </button>
        </div>
      </section>

      <!-- CATEGORIES -->
      <section class="categories-section">
        <div class="categories-scroll">
          <button class="cat-pill" :class="{ active: !categoriaAtiva && !busca }" @click="categoriaAtiva = null">📋 Todas</button>
          <button v-for="cat in categorias" :key="cat.id" class="cat-pill" :class="{ active: categoriaAtiva === cat.id }" @click="alternarCategoria(cat.id)">{{ cat.icone }} {{ cat.nome }}</button>
        </div>
      </section>

      <!-- EFFICIENCY SPOTLIGHT -->
      <section v-if="!busca && !categoriaAtiva" class="efficiency-spotlight">
        <h2 class="section-title">📈 Como o Linha Tex calcula a eficiência?</h2>
        <div class="formula-card">
          <div class="formula-header"><span class="formula-badge">Fórmula oficial</span></div>
          <div class="formula-body">
            <div class="formula-main">Eficiência (%) = ( Peças Produzidas × SAM × 100 ) ÷ ( Funcionários × Tempo Trabalhado )</div>
            <div class="formula-terms">
              <div class="term"><strong>SAM</strong> = Tempo de Referência do funcionário para a etapa, ou quando não houver, o Tempo Padrão da Ficha Técnica.</div>
              <div class="term"><strong>Peças Produzidas</strong> = Quantidade de peças registradas no período.</div>
              <div class="term"><strong>Tempo Trabalhado</strong> = Minutos efetivamente trabalhados no período.</div>
              <div class="term"><strong>Funcionários</strong> = Quantidade de funcionários envolvidos no cálculo.</div>
            </div>
          </div>
          <div class="example-box">
            <h4 class="example-title">💡 Exemplo prático</h4>
            <div class="example-grid">
              <div class="example-step"><div class="step-label">Peças produzidas</div><div class="step-value">100 peças</div></div>
              <div class="example-step"><div class="step-label">SAM (tempo de referência)</div><div class="step-value">0,50 min/peça</div></div>
              <div class="example-step"><div class="step-label">Tempo trabalhado</div><div class="step-value">60 minutos</div></div>
              <div class="example-step highlight"><div class="step-label">Cálculo</div><div class="step-value">100 × 0,50 = 50 min de produção</div></div>
              <div class="example-step highlight"><div class="step-label">Resultado</div><div class="step-value">50 ÷ 60 × 100 = <strong>83,33%</strong></div></div>
            </div>
          </div>
        </div>
      </section>

      <!-- FAQ LIST -->
      <section class="faq-section">
        <h2 v-if="categoriaAtiva && !busca" class="section-title">{{ categoriaNomeAtual }}</h2>
        <h2 v-else-if="busca" class="section-title">Resultados da busca ({{ itensFiltrados.length }})</h2>
        <h2 v-else class="section-title">Todas as perguntas</h2>
        <div v-if="itensFiltrados.length === 0" class="empty-state">
          <div class="empty-icon">🔎</div>
          <p>Nenhum resultado encontrado para "<strong>{{ busca }}</strong>"</p>
          <button class="btn-clear" @click="limparBusca">Limpar busca</button>
        </div>
        <div class="faq-list">
          <div v-for="item in itensFiltrados" :key="item.id" class="faq-item" :class="{ open: itensAbertos.has(item.id) }">
            <button class="faq-question" @click="toggleItem(item.id)">
              <div class="faq-question-left">
                <span class="faq-cat-badge">{{ obterCatBadge(item.categoria) }}</span>
                <span class="faq-question-text">{{ item.pergunta }}</span>
              </div>
              <span class="faq-chevron" :class="{ open: itensAbertos.has(item.id) }">›</span>
            </button>
            <transition name="accordion">
              <div v-if="itensAbertos.has(item.id)" class="faq-answer"><div v-html="item.resposta"></div></div>
            </transition>
          </div>
        </div>
      </section>

      <!-- SUPPORT -->
      <section class="support-section">
        <div class="support-card">
          <div class="support-icon">🛠️</div>
          <h3>Precisa de ajuda?</h3>
          <p>Se não encontrou sua dúvida nesta página, entre em contato com o suporte do Linha Tex.</p>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'

const categorias = [
  { id: 'producao', nome: 'Produção', icone: '📊' },
  { id: 'eficiencia', nome: 'Eficiência', icone: '📈' },
  { id: 'funcionarios', nome: 'Funcionários', icone: '👥' },
  { id: 'fichas', nome: 'Fichas e OPs', icone: '📋' },
  { id: 'tempos', nome: 'Tempos e capacidade', icone: '⏱️' },
  { id: 'relatorios', nome: 'Relatórios', icone: '📄' },
  { id: 'sistema', nome: 'Sistema', icone: '⚙️' },
  { id: 'outros', nome: 'Outros', icone: '❓' },
]

const categoriaAtiva = ref(null)
const busca = ref('')
const itensAbertos = reactive(new Set())

function alternarCategoria(catId) {
  categoriaAtiva.value = categoriaAtiva.value === catId ? null : catId
  busca.value = ''
}
function toggleItem(id) {
  if (itensAbertos.has(id)) itensAbertos.delete(id)
  else itensAbertos.add(id)
}
function onSearch() { if (busca.value) categoriaAtiva.value = null }
function limparBusca() { busca.value = '' }
function obterCatBadge(catId) {
  const cat = categorias.find(c => c.id === catId)
  return cat ? cat.icone : '❓'
}
const categoriaNomeAtual = computed(() => {
  const cat = categorias.find(c => c.id === categoriaAtiva.value)
  return cat ? `${cat.icone} ${cat.nome}` : 'Todas as perguntas'
})

const perguntasPopularesIds = ['eficiencia-formula', 'por-que-eficiencia-diferente', 'o-que-capacidade', 'como-funciona-meta']

const faqItems = ref([
  {
    id: 'como-registrar-producao', categoria: 'producao', pergunta: 'Como registrar uma produção?',
    resposta: `<p>Para registrar uma produção, siga estes passos:</p><ol><li>Acesse o menu lateral e clique em <strong>"Registrar Prod."</strong>.</li><li>Selecione o <strong>funcionário</strong> que realizou o trabalho.</li><li>Escolha a <strong>peça/OP</strong> (Ordem de Produção) correspondente.</li><li>Selecione a <strong>etapa</strong> do processo que foi realizada.</li><li>Informe a <strong>quantidade de peças</strong> produzidas.</li><li>Confirme ou defina a <strong>hora do registro</strong>.</li><li>Não é necessário clicar em "Registrar".</li></ol><p>O sistema salvará a produção vinculada ao funcionário, à OP e à etapa selecionada automaticamente.</p>`
  },
  {
    id: 'o-que-producao', categoria: 'producao', pergunta: 'O que significa "Produção"?',
    resposta: `<p>No Linha Tex, <strong>Produção</strong> representa a quantidade de peças registradas (produzidas) por um funcionário em determinado período.</p><p>Cada registro de produção é composto por:</p><ul><li><strong>Funcionário</strong> – quem realizou o trabalho.</li><li><strong>Peça/OP</strong> – a ordem de produção sendo executada.</li><li><strong>Etapa</strong> – a fase do processo (ex: Costura, Acabamento, Revisão).</li><li><strong>Quantidade</strong> – quantas peças foram produzidas.</li><li><strong>Hora</strong> – quando foi registrado.</li></ul>`
  },
  {
    id: 'producao-para-diferentes-funcionarios', categoria: 'producao', pergunta: 'Posso registrar produção para diferentes funcionários?',
    resposta: `<p><strong>Sim!</strong> A produção é sempre vinculada ao funcionário que realizou o trabalho.</p><p>Cada funcionário pode ter sua própria produção registrada na mesma OP, etapa ou período diferente.</p><p>Isso permite que você acompanhe a produtividade individual de cada profissional.</p>`
  },
  {
    id: 'o-que-acontece-selecionar-funcionario', categoria: 'producao', pergunta: 'O que acontece quando seleciono um funcionário?',
    resposta: `<p>Ao selecionar um funcionário no registro de produção, o sistema considera suas <strong>configurações específicas</strong>, como:</p><ul><li><strong>Tempo de Referência (SAM)</strong> – o tempo que aquele funcionário leva para produzir uma peça naquela etapa.</li><li><strong>Ausências</strong> – se o funcionário estiver ausente em parte do dia, o tempo disponível será ajustado automaticamente.</li></ul><p>Essas configurações influenciam diretamente os cálculos de <strong>eficiência</strong> e <strong>capacidade</strong>.</p>`
  },
  {
    id: 'eficiencia-formula', categoria: 'eficiencia', pergunta: 'Como é calculada a eficiência?',
    resposta: `<p>A eficiência é calculada pela fórmula oficial do sistema:</p><div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:14px 18px;border-radius:8px;margin:12px 0;font-weight:600;font-size:15px;">Eficiência (%) = ( Peças Produzidas × SAM × 100 ) ÷ ( Funcionários × Tempo Trabalhado )</div><p>Onde:</p><ul><li><strong>SAM</strong> = Tempo de Referência do funcionário para aquela etapa. Se não houver referência cadastrada, usa o Tempo Padrão da Ficha Técnica.</li><li><strong>Peças Produzidas</strong> = Quantidade de peças registradas.</li><li><strong>Tempo Trabalhado</strong> = Minutos efetivamente trabalhados no período.</li><li><strong>Funcionários</strong> = Quantidade de funcionários envolvidos.</li></ul><div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:8px;margin:12px 0;"><strong>💡 Exemplo:</strong> Um funcionário produziu <strong>100 peças</strong> com SAM de <strong>0,50 min</strong> em <strong>60 minutos</strong> de trabalho.<br>100 × 0,50 = 50 min de produção equivalente.<br>50 ÷ 60 × 100 = <strong>83,33% de eficiência</strong>.</div><p>Quando o cálculo envolve <strong>várias etapas</strong> (ex: eficiência agregada de uma OP inteira), o sistema soma "peças × SAM" de cada etapa antes de dividir pelo tempo trabalhado total.</p>`
  },
  {
    id: 'eficiencia-ficha-vs-referencia', categoria: 'eficiencia', pergunta: 'Qual a diferença entre Eficiência da Ficha e Eficiência de Referência?',
    resposta: `<p>O Linha Tex calcula dois tipos de eficiência porque pode usar <strong>referências diferentes</strong> para o SAM:</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0;"><div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;"><strong>📊 Eficiência da Ficha</strong><p style="margin-top:6px;font-size:13px;">Utiliza o <strong>Tempo Padrão da Ficha Técnica</strong> (etapa) como SAM para o cálculo.</p></div><div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px;"><strong>📈 Eficiência de Referência</strong><p style="margin-top:6px;font-size:13px;">Utiliza o <strong>Tempo de Referência do funcionário</strong> como SAM, quando disponível.</p></div></div><p>Os dois indicadores podem apresentar <strong>valores diferentes</strong> porque utilizam referências diferentes. A Eficiência de Referência é mais precisa porque considera o tempo específico daquele funcionário para aquela etapa.</p>`
  },
  {
    id: 'eficiencia-acima-100', categoria: 'eficiencia', pergunta: 'É possível ter eficiência acima de 100%?',
    resposta: `<p><strong>Sim!</strong> Uma eficiência acima de 100% significa que a produção realizada foi <strong>superior à produção esperada</strong> para aquele tempo e capacidade de referência.</p><div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:12px 16px;border-radius:8px;margin:12px 0;"><strong>Exemplo:</strong><br>Meta equivalente: 100 peças.<br>Produção real: 120 peças.<br>Resultado: aproximadamente <strong>120%</strong> de eficiência (dependendo dos tempos considerados).</div><p>Isso é comum em funcionários experientes ou quando o SAM de referência é mais conservador que o desempenho real.</p>`
  },
  {
    id: 'por-que-eficiencia-diferente', categoria: 'eficiencia', pergunta: 'Por que minha eficiência pode estar diferente do esperado?',
    resposta: `<p>A eficiência pode apresentar um valor diferente do esperado quando houver diferença em qualquer um destes fatores:</p><ol><li><strong>Capacidade/SAM utilizado</strong> – Verifique se o tempo de referência está correto.</li><li><strong>Tempo trabalhado</strong> – O sistema calcula o tempo entre o primeiro e o último registro do dia.</li><li><strong>Produção registrada</strong> – Confira se a quantidade está correta.</li><li><strong>Funcionário selecionado</strong> – Cada funcionário pode ter tempos de referência diferentes.</li><li><strong>Ficha/OP selecionada</strong> – Cada OP pode ter tempos padrão diferentes.</li><li><strong>Referência de capacidade</strong> – Eficiência da Ficha usa o tempo padrão; Eficiência de Referência usa o tempo do funcionário.</li><li><strong>Período analisado</strong> – Mude o período e os valores podem mudar.</li><li><strong>Jornada considerada</strong> – Seg-Qui = 540 min, Sex = 480 min.</li></ol><div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:8px;margin:12px 0;"><strong>💡 Dica:</strong> Antes de comparar duas eficiências, verifique se elas estão utilizando a mesma produção, o mesmo período e a mesma referência de capacidade.</div>`
  },
  {
    id: 'por-que-selecionar-funcionario', categoria: 'funcionarios', pergunta: 'Por que preciso selecionar um funcionário?',
    resposta: `<p>O funcionário é utilizado para:</p><ul><li><strong>Identificar quem realizou</strong> a produção.</li><li>Permitir <strong>análises individuais</strong> de desempenho.</li><li>Considerar as <strong>configurações específicas</strong> do funcionário (como tempo de referência e ausências).</li><li>Gerar <strong>relatórios por funcionário</strong>.</li></ul>`
  },
  {
    id: 'funcionario-influencia-eficiencia', categoria: 'funcionarios', pergunta: 'O funcionário influencia a eficiência?',
    resposta: `<p><strong>Sim!</strong> Quando existem configurações específicas de <strong>Tempo de Referência (SAM)</strong> associadas ao funcionário, ele influencia diretamente o cálculo.</p><p>O sistema verifica a ordem de prioridade do SAM:</p><ol><li><strong>Override manual</strong> – Tempo selecionado manualmente no registro.</li><li><strong>Referência do funcionário para a OP/etapa atual</strong>.</li><li><strong>Referência do funcionário para a mesma etapa em outra OP</strong>.</li><li><strong>Tempo Padrão da Ficha Técnica</strong> – quando não há referência do funcionário.</li></ol>`
  },
  {
    id: 'funcionario-capacidades-diferentes', categoria: 'funcionarios', pergunta: 'Posso ter diferentes capacidades para um mesmo funcionário?',
    resposta: `<p><strong>Sim!</strong> Um mesmo funcionário pode possuir diferentes tempos de referência dependendo da:</p><ul><li><strong>Atividade/etapa</strong> – um funcionário pode ser mais rápido em costura do que em acabamento.</li><li><strong>OP</strong> – diferentes Ordens de Produção podem ter configurações diferentes.</li></ul><p>Quando houver mais de uma referência disponível, o sistema sempre considera a referência <strong>mais recente</strong> e correspondente à configuração selecionada pelo usuário.</p>`
  },
  {
    id: 'o-que-e-op', categoria: 'fichas', pergunta: 'O que é uma OP (Ordem de Produção)?',
    resposta: `<p><strong>OP</strong> significa <strong>Ordem de Produção</strong>. É o documento que identifica e acompanha determinada produção.</p><p>Cada OP contém:</p><ul><li><strong>Descrição/Nome</strong> – identificação da peça.</li><li><strong>Quantidade</strong> – total de peças a serem produzidas.</li><li><strong>Etapas</strong> – fases do processo de fabricação.</li><li><strong>Tempo padrão</strong> – tempo de referência para cada etapa.</li></ul>`
  },
  {
    id: 'o-que-e-ficha', categoria: 'fichas', pergunta: 'O que é uma ficha?',
    resposta: `<p>A <strong>ficha</strong> (ou ficha técnica) reúne todas as informações necessárias para controlar determinada produção.</p><p>Ela é composta por:</p><ul><li><strong>Descrição da peça</strong></li><li><strong>Quantidade planejada</strong></li><li><strong>Etapas de produção</strong> (ex: Costura, Acabamento, Revisão)</li><li><strong>Tempo padrão</strong> de cada etapa (em minutos por peça)</li></ul>`
  },
  {
    id: 'varias-ops', categoria: 'fichas', pergunta: 'Posso ter várias OPs?',
    resposta: `<p><strong>Sim!</strong> Você pode criar quantas OPs forem necessárias. Cada OP representa uma produção independente.</p><p>Para criar uma nova OP, acesse <strong>"Adicionar OP"</strong> no menu lateral ou utilize a importação em lote pelo sistema.</p>`
  },
  {
    id: 'op-eficiencia-diferente', categoria: 'fichas', pergunta: 'Por que uma OP pode apresentar uma eficiência diferente de outra?',
    resposta: `<p>Porque podem existir diferenças em vários fatores:</p><ul><li><strong>Capacidade</strong> – tempos padrão diferentes entre etapas.</li><li><strong>Tempo de referência</strong> – SAM pode variar por funcionário.</li><li><strong>Produção registrada</strong> – quantidades diferentes.</li><li><strong>Tempo trabalhado</strong> – períodos diferentes.</li><li><strong>Operação/etapa</strong> – cada etapa tem seu próprio tempo padrão.</li><li><strong>Funcionário</strong> – profissionais diferentes têm habilidades diferentes.</li><li><strong>Quantidade planejada</strong> – meta de produção diferente.</li></ul>`
  },
  {
    id: 'o-que-tempo-referencia', categoria: 'tempos', pergunta: 'O que é o Tempo de Referência?',
    resposta: `<p>O <strong>Tempo de Referência</strong> (também chamado de SAM) é o tempo em minutos que serve como referência para calcular quanto a produção realizada representa em relação ao tempo trabalhado.</p><p>É o tempo que se espera que um funcionário leve para produzir <strong>uma peça</strong> naquela etapa.</p><p>Exemplo: Se o tempo de referência é <strong>0,50 min</strong>, significa que, em teoria, o funcionário deveria produzir 1 peça a cada 30 segundos.</p>`
  },
  {
    id: 'o-que-tempo-ficha', categoria: 'tempos', pergunta: 'O que é o Tempo da Ficha?',
    resposta: `<p>O <strong>Tempo da Ficha</strong> (ou Tempo Padrão) é o tempo em minutos definido para a ficha técnica de uma peça, para aquela etapa específica.</p><p>Ele é cadastrado quando a OP é criada e representa o tempo padrão esperado de produção.</p><p>Quando não existe Tempo de Referência cadastrado para o funcionário, o sistema usa este tempo como SAM no cálculo da eficiência.</p>`
  },
  {
    id: 'funcionario-varios-tempos', categoria: 'tempos', pergunta: 'Um funcionário pode ter mais de um tempo de referência?',
    resposta: `<p><strong>Sim!</strong> Um mesmo funcionário pode ter diferentes tempos de referência dependendo de:</p><ul><li><strong>Etapa</strong> – cada etapa pode ter um SAM diferente para o mesmo funcionário.</li><li><strong>OP</strong> – diferentes Ordens de Produção podem ter configurações distintas.</li></ul><p>O sistema segue uma <strong>ordem de prioridade</strong> para escolher qual referência usar:</p><ol><li>Override manual selecionado pelo usuário.</li><li>Referência do funcionário para a OP/etapa atual.</li><li>Referência do funcionário para a mesma etapa em outra OP.</li><li>Tempo Padrão da Ficha Técnica (fallback).</li></ol><p>Sempre que houver mais de uma referência disponível, o sistema considera a <strong>mais recente</strong> correspondente à configuração escolhida.</p>`
  },
  {
    id: 'capacidade-o-que-e', categoria: 'tempos', pergunta: 'O que é Capacidade?',
    resposta: `<p><strong>Capacidade</strong> é a quantidade de peças que cabem no tempo trabalhado disponível, no ritmo indicado pelo SAM.</p><div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:12px 16px;border-radius:8px;margin:12px 0;"><strong>Fórmula:</strong> Capacidade = ( Funcionários × Tempo Trabalhado ) ÷ SAM</div><p><strong>Exemplo:</strong> Se um funcionário trabalhou 60 minutos e o SAM é 0,50 min/peça, a capacidade é 60 ÷ 0,50 = <strong>120 peças</strong>.</p>`
  },
  {
    id: 'como-funciona-meta', categoria: 'tempos', pergunta: 'Como a meta de produção é calculada?',
    resposta: `<p>A meta representa a quantidade de peças <strong>esperada</strong> considerando:</p><ul><li><strong>Tempo disponível</strong> para produção (jornada do dia).</li><li><strong>SAM (Capacidade/Tempo de Referência)</strong> da etapa.</li><li><strong>Quantidade de funcionários</strong> trabalhando.</li></ul><div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:12px 16px;border-radius:8px;margin:12px 0;"><strong>Fórmula:</strong> Meta = ( Funcionários × Tempo Disponível ) ÷ SAM</div>`
  },
  {
    id: 'por-que-meta-muda', categoria: 'tempos', pergunta: 'Por que minha meta pode mudar?',
    resposta: `<p>A meta pode mudar por vários motivos:</p><ul><li><strong>Jornada</strong> – Seg-Qui tem 540 minutos; Sexta tem 480 minutos.</li><li><strong>Capacidade/SAM</strong> – alteração no tempo de referência.</li><li><strong>Ficha/OP</strong> – OP diferente pode ter tempos diferentes.</li><li><strong>Período</strong> – alteração do período de análise.</li><li><strong>Ausências</strong> – funcionário com ausência parcial tem menos tempo disponível.</li></ul>`
  },
  {
    id: 'tempo-trabalho', categoria: 'tempos', pergunta: 'Como o Linha Tex considera o tempo de trabalho?',
    resposta: `<p>O sistema define a <strong>quantidade de minutos disponíveis</strong> por dia de semana:</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0;"><div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:24px;font-weight:700;color:#16a34a;">540 min</div><div style="font-size:13px;color:#555;margin-top:4px;">Segunda a Quinta-feira</div></div><div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:24px;font-weight:700;color:#d97706;">480 min</div><div style="font-size:13px;color:#555;margin-top:4px;">Sexta-feira</div></div></div><p><strong>Sábado e Domingo:</strong> 0 minutos (sem jornada).</p><p>O cálculo da eficiência considera o tempo efetivamente utilizado, que é calculado pelo intervalo entre o <strong>primeiro e o último registro</strong> do funcionário no dia, limitado ao tempo máximo disponível.</p><p>Se o funcionário tiver <strong>ausência parcial</strong> (meio período), o sistema desconta automaticamente o tempo ausente do disponível.</p>`
  },
  {
    id: 'quais-relatorios', categoria: 'relatorios', pergunta: 'Quais relatórios posso gerar?',
    resposta: `<p>O Linha Tex permite gerar relatórios a partir da tela de <strong>"Relatórios"</strong>.</p><p>Nos relatórios você encontra informações como:</p><ul><li><strong>Funcionários</strong> – nomes e dados dos profissionais.</li><li><strong>Produção</strong> – quantidades produzidas por OP/etapa.</li><li><strong>Metas</strong> – quanto era esperado vs. produzido.</li><li><strong>Eficiência</strong> – indicadores de desempenho.</li><li><strong>OPs</strong> – status e progresso das Ordens de Produção.</li><li><strong>Períodos</strong> – dados por dia, semana ou período selecionado.</li></ul><p>Os relatórios podem ser exportados em <strong>PDF</strong>.</p>`
  },
  {
    id: 'o-aparece-relatorios', categoria: 'relatorios', pergunta: 'O que aparece nos relatórios?',
    resposta: `<p>Os relatórios apresentam dados consolidados de produção incluindo:</p><ul><li>Descrição das peças/OPs.</li><li>Status (Não iniciada, Em andamento, Concluída).</li><li>Quantidade de peças produzidas.</li><li>Datas de cadastro.</li><li>Eficiência calculada.</li><li>Detalhes por funcionário e etapa.</li></ul><p>Os dados podem ser filtrados por descrição e status para facilitar a busca.</p>`
  },
  {
    id: 'tela-producao-dia', categoria: 'producao', pergunta: 'Como funciona a tela de Produção do Dia?',
    resposta: `<p>A tela de <strong>"Produção geral"</strong> permite acompanhar em tempo real a produção realizada durante o dia.</p><p>Principais informações exibidas:</p><ul><li><strong>Produção total</strong> – soma de peças produzidas por todos os funcionários.</li><li><strong>Meta</strong> – quanto era esperado produzir.</li><li><strong>Eficiência da turma</strong> – desempenho geral da equipe.</li><li><strong>Funcionários</strong> – lista com produção individual de cada um.</li><li><strong>Ficha/OP</strong> – detalhes por Ordem de Produção.</li><li><strong>Capacidade</strong> – tempo de referência considerado.</li></ul><p>A tela atualiza os dados automaticamente quando novos registros de produção são feitos.</p>`
  },
  {
    id: 'informacao-nao-aparece', categoria: 'sistema', pergunta: 'Por que uma informação pode não aparecer imediatamente?',
    resposta: `<p>Em alguns casos, os dados podem demorar para aparecer porque:</p><ul><li>O <strong>servidor</strong> pode estar processando a informação.</li><li>Pode haver um <strong>atraso de sincronização</strong> entre o registro e a consulta.</li><li>Verifique se o <strong>período selecionado</strong> está correto.</li><li>Confirme se o <strong>registro</strong> foi realmente salvo (verifique se aparece mensagem de sucesso).</li></ul><p>Se o problema persistir, aguarde alguns instantes e recarregue a página.</p>`
  },
  {
    id: 'alterar-producao', categoria: 'sistema', pergunta: 'Posso alterar uma produção depois de registrada?',
    resposta: `<p>O sistema permite <strong>corrigir ou ajustar</strong> dados de produção diretamente na tela de registros.</p><p>Se você errou um lançamento, verifique se é possível ajustar a quantidade ou a etapa registrada. Caso não consiga alterar diretamente, entre em contato com o suporte.</p>`
  },
  {
    id: 'producao-errada', categoria: 'outros', pergunta: 'O que faço se minha produção estiver errada?',
    resposta: `<p>Verifique os seguintes itens antes de procurar o suporte:</p><ol><li><strong>Funcionário</strong> – está selecionado o profissional correto?</li><li><strong>Ficha/OP</strong> – a Ordem de Produção está correta?</li><li><strong>Quantidade</strong> – a quantidade registrada está correta?</li><li><strong>Capacidade/SAM</strong> – o tempo de referência está correto?</li><li><strong>Período</strong> – o período selecionado é o correto?</li></ol><p>Se o problema persistir, entre em contato com o suporte do Linha Tex.</p>`
  },
  {
    id: 'eficiencia-errada', categoria: 'outros', pergunta: 'O que faço se minha eficiência estiver errada?',
    resposta: `<p>A eficiência pode estar "errada" — na verdade é uma diferença de expectativa. Verifique:</p><ol><li><strong>Comece pela fórmula</strong> – revise o cálculo passo a passo.</li><li><strong>Verifique o SAM</strong> – qual tempo de referência está sendo usado?</li><li><strong>Verifique o tempo trabalhado</strong> – o intervalo de registro está correto?</li><li><strong>Verifique a produção</strong> – a quantidade está correta?</li><li><strong>Compare Ficha vs Referência</strong> – qual tipo de eficiência você está esperando?</li></ol><div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:8px;margin:12px 0;"><strong>💡 Lembre-se:</strong> Eficiência da Ficha e Eficiência de Referência são <strong>dois indicadores diferentes</strong>. Verifique qual deles você está analisando.</div><p>Se após essas verificações o problema persistir, entre em contato com o suporte.</p>`
  },
  {
    id: 'preciso-papel', categoria: 'sistema', pergunta: 'Preciso usar papel ou caderno?',
    resposta: `<p><strong>Não!</strong> O Linha Tex foi criado para <strong>substituir totalmente o controle manual</strong>.</p><p>Todas as informações ficam registradas digitalmente e organizadas automaticamente, facilitando o acompanhamento e a geração de relatórios.</p>`
  },
  {
    id: 'producao-tempo-real', categoria: 'sistema', pergunta: 'Consigo acompanhar a produção em tempo real?',
    resposta: `<p><strong>Sim!</strong> O sistema atualiza os dados à medida que novos registros são feitos, permitindo ao gestor identificar produtividade e acompanhar a produção durante o dia.</p><p>A tela de Produção Geral exibe os dados mais atualizados disponíveis.</p>`
  },
  {
    id: 'erro-lancamento', categoria: 'sistema', pergunta: 'O que acontece se eu errar um lançamento?',
    resposta: `<p>Você pode <strong>corrigir ou ajustar</strong> os dados diretamente no sistema.</p><p>Verifique na tela de registros se é possível alterar a quantidade ou a etapa. Caso precise de ajuda, entre em contato com o suporte.</p>`
  },
  {
    id: 'cadastro-rapido-ops', categoria: 'sistema', pergunta: 'Existe uma forma mais rápida de cadastrar várias OPs?',
    resposta: `<p><strong>Sim!</strong> Você pode cadastrar OPs individualmente pela tela <strong>"Adicionar OP"</strong>.</p><p>O sistema permite cadastrar OPs com todas as informações necessárias como modelo, etapas e tempos padrão.</p><p>Após o cadastro, a OP já estará disponível para uso na produção.</p>`
  },
])

const itensFiltrados = computed(() => {
  let items = faqItems.value
  if (categoriaAtiva.value) items = items.filter(i => i.categoria === categoriaAtiva.value)
  if (busca.value.trim()) {
    const termo = busca.value.trim().toLowerCase()
    items = items.filter(i => i.pergunta.toLowerCase().includes(termo) || i.resposta.toLowerCase().includes(termo))
  }
  return items
})

const perguntasPopulares = computed(() => perguntasPopularesIds.map(id => faqItems.value.find(i => i.id === id)).filter(Boolean))

function abrirPerguntaPopular(item) {
  categoriaAtiva.value = null
  busca.value = ''
  itensAbertos.add(item.id)
}
</script>

<style scoped>
.faq-page { display: flex; min-height: 100vh; background: #f8fafb; }
.faq-content { flex: 1; padding-bottom: 40px; min-height: 100vh; }
@media (max-width: 1025px) { .faq-content { padding-left: 0; } }

.hero-section { background: linear-gradient(135deg, #0d3927 0%, #145a32 50%, #266c44 100%); padding: 48px 24px 40px; text-align: center; }
.hero-inner { max-width: 720px; margin: 0 auto; }
.hero-icon { font-size: 48px; margin-bottom: 12px; }
.hero-title { font-size: 2rem; font-weight: 700; color: #fff; margin: 0 0 8px; }
.hero-subtitle { font-size: 1rem; color: rgba(255,255,255,0.85); margin: 0 0 12px; line-height: 1.5; }
.article-count { display: inline-block; background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.9); font-size: 0.8rem; font-weight: 600; padding: 4px 14px; border-radius: 999px; margin-bottom: 24px; }

.search-box { position: relative; max-width: 560px; margin: 0 auto; }
.search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); font-size: 18px; pointer-events: none; }
.search-input { width: 100%; padding: 14px 48px; border: none; border-radius: 14px; font-size: 1rem; font-family: 'Montserrat', sans-serif; box-shadow: 0 8px 32px rgba(0,0,0,0.15); outline: none; transition: box-shadow 0.2s; }
.search-input:focus { box-shadow: 0 8px 32px rgba(0,0,0,0.25), 0 0 0 3px rgba(255,255,255,0.3); }
.search-clear { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: #e5e7eb; border: none; border-radius: 50%; width: 28px; height: 28px; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #666; transition: background 0.15s; }
.search-clear:hover { background: #d1d5db; }

.popular-section { padding: 32px 24px 0; max-width: 960px; margin: 0 auto; }
.popular-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.popular-card { display: flex; align-items: center; justify-content: space-between; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px 18px; cursor: pointer; transition: all 0.2s; text-align: left; font-family: 'Montserrat', sans-serif; }
.popular-card:hover { border-color: #16a34a; box-shadow: 0 4px 12px rgba(22,163,74,0.1); transform: translateY(-1px); }
.popular-text { font-size: 0.9rem; font-weight: 500; color: #1f2937; flex: 1; }
.popular-arrow { color: #16a34a; font-size: 18px; margin-left: 12px; font-weight: 600; }

.categories-section { padding: 24px 24px 0; max-width: 960px; margin: 0 auto; }
.categories-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.categories-scroll::-webkit-scrollbar { display: none; }
.cat-pill { flex-shrink: 0; padding: 8px 18px; border: 1px solid #e5e7eb; border-radius: 999px; background: #fff; font-size: 0.85rem; font-weight: 500; font-family: 'Montserrat', sans-serif; color: #4b5563; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.cat-pill:hover { border-color: #16a34a; color: #16a34a; }
.cat-pill.active { background: #16a34a; color: #fff; border-color: #16a34a; }

.section-title { font-size: 1.2rem; font-weight: 700; color: #1f2937; margin: 32px 0 16px; }

.efficiency-spotlight { padding: 0 24px; max-width: 960px; margin: 0 auto; }
.formula-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; }
.formula-header { background: linear-gradient(135deg, #0d3927, #16a34a); padding: 14px 20px; }
.formula-badge { background: rgba(255,255,255,0.2); color: #fff; font-size: 0.75rem; font-weight: 700; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.5px; }
.formula-body { padding: 24px; }
.formula-main { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px 20px; border-radius: 8px; font-weight: 700; font-size: 0.95rem; color: #14532d; line-height: 1.6; }
.formula-terms { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
.term { font-size: 0.85rem; color: #4b5563; line-height: 1.5; }

.example-box { margin: 0 24px 24px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; }
.example-title { margin: 0 0 14px; font-size: 1rem; color: #92400e; }
.example-grid { display: flex; flex-direction: column; gap: 10px; }
.example-step { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(255,255,255,0.7); border-radius: 8px; font-size: 0.85rem; }
.example-step.highlight { background: #fef3c7; border: 1px solid #fbbf24; }
.step-label { color: #78716c; font-weight: 500; }
.step-value { font-weight: 600; color: #292524; }

.faq-section { padding: 0 24px; max-width: 960px; margin: 0 auto; }
.faq-list { display: flex; flex-direction: column; gap: 8px; }
.faq-item { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; transition: all 0.2s; }
.faq-item:hover { border-color: #d1d5db; }
.faq-item.open { border-color: #16a34a; box-shadow: 0 2px 8px rgba(22,163,74,0.08); }
.faq-question { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 16px 18px; background: none; border: none; cursor: pointer; font-family: 'Montserrat', sans-serif; text-align: left; }
.faq-question-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.faq-cat-badge { font-size: 16px; flex-shrink: 0; }
.faq-question-text { font-size: 0.9rem; font-weight: 600; color: #1f2937; }
.faq-chevron { font-size: 22px; color: #9ca3af; transition: transform 0.25s ease; flex-shrink: 0; margin-left: 12px; }
.faq-chevron.open { transform: rotate(90deg); color: #16a34a; }
.faq-answer {text-align: left; padding: 0 18px 18px 46px; font-size: 0.88rem; color: #4b5563; line-height: 1.7; }
.faq-answer :deep(p) { margin: 0 0 10px; }
.faq-answer :deep(ol), .faq-answer :deep(ul) { margin: 8px 0; padding-left: 20px; }
.faq-answer :deep(li) { margin-bottom: 4px; }
.faq-answer :deep(strong) { color: #1f2937; }

.accordion-enter-active { animation: accordion-open 0.25s ease-out; }
.accordion-leave-active { animation: accordion-open 0.2s ease-in reverse; }
@keyframes accordion-open { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 600px; } }

.empty-state { text-align: center; padding: 48px 24px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-state p { color: #6b7280; font-size: 0.95rem; margin-bottom: 16px; }
.btn-clear { padding: 8px 20px; background: #16a34a; color: #fff; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; font-family: 'Montserrat', sans-serif; cursor: pointer; transition: background 0.15s; }
.btn-clear:hover { background: #15803d; }

.support-section { padding: 40px 24px 0; max-width: 960px; margin: 0 auto; }
.support-card { background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border: 1px solid #bbf7d0; border-radius: 16px; padding: 32px; text-align: center; }
.support-icon { font-size: 36px; margin-bottom: 12px; }
.support-card h3 { margin: 0 0 8px; font-size: 1.1rem; color: #14532d; }
.support-card p { margin: 0; color: #4b5563; font-size: 0.9rem; }

@media (max-width: 640px) {
  .hero-section { padding: 32px 16px; }
  .hero-title { font-size: 1.5rem; }
  .popular-grid { grid-template-columns: 1fr; }
  .faq-question { padding: 14px; }
  .faq-answer { padding: 0 14px 14px 38px; }
  .faq-question-text { font-size: 0.82rem; }
  .formula-body { padding: 16px; }
  .formula-main { font-size: 0.82rem; padding: 12px 14px; }
  .example-step { flex-direction: column; align-items: flex-start; gap: 2px; }
  .section-title { font-size: 1.05rem; }
  .example-box { margin: 0 12px 12px; padding: 14px; }
}
</style>
