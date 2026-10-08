<template>
  <div class="painel">

    <!-- ═══════════════ CABEÇALHO / INDICADORES PRINCIPAIS ═══════════════ -->
    <header class="hero">
      <div class="hero-top">
        <div class="hero-title-group">
          <h2 class="hero-title">Acompanhamento de Produção</h2>
          <span class="socket-pill" :class="{ conectado: socketConectado }">
            <span class="socket-dot" :class="{ conectado: socketConectado }"></span>
            {{ socketConectado ? 'Ao vivo' : 'Reconectando…' }}
          </span>
        </div>
        <div class="hero-top-actions">
          <button
            v-if="gruposProducaoPorOp.length"
            class="btn-ghost"
            @click="mostrarDetalheOps = !mostrarDetalheOps"
          >
            {{ mostrarDetalheOps ? 'Ocultar OPs' : 'Ver OPs' }} ({{ gruposProducaoPorOp.length }})
          </button>
        </div>
      </div>

      <div v-if="loading" class="hero-metrics skeleton-wrap">
        <div class="sk sk-featured" v-for="n in (isFabrica ? 3 : 2)" :key="'skf'+n"></div>
        <div class="sk sk-compact" v-for="n in 3" :key="'skc'+n"></div>
      </div>

      <div v-else class="hero-metrics">
        <div
          class="metric-featured metric-geral"
          title="Eficiência Geral (oficial): usa o Tempo Referência do Profissional somente quando ele é menor que o Tempo Ficha; caso contrário, usa o Tempo Padrão da Etapa. Calculada pelo tempo total da turma."
        >
          <span class="mf-label">
            Eficiência Geral
            <em class="tag-oficial">OFICIAL</em>
          </span>
          <span class="mf-val">
            {{ eficienciaGeralTurma == null ? '—' : formatarEficiencia(eficienciaGeralTurma) }}<small v-if="eficienciaGeralTurma != null">%</small>
          </span>
        </div>

        <div class="metric-featured metric-ficha" title="Capacidade total da ficha técnica ÷ tempo trabalhado × 100">
          <span class="mf-label">Eficiência Ficha</span>
          <span class="mf-val">{{ formatarEficiencia(eficienciaMediaTurma) }}<small>%</small></span>
        </div>

        <div v-if="isFabrica" class="metric-featured metric-referencia" title="Capacidade total pelo Tempo Referência do Profissional ÷ tempo trabalhado × 100">
          <span class="mf-label">Eficiência Referência</span>
          <span class="mf-val">
            {{ eficienciaReferenciaTurmaExibida == null ? '—' : formatarEficiencia(eficienciaReferenciaTurmaExibida) }}<small v-if="eficienciaReferenciaTurmaExibida != null">%</small>
          </span>
        </div>

        <div class="metrics-compact">
          <div class="metric-chip">
            <span class="mc-label">Peças entregues</span>
            <span class="mc-val">{{ totalPecasGeral }}</span>
          </div>
          <div class="metric-chip">
            <span class="mc-label">Funcionários</span>
            <span class="mc-val">{{ funcionariosOrdenados.length }}</span>
          </div>
          <div class="metric-chip" v-if="opsAtivas.length">
            <span class="mc-label">Peça do dia</span>
            <span class="mc-val peca-chip" :title="opsAtivas.map(o => nomeDaOp(o.pecaId)).join(', ')">
              {{ opsAtivas.map(o => nomeDaOp(o.pecaId)).join(', ') }}
            </span>
          </div>
        </div>
      </div>

      <!-- Aviso quando algum profissional não tem Tempo Referência -->
      <div v-if="!loading && isFabrica && temReferenciaIndisponivel" class="ref-aviso">
        Alguns profissionais não têm Tempo Referência cadastrado — a Eficiência Referência aparece como “—” e a Eficiência Geral usa o Tempo Padrão da Etapa nesses casos.
      </div>

      <div v-if="!loading && insights" class="insights-bar">
        <button class="insights-toggle" @click="mostrarInsights = !mostrarInsights">
          <span>✨ Destaques do dia</span>
          <span class="insights-chevron" :class="{ open: mostrarInsights }">›</span>
        </button>
        <transition name="fade-collapse">
          <div v-if="mostrarInsights" class="insights-grid">
            <div class="insight-card" v-if="insights.melhorReferencia">
              <span class="insight-icon">🏆</span>
              <div class="insight-body">
                <span class="insight-label">Melhor eficiência referência</span>
                <span class="insight-val">{{ insights.melhorReferencia.nome }} — {{ formatarEficiencia(insights.melhorReferencia.valor) }}%</span>
              </div>
            </div>
            <div class="insight-card" v-if="insights.maiorProducao">
              <span class="insight-icon">📦</span>
              <div class="insight-body">
                <span class="insight-label">Maior produção</span>
                <span class="insight-val">{{ insights.maiorProducao.nome }} — {{ insights.maiorProducao.valor }} peças</span>
              </div>
            </div>
            <div class="insight-card" v-if="insights.maiorDiferenca">
              <span class="insight-icon">📈</span>
              <div class="insight-body">
                <span class="insight-label">Maior diferença Ficha × Referência</span>
                <span class="insight-val">{{ insights.maiorDiferenca.nome }} — +{{ formatarEficiencia(insights.maiorDiferenca.valor) }}%</span>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </header>

    <!-- ═══════════════ DETALHE POR OP ═══════════════ -->
    <transition name="panel-slide">
      <section v-if="mostrarDetalheOps && gruposProducaoPorOp.length" class="ops-detalhe">
        <div class="ops-detalhe-grid">
          <button
            v-for="op in gruposProducaoPorOp"
            :key="op.opId"
            class="op-card"
            :class="{ ativa: filtroOpId === op.opId }"
            @click="alternarFiltroOp(op.opId)"
            :title="'Clique para filtrar a lista de profissionais por esta OP'"
          >
            <div class="op-card-head">
              <span class="op-card-nome">{{ op.nome }}</span>
              <span
                v-if="op.multiplasEtapas"
                class="op-detalhe-tag"
                title="Esta OP teve mais de uma etapa registrada — os totais já somam todos os lançamentos"
              >várias etapas</span>
            </div>

            <div class="op-card-numeros">
              <div class="op-num">
                <span class="op-num-val">{{ op.producao }}</span>
                <span class="op-num-label">produzidas{{ op.metaConfigurada !== null ? ' / ' + op.metaConfigurada : '' }}</span>
              </div>
              <div class="op-num">
                <span class="op-num-val">{{ op.tempoTrabalhado }}<small>min</small></span>
                <span class="op-num-label">tempo registrado</span>
              </div>
              <div class="op-num">
                <span class="op-num-val">{{ op.tempoPadraoTotal }}<small>min</small></span>
                <span class="op-num-label">capacidade (ficha)</span>
              </div>
              <div class="op-num" v-if="isFabrica">
                <span class="op-num-val">{{ op.tempoReferenciaTotal }}<small>min</small></span>
                <span class="op-num-label">capacidade (referência){{ op.refFallback ? ' *' : '' }}</span>
              </div>
            </div>

            <div class="op-card-eficiencias">
              <span class="badge" :class="clsEfic(op.eficienciaFicha)">
                Ficha {{ formatarEficiencia(op.eficienciaFicha) }}%
              </span>
              <span v-if="isFabrica" class="badge" :class="clsEfic(op.eficienciaReferencia)">
                Ref. {{ formatarEficiencia(op.eficienciaReferencia) }}%{{ op.refFallback ? ' *' : '' }}
              </span>
            </div>

            <details class="op-card-formulas" @click.stop>
              <summary>ver fórmula</summary>
              <div class="op-detalhe-formula">
                <span class="formula-expr">{{ op.tempoPadraoTotal }} ÷ {{ op.tempoTrabalhado }} × 100</span>
                <span class="formula-result" :class="clsEfic(op.eficienciaFicha)">= {{ formatarEficiencia(op.eficienciaFicha) }}%</span>
              </div>
              <div v-if="isFabrica" class="op-detalhe-formula">
                <span class="formula-expr">{{ op.tempoReferenciaTotal }} ÷ {{ op.tempoTrabalhado }} × 100</span>
                <span class="formula-result" :class="clsEfic(op.eficienciaReferencia)">= {{ formatarEficiencia(op.eficienciaReferencia) }}%</span>
              </div>
            </details>
          </button>
        </div>

        <div class="resumo-medias" :class="{ single: !isFabrica }">
          <div class="resumo-card">
            <span class="resumo-icon">📊</span>
            <span class="resumo-label">Eficiência Média da Ficha</span>
            <strong class="resumo-valor" :class="clsEfic(eficienciaMediaPonderadaOps)">
              {{ formatarEficiencia(eficienciaMediaPonderadaOps) }}%
            </strong>
            <span class="resumo-formula">
              ({{ gruposProducaoPorOp.map(op => formatarEficiencia(op.eficienciaFicha) + '%').join(' + ') }}) ÷ {{ gruposProducaoPorOp.length }}
            </span>
          </div>

          <div class="resumo-card" v-if="isFabrica">
            <span class="resumo-icon">📈</span>
            <span class="resumo-label">Eficiência Média de Referência</span>
            <strong class="resumo-valor" :class="clsEfic(eficienciaMediaPonderadaOpsReferencia)">
              {{ formatarEficiencia(eficienciaMediaPonderadaOpsReferencia) }}%
            </strong>
            <span class="resumo-formula">
              ({{ gruposProducaoPorOp.map(op => formatarEficiencia(op.eficienciaReferencia) + '%').join(' + ') }}) ÷ {{ gruposProducaoPorOp.length }}
            </span>
          </div>
        </div>
      </section>
    </transition>

    <!-- ═══════════════ FILTROS ═══════════════ -->
    <div class="filtros-row">
      <input class="search-input" v-model="busca" placeholder="Buscar por nome, e-mail ou etapa…" />

      <!-- Três filtros independentes: cada um avalia o PRÓPRIO indicador -->
      <select class="filtro-select filtro-geral" v-model="filtroEficienciaGeral" title="Filtrar pela Eficiência Geral (oficial)">
        <option v-for="o in opcoesFaixa" :key="'fg' + o.valor" :value="o.valor">Geral (oficial): {{ o.rotulo }}</option>
      </select>

      <select class="filtro-select filtro-ficha" v-model="filtroEficienciaFicha" title="Filtrar pela Eficiência Ficha">
        <option v-for="o in opcoesFaixa" :key="'ff' + o.valor" :value="o.valor">Ficha: {{ o.rotulo }}</option>
      </select>

      <select
        v-if="isFabrica"
        class="filtro-select filtro-referencia"
        v-model="filtroEficienciaReferencia"
        title="Filtrar pela Eficiência Referência (exclui quem não tem Tempo Referência)"
      >
        <option v-for="o in opcoesFaixa" :key="'fr' + o.valor" :value="o.valor">Referência: {{ o.rotulo }}</option>
      </select>

      <select v-if="gruposProducaoPorOp.length > 1" class="filtro-select" v-model="filtroOpId" title="Filtrar por OP">
        <option value="todas">Todas as OPs</option>
        <option v-for="op in gruposProducaoPorOp" :key="op.opId" :value="op.opId">{{ op.nome }}</option>
      </select>

      <select class="filtro-select" v-model="ordenarPor" title="Ordenar a lista">
        <option value="ranking">Ordenar: Ranking ({{ rotuloModoRanking }})</option>
        <option value="nome">Ordenar: Nome</option>
        <option value="pecas">Ordenar: Peças</option>
        <option value="geral">Ordenar: Efic. Geral</option>
        <option value="ficha">Ordenar: Efic. Ficha</option>
        <option value="referencia" v-if="isFabrica">Ordenar: Efic. Referência</option>
      </select>

      <div class="sort-toggle" role="tablist" aria-label="Ranking por indicador">
        <button
          class="sort-toggle-btn"
          :class="{ active: modoRankingEfetivo === 'geral' }"
          @click="definirModoOrdenacao('geral')"
        >Ranking Geral</button>
        <button
          class="sort-toggle-btn"
          :class="{ active: modoRankingEfetivo === 'ficha' }"
          @click="definirModoOrdenacao('ficha')"
        >Ranking Ficha</button>
        <button
          v-if="isFabrica"
          class="sort-toggle-btn"
          :class="{ active: modoRankingEfetivo === 'referencia' }"
          @click="definirModoOrdenacao('referencia')"
        >Ranking Referência</button>
      </div>

      <span class="list-count">{{ funcionariosFiltrados.length }} de {{ funcionariosOrdenados.length }}</span>
    </div>

    <!-- ═══════════════ MAIN ═══════════════ -->
    <div class="main-layout" :class="{ 'panel-open': selecionado !== null }">

      <div class="grid-area">
        <div class="list-header" :class="{ fabrica: isFabrica }">
          <span class="lh-name">Profissional</span>
          <span class="lh-col">Peças</span>
          <span class="lh-col lh-geral">
            Efic. Geral
            <em class="tag-oficial">OFICIAL</em>
          </span>
          <!-- <span class="lh-col">Efic. Ficha</span>
          <span v-if="isFabrica" class="lh-col">Efic. Referência</span> -->
        </div>

        <div class="list-body">
          <template v-if="loading">
            <div class="list-row skeleton-row" v-for="n in 6" :key="'skr'+n">
              <div class="sk sk-avatar"></div>
              <div class="sk sk-line" style="flex:1"></div>
              <div class="sk sk-badge"></div>
            </div>
          </template>

          <div
            v-for="func in funcionariosFiltrados"
            :key="func.email"
            class="list-row"
            :class="{ selected: selecionado === func._idx, fabrica: isFabrica, 'sem-producao': !temProducao(func) }"
            @click="selecionar(func._idx)"
          >
            <div class="lr-name">
              <span
                class="lr-pos"
                :class="{ medal: func._idx < 3 }"
                :title="'Posição ' + (func._idx + 1) + ' no ranking ' + rotuloModoRanking"
              >
                {{ rankIcon(func._idx) }}
              </span>
              <div class="lr-avatar-wrap">
                <img v-if="func.foto" class="lr-avatar" :src="func.foto" :alt="func.nome" @error="onImgError" />
                <div v-else class="lr-avatar-fb">{{ initials(func.nome) }}</div>
                <span
                  class="lr-dot"
                  :class="clsEficPrincipal(metricasFuncionario(func).geral)"
                  :title="legendaEfic(metricasFuncionario(func).geral) + ' (Eficiência Geral)'"
                ></span>
              </div>
              <div class="lr-info">
                <span class="lr-nome">
                  {{ func.nome }}
                  <span v-if="insights?.maiorProducao?.nome === func.nome" class="mini-tag" title="Maior produção do dia">📦</span>
                  <span v-if="isFabrica && insights?.melhorReferencia?.nome === func.nome" class="mini-tag" title="Melhor eficiência de referência">🏆</span>
                </span>
                <span class="lr-sub">{{ func.email }}</span>
              </div>
            </div>

            <span class="lr-col mono">{{ calcularTotalFuncionario(func) }}</span>

            <!-- GERAL (OFICIAL) -->
            <span class="lr-col lr-col-badge lr-geral">
              <template v-if="temProducao(func)">
                <span
                  class="badge sm"
                  :class="clsEficPrincipal(metricasFuncionario(func).geral)"
                  :title="'Eficiência Geral (oficial) — origem: ' + rotuloOrigem(metricasFuncionario(func).origem)"
                >
                  {{ fmtPct(metricasFuncionario(func).geral) }}
                </span>
                <span class="lr-origem">{{ rotuloOrigem(metricasFuncionario(func).origem, true) }}</span>
              </template>
              <span v-else class="mono small">—</span>
            </span>

            <!-- FICHA -->
            <!-- <span class="lr-col lr-col-badge lr-ficha">
              <span
                v-if="temProducao(func)"
                class="badge sm"
                :class="clsEficPrincipal(metricasFuncionario(func).ficha)"
                title="Eficiência Ficha (Tempo Ficha)"
              >
                {{ fmtPct(metricasFuncionario(func).ficha) }}
              </span>
              <span v-else class="mono small">—</span>
            </span> -->

            <!-- REFERÊNCIA -->
            <!-- <span v-if="isFabrica" class="lr-col lr-col-badge lr-referencia">
              <template v-if="temProducao(func)">
                <span
                  class="badge sm"
                  :class="clsEficPrincipal(metricasFuncionario(func).referencia)"
                  :title="metricasFuncionario(func).referencia == null
                    ? 'Sem Tempo Referência do Profissional disponível'
                    : 'Eficiência Referência (Tempo Referência do Profissional)'"
                >
                  {{ fmtPct(metricasFuncionario(func).referencia) }}
                </span>
              </template>
              <span v-else class="mono small">—</span>
            </span> -->

            <span class="lr-chevron">›</span>
          </div>

          <div v-if="!loading && !funcionariosFiltrados.length" class="list-empty">
            <span v-if="busca || filtrosEficienciaAtivos || filtroOpId !== 'todas'">Nenhum resultado para os filtros aplicados</span>
            <span v-else>Sem dados para esta data</span>
          </div>
        </div>
      </div>

      <div v-if="selecionado !== null" class="detail-overlay" @click="selecionado = null"></div>

      <!-- PAINEL DETALHE -->
      <transition name="panel-slide">
        <aside v-if="selecionado !== null && funcSelecionado && metricasSelecionado" class="detail-panel">

          <div class="dp-topbar">
            <span class="dp-topbar-title">Detalhes do profissional</span>
            <button class="dp-close" @click="selecionado = null">✕</button>
          </div>

          <div class="dp-profile">
            <div class="dp-avatar-wrap">
              <img v-if="funcSelecionado.foto" class="dp-avatar" :src="funcSelecionado.foto" :alt="funcSelecionado.nome" @error="onImgError" />
              <div v-else class="dp-avatar-fb">{{ initials(funcSelecionado.nome) }}</div>
              <span class="dp-dot" :class="clsEficPrincipal(metricasSelecionado.geral)"></span>
            </div>
            <div class="dp-profile-info">
              <h3 class="dp-nome">{{ funcSelecionado.nome }}</h3>
              <p class="dp-email">{{ funcSelecionado.email }} · #{{ selecionado + 1 }} no ranking {{ rotuloModoRanking }}</p>
            </div>
          </div>

          <!-- TRÊS INDICADORES -->
          <div class="dp-eff-cards tres" :class="{ single: !isFabrica }">
            <div class="dp-eff-card oficial">
              <span class="dp-eff-card-label">
                Eficiência Geral
                <em class="tag-oficial">OFICIAL</em>
              </span>
              <strong class="dp-eff-card-val" :class="clsEficPrincipal(metricasSelecionado.geral)">
                {{ fmtPct(metricasSelecionado.geral) }}
              </strong>
              <div class="dp-eff-bar-track">
                <div
                  class="dp-eff-bar-fill"
                  :class="clsEficPrincipal(metricasSelecionado.geral)"
                  :style="{ width: larguraBarra(metricasSelecionado.geral) }"
                ></div>
              </div>
              <span class="dp-eff-card-sub">Origem: {{ rotuloOrigem(metricasSelecionado.origem) }}</span>
            </div>

            <div class="dp-eff-card ficha">
              <span class="dp-eff-card-label">Eficiência Ficha</span>
              <strong class="dp-eff-card-val" :class="clsEficPrincipal(metricasSelecionado.ficha)">
                {{ fmtPct(metricasSelecionado.ficha) }}
              </strong>
              <div class="dp-eff-bar-track">
                <div
                  class="dp-eff-bar-fill"
                  :class="clsEficPrincipal(metricasSelecionado.ficha)"
                  :style="{ width: larguraBarra(metricasSelecionado.ficha) }"
                ></div>
              </div>
              <span class="dp-eff-card-sub">Tempo Ficha</span>
            </div>

            <div v-if="isFabrica" class="dp-eff-card referencia">
              <span class="dp-eff-card-label">Eficiência Referência</span>
              <strong class="dp-eff-card-val" :class="clsEficPrincipal(metricasSelecionado.referencia)">
                {{ fmtPct(metricasSelecionado.referencia) }}
              </strong>
              <div class="dp-eff-bar-track">
                <div
                  class="dp-eff-bar-fill"
                  :class="clsEficPrincipal(metricasSelecionado.referencia)"
                  :style="{ width: larguraBarra(metricasSelecionado.referencia) }"
                ></div>
              </div>
              <span class="dp-eff-card-sub">
                {{ metricasSelecionado.referencia == null ? 'Sem Tempo Referência disponível' : 'Tempo Referência do Profissional' }}
              </span>
            </div>
          </div>

          <div class="dp-eff-acoes">
            <button type="button" class="btn-detalhes" @click="mostrarDetalhesAnalise = !mostrarDetalhesAnalise">
              {{ mostrarDetalhesAnalise ? 'Ocultar detalhes' : 'Ver detalhes' }}
            </button>
          </div>

          <!-- DETALHAMENTO (na própria tela, sem modal/rota) -->
          <section v-if="mostrarDetalhesAnalise" class="dp-analise">
            <template v-if="analiseDetalhe">

              <h4 class="an-titulo">Detalhes da Produção</h4>
              <div class="an-cards">
                <div class="an-card">
                  <span class="an-card-label">Produção</span>
                  <strong class="an-card-val">{{ fmtPecas(analiseDetalhe.producao) }} <small>peças</small></strong>
                </div>
                <div class="an-card">
                  <span class="an-card-label">Tempo trabalhado</span>
                  <strong class="an-card-val">{{ formatarDecimal(analiseDetalhe.tempoTrabalhado) }} <small>min</small></strong>
                </div>
                <div class="an-card an-card-oficial">
                  <span class="an-card-label">Eficiência Geral <em class="tag-oficial">OFICIAL</em></span>
                  <strong class="an-card-val" :class="clsEficPrincipal(analiseDetalhe.geral.eficiencia)">
                    {{ fmtPct(analiseDetalhe.geral.eficiencia) }}
                  </strong>
                  <span class="an-card-sub">{{ rotuloOrigem(analiseDetalhe.origem) }}</span>
                </div>
                <div class="an-card">
                  <span class="an-card-label">Tempo utilizado</span>
                  <strong class="an-card-val">
                    {{ fmtTempo(analiseDetalhe.geral.tempo) }}
                    <small v-if="analiseDetalhe.geral.tempo != null">min/peça</small>
                  </strong>
                </div>
              </div>
              <p v-if="analiseDetalhe.multiplasEtapas" class="an-nota">
                Há mais de uma etapa lançada: os tempos por peça são médias ponderadas pela quantidade de cada etapa.
              </p>

              <h4 class="an-titulo">Análise dos Tempos</h4>
              <div class="an-tabela-wrap">
                <table class="an-tabela">
                  <thead>
                    <tr>
                      <th>Referência</th>
                      <th class="num">Tempo</th>
                      <th class="num">Capacidade teórica</th>
                      <th class="num">Eficiência</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="r in analiseDetalhe.referencias"
                      :key="r.chave"
                      :class="{ 'an-destaque': r.destaque, 'an-indisp': r.tempo == null }"
                    >
                      <td>
                        {{ r.rotulo }}
                        <em v-if="r.destaque" class="an-tag">OFICIAL</em>
                        <small class="an-cenario">{{ r.cenario }}</small>
                      </td>
                      <td class="num">{{ r.tempo == null ? 'indisponível' : formatarDecimal(r.tempo) + ' min' }}</td>
                      <td class="num">{{ r.capacidade == null ? '—' : fmtPecas(r.capacidade) + ' peças' }}</td>
                      <td class="num">{{ fmtPct(r.eficiencia) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h4 class="an-titulo">Como o tempo foi escolhido? (Eficiência Geral — Oficial)</h4>
              <div class="an-explica">
                <p>{{ analiseDetalhe.explicacao }}</p>
                <p v-if="analiseDetalhe.aviso" class="an-aviso">{{ analiseDetalhe.aviso }}</p>
              </div>

              <ul v-if="analiseDetalhe.escolhas.length > 1" class="an-etapas">
                <li v-for="l in analiseDetalhe.escolhas" :key="l.id" class="an-etapa-item">
                  <div class="an-etapa-top">
                    <span class="an-etapa-nome">{{ l.etapa }} <small class="small">· {{ l.quantidade }} peças</small></span>
                    <span class="an-etapa-origem" :class="l.origem || 'indisp'">{{ rotuloOrigem(l.origem, true) }}</span>
                  </div>
                  <div class="an-etapa-tempos mono small">
                    Padrão {{ fmtTempo(l.tPadrao) }} · Ficha {{ fmtTempo(l.tFicha) }}<template v-if="isFabrica"> · Ref. {{ fmtTempo(l.tRef) }}</template> · Usado {{ fmtTempo(l.tUsado) }}
                  </div>
                  <div class="an-etapa-motivo small">{{ l.motivo }}</div>
                </li>
              </ul>

              <h4 class="an-titulo">Eficiência Ficha</h4>
              <ul class="an-lista">
                <li><span>Tempo Ficha</span><strong>{{ fmtMin(analiseDetalhe.ficha.tempo) }}</strong></li>
                <li><span>Eficiência Ficha</span><strong>{{ fmtPct(analiseDetalhe.ficha.eficiencia) }}</strong></li>
                <li><span>Capacidade teórica</span><strong>{{ analiseDetalhe.ficha.capacidade == null ? '—' : fmtPecas(analiseDetalhe.ficha.capacidade) + ' peças' }}</strong></li>
              </ul>

              <template v-if="isFabrica && analiseDetalhe.referenciaProf">
                <h4 class="an-titulo">Eficiência Referência</h4>
                <ul class="an-lista">
                  <li><span>Tempo Referência do Profissional</span><strong>{{ fmtMin(analiseDetalhe.referenciaProf.tempo) }}</strong></li>
                  <li><span>Eficiência Referência</span><strong>{{ fmtPct(analiseDetalhe.referenciaProf.eficiencia) }}</strong></li>
                  <li><span>Capacidade teórica</span><strong>{{ analiseDetalhe.referenciaProf.capacidade == null ? '—' : fmtPecas(analiseDetalhe.referenciaProf.capacidade) + ' peças' }}</strong></li>
                </ul>
              </template>

              <h4 class="an-titulo">Comparativo de Eficiência</h4>
              <ul class="an-lista">
                <li
                  v-for="r in analiseDetalhe.referencias"
                  :key="'ce' + r.chave"
                  :class="{ 'an-destaque': r.destaque }"
                >
                  <span>
                    {{ r.rotulo }}
                    <em v-if="r.destaque" class="an-tag">OFICIAL</em>
                  </span>
                  <strong>{{ fmtPct(r.eficiencia) }}</strong>
                </li>
              </ul>
              <p class="an-nota">A Eficiência Geral (Tempo Efetivo) é a oficial. Tempo Padrão, Ficha e Referência são cenários comparativos independentes.</p>

              <h4 class="an-titulo">Comparativo de Produção</h4>
              <div class="an-legenda">
                <span class="an-leg teorica">Capacidade teórica</span>
                <span class="an-leg oficial">Capacidade — Geral (oficial)</span>
                <span class="an-leg real">Produção real</span>
              </div>
              <div class="an-chart">
                <canvas ref="canvasProducao"></canvas>
              </div>
              <ul class="an-lista">
                <li v-for="g in analiseDetalhe.grafico" :key="'g' + g.chave" :class="g.tipo">
                  <span>{{ g.rotulo }}</span>
                  <strong>{{ g.valor == null ? '—' : fmtPecas(g.valor) + ' peças' }}</strong>
                </li>
              </ul>

              <h4 class="an-titulo">Impacto da Referência de Tempo</h4>
              <ul v-if="analiseDetalhe.impacto" class="an-lista">
                <li><span>Tempo Ficha</span><strong>{{ formatarDecimal(analiseDetalhe.impacto.tempoFicha) }} min</strong></li>
                <li><span>Tempo Referência</span><strong>{{ formatarDecimal(analiseDetalhe.impacto.tempoRef) }} min</strong></li>
                <li><span>Diferença</span><strong>{{ fmtSinal(analiseDetalhe.impacto.difMin, 2) }} min</strong></li>
                <li><span>Variação</span><strong>{{ fmtSinal(analiseDetalhe.impacto.varPct, 1) }}%</strong></li>
                <li><span>Capacidade Ficha</span><strong>{{ fmtPecas(analiseDetalhe.impacto.capFicha) }} peças</strong></li>
                <li><span>Capacidade Profissional</span><strong>{{ fmtPecas(analiseDetalhe.impacto.capRef) }} peças</strong></li>
                <li class="an-destaque">
                  <span>Impacto</span>
                  <strong>{{ analiseDetalhe.impacto.impactoPecas > 0 ? '+' : '' }}{{ fmtPecas(analiseDetalhe.impacto.impactoPecas) }} peças teóricas</strong>
                </li>
              </ul>
              <p v-else class="an-nota">
                Impacto indisponível: é preciso haver Tempo Ficha e Tempo Referência do Profissional para todas as etapas com produção.
              </p>

            </template>
            <p v-else class="an-nota">Sem dados suficientes para detalhar esta produção.</p>
          </section>

          <div class="dp-mini-stats">
            <div class="dp-mini-stat">
              <span class="dp-stat-label">Peças (final)</span>
              <span class="dp-stat-val">{{ calcularTotalFinalizadoFuncionario(funcSelecionado) }}</span>
            </div>
            <div class="dp-mini-stat">
              <span class="dp-stat-label">Linhas</span>
              <span class="dp-stat-val">{{ (funcSelecionado.linhas || []).length }}</span>
            </div>
            <div class="dp-mini-stat" v-if="isFabrica">
              <span class="dp-stat-label">Diferença Ref. × Ficha</span>
              <span
                class="dp-stat-val"
                :class="diferencaSelecionada == null ? '' : (diferencaSelecionada >= 0 ? 'verde' : 'vermelho')"
              >
                {{ fmtDif(diferencaSelecionada) }}
              </span>
            </div>
          </div>

          <div v-if="totaisFuncionarioSelecionado" class="dp-auditoria">
            <div class="dp-auditoria-titulo">Tempos utilizados no cálculo</div>
            <div class="dp-auditoria-grid">
              <div class="dp-auditoria-item">
                <span class="dp-auditoria-label">Tempo registrado</span>
                <span class="dp-auditoria-val">{{ totaisFuncionarioSelecionado.tempoRegistrado }} min</span>
              </div>
              <div class="dp-auditoria-item">
                <span class="dp-auditoria-label" title="Tempo padrão da ficha técnica">Tempo da Ficha</span>
                <span class="dp-auditoria-val">{{ fmtTempoTotal(totaisFuncionarioSelecionado.tempoFicha) }}</span>
              </div>
              <div v-if="isFabrica" class="dp-auditoria-item">
                <span class="dp-auditoria-label" title="Tempo específico do profissional, quando cadastrado">Tempo de Referência</span>
                <span class="dp-auditoria-val">{{ fmtTempoTotal(totaisFuncionarioSelecionado.tempoReferencia) }}</span>
              </div>
            </div>
            <details class="dp-auditoria-formula-wrap">
              <summary>ver fórmula usada</summary>
              <div class="dp-auditoria-formula">
                <div><strong>Eficiência Ficha:</strong> {{ totaisFuncionarioSelecionado.formulaFicha }}</div>
                <div v-if="isFabrica"><strong>Eficiência Referência:</strong> {{ totaisFuncionarioSelecionado.formulaReferencia }}</div>
                <div>
                  <strong>Eficiência Geral (oficial):</strong>
                  {{ metricasSelecionado.totais.usado == null ? 'indisponível' : formatarDecimal(metricasSelecionado.totais.usado) + ' ÷ ' + totaisFuncionarioSelecionado.tempoRegistrado + ' × 100' }}
                </div>
              </div>
            </details>

            <div v-if="isFabrica && totaisFuncionarioSelecionado.resumoRef?.length" class="dp-ref-detalhes">
              <div class="dp-ref-detalhes-titulo">Origem do tempo de referência</div>
              <div v-for="(ref, ri) in totaisFuncionarioSelecionado.resumoRef" :key="ri" class="dp-ref-detalhes-linha">
                <span class="dp-ref-etapa">
                  {{ ref.etapa }}
                  <span v-if="totaisFuncionarioSelecionado.resumoRef.length > 1" class="dp-ref-op-tag">OP</span>
                </span>
                <span class="dp-ref-valor" v-if="ref.tempoRef != null">
                  {{ formatarDecimal(ref.tempoRef) }} min
                  <span class="dp-ref-origem" :class="ref.origem">
                    ({{ formatarOrigem(ref.origem) }})
                  </span>
                </span>
                <span class="dp-ref-valor dp-ref-sem" v-else>— (indisponível)</span>
              </div>
            </div>
          </div>

          <div class="dp-tabs">
            <button
              v-for="tab in tabs"
              :key="tab"
              class="dp-tab"
              :class="{ active: abaAtiva === tab }"
              @click="abaAtiva = tab"
            >{{ tab }}</button>
          </div>

          <!-- TAB: Etapas -->
          <div v-if="abaAtiva === 'Etapas'" class="dp-content">
            <div v-for="linha in (funcSelecionado.linhas || [])" :key="linha.id" class="dp-etapa">
              <div class="dp-etapa-top">
                <span class="dp-etapa-nome">
                  {{ linha.descricao || linha.etapaId || '—' }}
                  <span v-if="isEtapaFinal(linha)" class="tag-final">final</span>
                </span>
                <span v-if="!isFabrica" class="badge sm" :class="clsEfic(calcularEficienciaLinha(linha))">
                  {{ calcularEficienciaLinha(linha) }}%
                </span>
                <span v-else style="display:flex; gap:4px;">
                  <span class="badge sm" :class="clsEfic(calcularEficienciaLinha(linha))" title="Eficiência da ficha">
                    F {{ calcularEficienciaLinha(linha) }}%
                  </span>
                  <span class="badge sm" :class="clsEfic(calcularEficienciaReferenciaLinha(linha))" title="Eficiência de referência">
                    R {{ calcularEficienciaReferenciaLinha(linha) }}%{{ referenciaEhFallbackLinha(linha) ? ' *' : '' }}
                  </span>
                </span>
              </div>
              <div class="dp-etapa-bar-track">
                <div
                  class="dp-etapa-bar-fill"
                  :class="clsEfic(calcularEficienciaLinha(linha))"
                  :style="{ width: Math.min(calcularEficienciaLinha(linha), 100) + '%' }"
                ></div>
              </div>
              <div v-if="isFabrica" class="dp-etapa-bar-track">
                <div
                  class="dp-etapa-bar-fill"
                  :class="clsEfic(calcularEficienciaReferenciaLinha(linha))"
                  :style="{ width: Math.min(calcularEficienciaReferenciaLinha(linha), 100) + '%' }"
                ></div>
              </div>
              <div class="dp-etapa-bottom">
                <span class="mono small">{{ calcularTotalLinha(linha) }} peças</span>
                <span class="mono small" v-if="!isFabrica">tempo padrão: {{ linha.tempoPadrao }} min/pç</span>
                <span class="mono small" v-else>
                  padrão: {{ linha.tempoPadrao }} min/pç · referência: {{ formatarDecimal(tempoEfetivoLinha(linha)) }} min/pç
                  <span v-if="referenciaEhFallbackLinha(linha)" class="dp-ref-origem-inline ultimo_registrado">(usando ficha)</span>
                  <span v-else-if="obterOrigemRefLinha(linha)" class="dp-ref-origem-inline" :class="obterOrigemRefLinha(linha)">
                    ({{ formatarOrigem(obterOrigemRefLinha(linha)) }})
                  </span>
                </span>
              </div>
            </div>

            <div v-if="!(funcSelecionado.linhas || []).length" class="dp-empty">
              Sem etapas registradas
            </div>
          </div>

          <!-- TAB: Por hora -->
          <div v-if="abaAtiva === 'Por hora'" class="dp-content">
            <div v-for="(hg, hi) in horasPorFuncionario(funcSelecionado)" :key="hi" class="dp-hora-bloco">
              <div class="dp-hora-head">
                <div class="dp-hora-head-left">
                  <span class="dp-hora-clock">🕐</span>
                  <span class="dp-hora-label">{{ hg.hora }}</span>
                </div>
                <span class="dp-hora-total-pecas">{{ hg.totalPecas }} peças</span>
              </div>

              <div class="dp-hora-eff-summary">
                <span v-if="!isFabrica" :class="clsEfic(hg.eficiencia)">{{ formatarEficiencia(hg.eficiencia) }}% eficiência</span>
                <template v-else>
                  <span :class="clsEfic(hg.eficiencia)">F {{ formatarEficiencia(hg.eficiencia) }}%</span>
                  <span :class="clsEfic(hg.eficienciaReferencia)">R {{ formatarEficiencia(hg.eficienciaReferencia) }}%</span>
                </template>
              </div>

              <div class="dp-hora-eff-row">
                <div class="dp-hora-eff-bar-track">
                  <div
                    class="dp-hora-eff-bar-fill"
                    :class="clsEfic(hg.eficiencia)"
                    :style="{ width: Math.min(hg.eficiencia, 100) + '%' }"
                  ></div>
                </div>
                <div v-if="isFabrica" class="dp-hora-eff-bar-track">
                  <div
                    class="dp-hora-eff-bar-fill"
                    :class="clsEfic(hg.eficienciaReferencia)"
                    :style="{ width: Math.min(hg.eficienciaReferencia, 100) + '%' }"
                  ></div>
                </div>
              </div>

              <div class="dp-hora-etapas-list">
                <div v-for="(et, ei) in hg.etapas" :key="ei" class="dp-hora-etapa-item">
                  <div class="dp-hora-etapa-item-top">
                    <span class="dp-hora-etapa-nome">
                      {{ et.descricao }}
                      <span v-if="et.isFinal" class="tag-final">final</span>
                    </span>
                    <span class="mono small">{{ et.quantidade }} pç · {{ et.tempoProduzido }} min</span>
                  </div>
                  <div class="dp-hora-etapa-item-badges">
                    <span class="badge sm" :class="clsEfic(et.eficiencia)">F {{ et.eficiencia }}%</span>
                    <span v-if="isFabrica" class="badge sm" :class="clsEfic(et.eficienciaReferencia)">R {{ et.eficienciaReferencia }}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="!horasPorFuncionario(funcSelecionado).length" class="dp-empty">
              Sem dados de produção por hora
            </div>
          </div>

        </aside>
      </transition>
    </div>
  </div>
</template>

<script>
import { io } from 'socket.io-client'
import { useAuthStore } from '@/store/store'
import api from '@/Axios'
import debounce from 'lodash/debounce'
import Chart from 'chart.js/auto'
import {
  horaParaMinutos,
  isEtapaFinal,
  resolverTempoPadrao,
  resolverTempoEfetivoReferencia,
  resolverTempoReferenciaComOrigem,
  calcularTotalLinha,
  calcularPecasFinalizadasFuncionario,
  calcularEficienciaLinhaPadrao,
  calcularEficienciaLinhaReferencia,
  calcularEficienciaRegistroPadrao,
  calcularEficienciaRegistroReferencia,
  calcularEficienciaFuncionarioPadrao,
  calcularEficienciaFuncionarioReferencia,
  calcularTotaisFuncionarioDia,
  horaBloqueadaPorAusencia,
  agruparProducaoPorOp,
  resumoConsolidadoOp,
  calcularEficienciaMediaPonderadaOps,
  minutosDisponiveisDia,
} from '@/utils/producaoCompartilhada'

const socket = io('https://acari-tex.onrender.com', { transports: ['websocket'] })

const LOCAL_STORAGE_MINUTOS_KEY = 'apontamento-minutos-turno'
const LS_TEMPO_REF_PREFIXO = 'apontamento_tempo_referencia_escolhido'
const LS_MODO_RANKING = 'painel-modo-ordenacao'

function chaveLocalStorageTempoRef(estabelecimento, data, funcionarioId, opId, etapaId) {
  return `${LS_TEMPO_REF_PREFIXO}::${estabelecimento}::${data}::${funcionarioId}::${opId || 'sem-op'}::${etapaId}`
}

function lerTempoRefLocalStorage(chaveLS) {
  try {
    const bruto = localStorage.getItem(chaveLS)
    return bruto ? JSON.parse(bruto) : null
  } catch {
    return null
  }
}

// Um número só é "utilizável" como eficiência/tempo de referência se for
// finito e maior que zero. Qualquer outra coisa (NaN, undefined, 0, null)
// significa que a resolução falhou — e NÃO deve ser substituída em silêncio.
const valido = (n) => Number.isFinite(Number(n)) && Number(n) > 0
const numValido = (n) => (valido(n) ? Number(n) : null)
const arred2 = (n) => Math.round(n * 100) / 100

// Acumuladores de (peças × tempo por peça). `totalAcc` devolve o tempo total
// em minutos, ou null se QUALQUER etapa com produção não tiver o tempo
// (nada de valor inventado para completar).
const novoAcc = () => ({ q: 0, qOk: 0, s: 0 })
const somarAcc = (a, q, t) => {
  a.q += q
  if (t != null) { a.qOk += q; a.s += q * t }
}
const totalAcc = (a) => (a.q > 0 && a.qOk === a.q ? a.s : null)

const esperar = (ms) => new Promise(r => setTimeout(r, ms))

const COR_GRAFICO = { teorica: '#9db8b0', oficial: '#2563eb', real: '#16a34a' }

export default {
  name: 'PainelProfissionais',

  props: {
    filtro: { type: Object, default: () => ({}) },
  },

  setup() {
    return { store: useAuthStore() }
  },

  data() {
    return {
      modoOrdenacao: this.carregarModoOrdenacao(),
      mostrarDetalheOps: true,
      loading: true,
      socketConectado: false,
      busca: '',
      selecionado: null,
      abaAtiva: 'Etapas',
      tabs: ['Etapas', 'Por hora'],

      // Três filtros de eficiência INDEPENDENTES (cada um avalia o seu indicador)
      filtroEficienciaGeral: 'todos',
      filtroEficienciaFicha: 'todos',
      filtroEficienciaReferencia: 'todos',
      opcoesFaixa: [
        { valor: 'todos', rotulo: 'todas' },
        { valor: 'acima100', rotulo: 'acima de 100%' },
        { valor: 'entre80100', rotulo: 'entre 80% e 100%' },
        { valor: 'abaixo80', rotulo: 'abaixo de 80%' },
      ],

      filtroOpId: 'todas',
      ordenarPor: 'ranking',
      mostrarInsights: false,
      mostrarDetalhesAnalise: false,

      opsAtivas: [],
      funcionariosDia: [],
      pecas: [],
      tipoProducao: null,

      etapasPorId: new Map(),

      dataCarregada: null,
      ultimaBuscaId: 0,
      carregandoMeta: false,
    }
  },

  computed: {
    tempoDisponivelDia() {
      return this.obterMinutosTrabalhoDia(this.filtro?.data)
    },

    // ── TIPO DE PRODUÇÃO ──────────────────────────────────
    // Não depende mais de a busca ter terminado com sucesso: lê direto do
    // usuário logado e só usa o valor vindo do servidor como complemento.
    // Normaliza acento/caixa/espaços ("Fábrica", "FABRICA ", etc.).
    isFabrica() {
      const bruto = this.tipoProducao || this.store.pegar_usuario?.tipo_de_producao || ''
      const t = String(bruto)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
      return t.includes('fabrica')
    },

    todasHoras() {
      const horasSet = new Set()
      for (const func of this.funcionariosDia) {
        for (const linha of func.linhas || []) {
          for (const hora of Object.keys(linha.registros || {})) horasSet.add(hora)
        }
      }
      return [...horasSet].sort((a, b) => horaParaMinutos(a) - horaParaMinutos(b))
    },

    // ── MÉTRICAS (FONTE ÚNICA DOS TRÊS INDICADORES) ───────
    // Para cada profissional: { geral, ficha, referencia, origem, ... }.
    // Lista, filtros, ranking, ordenação e detalhamento leem SEMPRE daqui.
    mapaMetricas() {
      const mapa = new Map()
      for (const f of this.funcionariosDia || []) {
        mapa.set(f.email, this.calcularMetricasFuncionario(f))
      }
      return mapa
    },

    // 'referencia' só existe em estabelecimento de fábrica.
    modoRankingEfetivo() {
      const m = this.modoOrdenacao
      if (m === 'referencia' && !this.isFabrica) return 'geral'
      return ['geral', 'ficha', 'referencia'].includes(m) ? m : 'geral'
    },

    rotuloModoRanking() {
      return { geral: 'Geral', ficha: 'Ficha', referencia: 'Referência' }[this.modoRankingEfetivo]
    },

    // O ranking (posição/medalha) segue o indicador selecionado no toggle.
    funcionariosOrdenados() {
      const modo = this.modoRankingEfetivo
      return [...this.funcionariosDia]
        .sort((a, b) => this.valorMetrica(b, modo) - this.valorMetrica(a, modo))
        .map((f, i) => ({ ...f, _idx: i }))
    },

    filtrosEficienciaAtivos() {
      return (
        this.filtroEficienciaGeral !== 'todos' ||
        this.filtroEficienciaFicha !== 'todos' ||
        (this.isFabrica && this.filtroEficienciaReferencia !== 'todos')
      )
    },

    funcionariosFiltrados() {
      const q = this.busca.trim().toLowerCase()
      let lista = this.funcionariosOrdenados

      if (q) {
        lista = lista.filter(f =>
          (f.nome || '').toLowerCase().includes(q) ||
          (f.email || '').toLowerCase().includes(q) ||
          (f.linhas || []).some(l => (l.descricao || '').toLowerCase().includes(q))
        )
      }

      if (this.filtroOpId !== 'todas') {
        lista = lista.filter(f => (f.linhas || []).some(l => l.opId === this.filtroOpId))
      }

      // Cada filtro olha para a SUA métrica (propriedade distinta).
      if (this.filtrosEficienciaAtivos) {
        lista = lista.filter(f => {
          if (!this.temProducao(f)) return false
          const m = this.metricasFuncionario(f)
          if (!this.passaFaixaEficiencia(m.geral, this.filtroEficienciaGeral)) return false
          if (!this.passaFaixaEficiencia(m.ficha, this.filtroEficienciaFicha)) return false
          if (this.isFabrica && !this.passaFaixaEficiencia(m.referencia, this.filtroEficienciaReferencia)) return false
          return true
        })
      }

      if (this.ordenarPor !== 'ranking') {
        lista = [...lista].sort((a, b) => {
          if (this.ordenarPor === 'nome') return (a.nome || '').localeCompare(b.nome || '')
          if (this.ordenarPor === 'pecas') return this.calcularTotalFuncionario(b) - this.calcularTotalFuncionario(a)
          if (this.ordenarPor === 'geral') return this.valorMetrica(b, 'geral') - this.valorMetrica(a, 'geral')
          if (this.ordenarPor === 'ficha') return this.valorMetrica(b, 'ficha') - this.valorMetrica(a, 'ficha')
          if (this.ordenarPor === 'referencia') return this.valorMetrica(b, 'referencia') - this.valorMetrica(a, 'referencia')
          return 0
        })
      }

      return lista
    },

    funcSelecionado() {
      return this.selecionado !== null ? this.funcionariosOrdenados[this.selecionado] : null
    },

    metricasSelecionado() {
      return this.funcSelecionado ? this.metricasFuncionario(this.funcSelecionado) : null
    },

    diferencaSelecionada() {
      return this.funcSelecionado ? this.calcularDiferencaEficiencia(this.funcSelecionado) : null
    },

    // Auditoria do funcionário selecionado (valores oficiais do módulo
    // compartilhado, sem substituir a referência pela ficha).
    totaisFuncionarioSelecionado() {
      if (!this.funcSelecionado) return null
      return calcularTotaisFuncionarioDia(this.funcSelecionado, this.etapasPorId, null, this.filtro?.data) || null
    },

    funcionariosComProducao() {
      return this.funcionariosOrdenados.filter(f => this.temProducao(f))
    },

    eficienciaMediaTurma() {
      return this.eficienciaMediaPonderadaOps
    },
    eficienciaMediaTurmaReferencia() {
      return this.eficienciaMediaPonderadaOpsReferencia
    },

    // ── TURMA ─────────────────────────────────────────────
    // Geral da turma: tempo total escolhido (por profissional/etapa) ÷ tempo
    // total registrado × 100. Só entram profissionais com Geral disponível.
    eficienciaGeralTurma() {
      let usado = 0
      let registrado = 0
      for (const f of this.funcionariosComProducao) {
        const m = this.metricasFuncionario(f)
        if (m.totais.usado != null && valido(m.tempoRegistrado)) {
          usado += m.totais.usado
          registrado += m.tempoRegistrado
        }
      }
      return registrado > 0 ? arred2((usado / registrado) * 100) : null
    },

    // A média de referência da turma só é exibida se existir Tempo Referência
    // real em ao menos um profissional (sem mascarar a ficha como referência).
    eficienciaReferenciaTurmaExibida() {
      const algumaReferencia = this.funcionariosComProducao.some(f => this.metricasFuncionario(f).referencia != null)
      return algumaReferencia ? this.eficienciaMediaTurmaReferencia : null
    },

    gruposOpBrutos() {
      return agruparProducaoPorOp(this.funcionariosDia, this.etapasPorId, this.filtro?.data).filter(g => g.producao > 0)
    },

    etapasDistintasPorOp() {
      const mapa = new Map()
      for (const funcionario of this.funcionariosDia || []) {
        for (const linha of funcionario.linhas || []) {
          if (!linha?.opId || !calcularTotalLinha(linha, funcionario)) continue
          if (!mapa.has(linha.opId)) mapa.set(linha.opId, new Set())
          mapa.get(linha.opId).add(linha.descricao || linha.etapaId || '—')
        }
      }
      return mapa
    },

    // Resumo por OP. Se a referência da OP não pôde ser resolvida (tempo
    // total de referência ou eficiência zerados), cai para a ficha e marca
    // `refFallback` para a tela sinalizar com "*".
    gruposProducaoPorOp() {
      return this.gruposOpBrutos
        .map(g => {
          const resumo = resumoConsolidadoOp(g)
          const opAtiva = this.opsAtivas.find(o => o.pecaId === g.opId)
          const refFallback =
            !valido(resumo.eficienciaReferencia) || !valido(resumo.tempoReferenciaTotal)

          return {
            ...resumo,
            ...(refFallback && valido(resumo.eficienciaFicha)
              ? {
                  eficienciaReferencia: resumo.eficienciaFicha,
                  tempoReferenciaTotal: resumo.tempoPadraoTotal,
                }
              : {}),
            refFallback: refFallback && valido(resumo.eficienciaFicha),
            nome: this.nomeDaOp(g.opId),
            metaConfigurada: opAtiva?.metaDia ?? null,
            multiplasEtapas: (this.etapasDistintasPorOp.get(g.opId)?.size || 0) > 1,
          }
        })
        .sort((a, b) => b.producao - a.producao)
    },

    eficienciaMediaPonderadaOps() {
      return calcularEficienciaMediaPonderadaOps(this.gruposOpBrutos, false)
    },

    // A média de referência é a do módulo compartilhado; se ela falhar,
    // usa a média simples dos valores já exibidos nos cards (mesma fórmula
    // mostrada na tela), então o resumo por OP nunca fica vazio.
    eficienciaMediaPonderadaOpsReferencia() {
      const v = calcularEficienciaMediaPonderadaOps(this.gruposOpBrutos, true)
      if (valido(v)) return v
      const lista = this.gruposProducaoPorOp
      if (!lista.length) return 0
      return lista.reduce((s, g) => s + Number(g.eficienciaReferencia || 0), 0) / lista.length
    },

    temReferenciaIndisponivel() {
      return this.funcionariosComProducao.some(f => this.referenciaIndisponivelFuncionario(f))
    },

    totalPecasGeral() {
      return this.funcionariosComProducao.reduce(
        (soma, f) => soma + this.calcularTotalFinalizadoFuncionario(f),
        0
      )
    },

    insights() {
      const comProducao = this.funcionariosComProducao
      if (!comProducao.length) return null

      let melhorReferencia = null
      let maiorProducao = null
      let maiorDiferenca = null

      for (const f of comProducao) {
        const m = this.metricasFuncionario(f)
        const producao = this.calcularTotalFinalizadoFuncionario(f)

        if (this.isFabrica && m.referencia != null && (!melhorReferencia || m.referencia > melhorReferencia.valor)) {
          melhorReferencia = { nome: f.nome, valor: m.referencia }
        }
        if (!maiorProducao || producao > maiorProducao.valor) {
          maiorProducao = { nome: f.nome, valor: producao }
        }
        const diferenca = this.calcularDiferencaEficiencia(f)
        if (this.isFabrica && diferenca != null && diferenca > 0 && (!maiorDiferenca || diferenca > maiorDiferenca.valor)) {
          maiorDiferenca = { nome: f.nome, valor: diferenca }
        }
      }

      return { melhorReferencia, maiorProducao, maiorDiferenca }
    },

    // ── DETALHAMENTO DO PROFISSIONAL SELECIONADO ──────────
    // Só LÊ as métricas e funções oficiais; nada é recalculado por fora.
    analiseDetalhe() {
      const func = this.funcSelecionado
      const m = this.metricasSelecionado
      if (!func || !m || !m.producao) return null

      const tempoTrab = m.tempoRegistrado
      if (!valido(tempoTrab)) return null
      const producao = m.producao
      const t = m.totais

      // tempo por peça = tempo total ÷ peças (média ponderada pelas etapas)
      const porPeca = (total) => (total == null ? null : total / producao)
      // capacidade teórica = tempoTrabalhado ÷ tempoPorPeça (sem arredondar antes)
      const capDe = (tempoPeca) => (tempoPeca == null ? null : tempoTrab / tempoPeca)
      // eficiência comparativa (mesma base da oficial): tempo total ÷ trabalhado × 100
      const eficDe = (total) => (total == null ? null : (total / tempoTrab) * 100)

      const tPadrao = porPeca(t.padrao)
      const tFicha = porPeca(t.ficha)
      const tRef = this.isFabrica ? porPeca(t.ref) : null
      const tUsado = porPeca(t.usado)

      const linhaPadrao = {
        chave: 'padrao', rotulo: 'Tempo Padrão da Etapa', cenario: 'comparativo',
        tempo: tPadrao, capacidade: capDe(tPadrao), eficiencia: eficDe(t.padrao), destaque: false,
      }
      const linhaFicha = {
        chave: 'ficha', rotulo: 'Tempo Ficha', cenario: 'Eficiência Ficha',
        tempo: tFicha, capacidade: capDe(tFicha), eficiencia: m.ficha, destaque: false,
      }
      const linhaRef = this.isFabrica
        ? {
            chave: 'ref', rotulo: 'Tempo Referência Profissional', cenario: 'Eficiência Referência',
            tempo: tRef, capacidade: capDe(tRef), eficiencia: m.referencia, destaque: false,
          }
        : null
      const linhaGeral = {
        chave: 'efetivo', rotulo: 'Tempo Efetivamente Utilizado', cenario: 'Eficiência Geral — oficial',
        tempo: tUsado, capacidade: capDe(tUsado), eficiencia: m.geral, destaque: true,
      }

      const referencias = [linhaPadrao, linhaFicha]
      if (linhaRef) referencias.push(linhaRef)
      referencias.push(linhaGeral)

      // Explicação dinâmica (baseada nas escolhas reais por etapa)
      const escolhas = m.linhas
      const nRef = escolhas.filter(l => l.origem === 'referencia').length
      const nPad = escolhas.filter(l => l.origem === 'padrao').length
      const nSem = escolhas.filter(l => l.origem === null).length
      let explicacao
      if (!escolhas.length) {
        explicacao = 'Dados insuficientes para determinar o cenário da Eficiência Geral.'
      } else if (escolhas.length === 1) {
        explicacao = escolhas[0].motivo
      } else {
        const partes = []
        if (nRef) partes.push(`${nRef} etapa(s) usaram o Tempo Referência do Profissional (por ser menor que o Tempo Ficha)`)
        if (nPad) partes.push(`${nPad} etapa(s) usaram o Tempo Padrão da Etapa`)
        if (nSem) partes.push(`${nSem} etapa(s) não tinham tempo disponível`)
        explicacao = `A Eficiência Geral escolhe o tempo etapa a etapa: ${partes.join('; ')}. O motivo de cada etapa está detalhado abaixo.`
      }

      let aviso = null
      if (m.geral == null) {
        aviso = 'Há etapas com produção sem tempo disponível; a Eficiência Geral ficou indisponível em vez de usar um valor inventado.'
      }

      // Impacto Ficha × Referência (só com os dois tempos completos)
      let impacto = null
      if (this.isFabrica && tFicha != null && tRef != null) {
        const capFicha = capDe(tFicha)
        const capRef = capDe(tRef)
        impacto = {
          tempoFicha: tFicha,
          tempoRef: tRef,
          difMin: tRef - tFicha,
          varPct: ((tRef - tFicha) / tFicha) * 100,
          capFicha,
          capRef,
          impactoPecas: capRef - capFicha,
        }
      }

      const grafico = [
        { chave: 'g-padrao', rotulo: 'Tempo Padrão da Etapa (capacidade)', valor: linhaPadrao.capacidade, tipo: 'teorica' },
        { chave: 'g-ficha', rotulo: 'Tempo Ficha (capacidade)', valor: linhaFicha.capacidade, tipo: 'teorica' },
      ]
      if (linhaRef) {
        grafico.push({ chave: 'g-ref', rotulo: 'Tempo Referência (capacidade)', valor: linhaRef.capacidade, tipo: 'teorica' })
      }
      grafico.push({ chave: 'g-geral', rotulo: 'Tempo Efetivo — Geral oficial (capacidade)', valor: linhaGeral.capacidade, tipo: 'oficial' })
      grafico.push({ chave: 'g-real', rotulo: 'Produção real', valor: producao, tipo: 'real' })

      return {
        producao,
        tempoTrabalhado: tempoTrab,
        origem: m.origem,
        geral: linhaGeral,
        ficha: linhaFicha,
        referenciaProf: linhaRef,
        multiplasEtapas: escolhas.length > 1,
        referencias,
        escolhas,
        explicacao,
        aviso,
        impacto,
        grafico,
      }
    },
  },

  watch: {
    filtro: {
      deep: true,
      handler() {
        this.buscarMetaDia()
      },
    },
    selecionado() {
      this.mostrarDetalhesAnalise = false
      this.renderizarGrafico()
    },
    mostrarDetalhesAnalise() {
      this.renderizarGrafico()
    },
    analiseDetalhe() {
      this.renderizarGrafico()
    },
  },

  async mounted() {
    this.iniciarSocket()
    await this.aguardarConexaoSocket()
    await this.garantirEtapas()
    await this.buscarMetaDia()

    this._intervaloRetentativa = setInterval(() => {
      if (socket.connected) this.buscarMetaDia()
    }, 30000)
  },

  beforeUnmount() {
    this.destruirGrafico()
    clearInterval(this._intervaloRetentativa)
    socket.off()
    socket.disconnect()
  },

  methods: {
    obterMinutosTrabalhoDia(dataFiltro) {
      try {
        const salvo = localStorage.getItem(LOCAL_STORAGE_MINUTOS_KEY)
        if (salvo && !isNaN(Number(salvo))) return Number(salvo)
      } catch { /* ignora falha de storage */ }
      return minutosDisponiveisDia(dataFiltro)
    },

    // ── MÉTRICAS: FICHA / REFERÊNCIA / GERAL (OFICIAL) ────
    // Tempo Padrão da Etapa  = linha.tempoPadrao (tempo da etapa)
    // Tempo Ficha            = resolverTempoPadrao(...)  (o mesmo que a Eficiência Ficha usa)
    // Tempo Referência Prof. = resolverTempoReferenciaComOrigem(...)
    //
    // Regra da Eficiência Geral, decidida POR ETAPA e pelo valor dos TEMPOS:
    //   usarReferencia = tempoRef != null && tempoFicha != null && tempoRef < tempoFicha
    //   tempoEfetivo   = usarReferencia ? tempoRef : tempoPadraoEtapa
    resolverTempoOficialLinha(func, linha, quantidade) {
      const tFicha = numValido(resolverTempoPadrao(linha, this.etapasPorId))
      // fallback existente: sem tempo na etapa, usa o tempo resolvido da ficha
      const tPadrao = numValido(linha.tempoPadrao) ?? tFicha
      const tRef = this.isFabrica
        ? this.extrairTempoRef(resolverTempoReferenciaComOrigem(func, linha, this.etapasPorId, null, this.filtro?.data))
        : null

      const usarReferencia = tRef != null && tFicha != null && tRef < tFicha
      const tUsado = usarReferencia ? tRef : tPadrao
      const origem = tUsado == null ? null : (usarReferencia ? 'referencia' : 'padrao')

      return {
        id: linha.id,
        etapa: linha.descricao || linha.etapaId || '—',
        quantidade,
        tPadrao,
        tFicha,
        tRef,
        tUsado,
        origem,
        motivo: this.motivoEscolhaOficial({ tPadrao, tFicha, tRef, origem }),
      }
    },

    motivoEscolhaOficial({ tPadrao, tFicha, tRef, origem }) {
      const f2 = (n) => this.formatarDecimal(n)
      if (origem === 'referencia') {
        return `A Eficiência Geral utiliza o Tempo Referência do Profissional (${f2(tRef)} min), pois esse tempo é menor que o Tempo Ficha (${f2(tFicha)} min).`
      }
      if (origem === null) {
        return 'Dados insuficientes: não há Tempo Padrão da Etapa nem Tempo Ficha disponíveis, então a Eficiência Geral não pôde ser determinada para esta etapa.'
      }
      if (tRef == null) {
        return `A Eficiência Geral utiliza o Tempo Padrão da Etapa (${f2(tPadrao)} min) porque não existe Tempo Referência do Profissional disponível.`
      }
      if (tFicha == null) {
        return `A Eficiência Geral utiliza o Tempo Padrão da Etapa (${f2(tPadrao)} min) porque não há Tempo Ficha para comparar com o Tempo Referência do Profissional (${f2(tRef)} min).`
      }
      return `A Eficiência Geral utiliza o Tempo Padrão da Etapa (${f2(tPadrao)} min), pois o Tempo Referência do Profissional (${f2(tRef)} min) não é menor que o Tempo Ficha (${f2(tFicha)} min).`
    },

    calcularMetricasFuncionario(func) {
      const data = this.filtro?.data
      const producao = this.calcularTotalFuncionario(func)
      const totaisVazios = { padrao: null, ficha: null, ref: null, usado: null }

      if (!producao) {
        return {
          producao: 0, tempoRegistrado: 0,
          geral: 0, ficha: 0, referencia: null,
          origem: null, linhas: [], totais: totaisVazios,
        }
      }

      // FICHA — função oficial, independente da Geral.
      const fichaBruta = Number(calcularEficienciaFuncionarioPadrao(func, this.etapasPorId, null, data))
      const ficha = Number.isFinite(fichaBruta) ? fichaBruta : null

      // REFERÊNCIA — função oficial; se não houver Tempo Referência válido,
      // fica null (exibido como "—"), sem usar a ficha no lugar.
      let referencia = null
      if (this.isFabrica) {
        const r = Number(calcularEficienciaFuncionarioReferencia(func, this.etapasPorId, null, data))
        referencia = valido(r) ? r : null
      }

      // GERAL (OFICIAL) — escolha por etapa e soma de (peças × tempo escolhido).
      const tot = calcularTotaisFuncionarioDia(func, this.etapasPorId, null, data)
      const tempoRegistradoBruto = Number(tot?.tempoRegistrado)
      const tempoRegistrado = valido(tempoRegistradoBruto) ? tempoRegistradoBruto : 0

      const acc = { padrao: novoAcc(), ficha: novoAcc(), ref: novoAcc(), usado: novoAcc() }
      const linhas = []
      for (const linha of func.linhas || []) {
        const q = calcularTotalLinha(linha, func)
        if (!q) continue
        const info = this.resolverTempoOficialLinha(func, linha, q)
        linhas.push(info)
        somarAcc(acc.padrao, q, info.tPadrao)
        somarAcc(acc.ficha, q, info.tFicha)
        somarAcc(acc.ref, q, info.tRef)
        somarAcc(acc.usado, q, info.tUsado)
      }

      const totais = {
        padrao: totalAcc(acc.padrao),
        ficha: totalAcc(acc.ficha),
        ref: this.isFabrica ? totalAcc(acc.ref) : null,
        usado: totalAcc(acc.usado),
      }

      const geral =
        tempoRegistrado > 0 && totais.usado != null
          ? arred2((totais.usado / tempoRegistrado) * 100)
          : null

      const nRef = linhas.filter(l => l.origem === 'referencia').length
      const nPad = linhas.filter(l => l.origem === 'padrao').length
      const origem = nRef && nPad ? 'misto' : nRef ? 'referencia' : nPad ? 'padrao' : null

      return { producao, tempoRegistrado, geral, ficha, referencia, origem, linhas, totais }
    },

    metricasFuncionario(func) {
      return (
        this.mapaMetricas.get(func?.email) || {
          producao: 0, tempoRegistrado: 0,
          geral: null, ficha: null, referencia: null,
          origem: null, linhas: [],
          totais: { padrao: null, ficha: null, ref: null, usado: null },
        }
      )
    },

    // Valor numérico para ordenar; indisponível vai para o fim da lista.
    valorMetrica(func, modo) {
      const v = this.metricasFuncionario(func)[modo]
      return v == null ? -1 : v
    },

    passaFaixaEficiencia(valor, faixa) {
      if (faixa === 'todos') return true
      if (valor == null) return false
      if (faixa === 'acima100') return valor >= 100
      if (faixa === 'entre80100') return valor >= 80 && valor < 100
      if (faixa === 'abaixo80') return valor < 80
      return true
    },

    referenciaIndisponivelFuncionario(func) {
      return this.isFabrica && this.temProducao(func) && this.metricasFuncionario(func).referencia == null
    },

    // Diferença Referência − Ficha; null se algum dos dois não existir.
    calcularDiferencaEficiencia(func) {
      if (!this.isFabrica) return null
      const m = this.metricasFuncionario(func)
      if (m.referencia == null || m.ficha == null) return null
      return Math.round((m.referencia - m.ficha) * 100) / 100
    },

    // ── ORDENAÇÃO ─────────────────────────────────────────
    definirModoOrdenacao(modo) {
      this.modoOrdenacao = modo
      try { localStorage.setItem(LS_MODO_RANKING, modo) } catch { /* ignora */ }
    },

    carregarModoOrdenacao() {
      try {
        const salvo = localStorage.getItem(LS_MODO_RANKING)
        return salvo === 'referencia' || salvo === 'ficha' ? salvo : 'geral'
      } catch {
        return 'geral'
      }
    },

    alternarFiltroOp(opId) {
      this.filtroOpId = this.filtroOpId === opId ? 'todas' : opId
    },

    // ── SOCKET ────────────────────────────────────────────
    iniciarSocket() {
      socket.off('connect')
      socket.off('disconnect')

      const cnpj = this.store.pegar_usuario?.cnpj
      if (cnpj) socket.off(`nova_atualizacao_${cnpj}`)

      socket.on('connect', () => {
        this.socketConectado = true
        if (this._jaConectouUmaVez) this.buscarMetaDia()
        this._jaConectouUmaVez = true
      })
      socket.on('disconnect', () => { this.socketConectado = false })

      if (cnpj) socket.on(`nova_atualizacao_${cnpj}`, () => this.onAtualizacaoRemota())

      if (!socket.connected) socket.connect()
      else this.socketConectado = true
    },

    onAtualizacaoRemota: debounce(function () {
      this.buscarMetaDia()
    }, 800),

    aguardarConexaoSocket(timeoutMs = 5000) {
      if (socket.connected) {
        this.socketConectado = true
        return Promise.resolve()
      }
      return new Promise(resolve => {
        const timeout = setTimeout(() => {
          socket.off('connect', onConnect)
          resolve()
        }, timeoutMs)
        const onConnect = () => { clearTimeout(timeout); resolve() }
        socket.once('connect', onConnect)
      })
    },

    emitirComAck(evento, payload, timeoutMs = 8000) {
      return new Promise((resolve, reject) => {
        let finalizado = false
        const timeout = setTimeout(() => {
          if (finalizado) return
          finalizado = true
          reject(new Error('Tempo esgotado aguardando confirmação do servidor.'))
        }, timeoutMs)

        socket.emit(evento, payload, (resposta) => {
          if (finalizado) return
          finalizado = true
          clearTimeout(timeout)
          resolve(resposta)
        })
      })
    },

    // ── PEÇAS / ETAPAS (base do tempo de referência) ──────
    // O tempo de referência de cada profissional vem das etapas das peças.
    // Se esse carregamento falha (servidor "dormindo" no Render, rede, etc.)
    // ou chega depois do cálculo, a referência some. Por isso:
    //  - tentamos até 3 vezes com espera crescente;
    //  - uma única promise compartilhada evita corrida entre chamadas;
    //  - aceitamos qualquer lista de peças devolvida (não só em_progresso).
    garantirEtapas() {
      if (this.etapasPorId.size) return Promise.resolve()
      if (!this._promessaEtapas) {
        this._promessaEtapas = this.carregarPecas().finally(() => { this._promessaEtapas = null })
      }
      return this._promessaEtapas
    },

    async carregarPecas() {
      for (let tentativa = 1; tentativa <= 3; tentativa++) {
        try {
          const res = await api.get('/pecas', {
            headers: { Authorization: this.store.pegar_token },
          })

          const grupos = res.data?.peca || {}
          const todas = []
          const vistos = new Set()
          for (const lista of Object.values(grupos)) {
            if (!Array.isArray(lista)) continue
            for (const p of lista) {
              const chave = p?.id_da_op ?? p
              if (vistos.has(chave)) continue
              vistos.add(chave)
              todas.push(p)
            }
          }

          const indice = new Map()
          for (const peca of todas) {
            for (const etapa of (peca.etapas || [])) {
              const idFuncao = etapa.id_da_funcao || etapa.etapa?.id_da_funcao
              if (!idFuncao) continue
              if (!indice.has(idFuncao)) indice.set(idFuncao, [])
              indice.get(idFuncao).push(etapa)
            }
          }

          this.pecas = todas
          this.etapasPorId = indice
          this._ultimoCarregamentoPecas = Date.now()
          if (indice.size) return
        } catch (err) {
          console.error('Falha ao carregar peças (tentativa ' + tentativa + ')', err)
        }
        await esperar(1500 * tentativa)
      }
    },

    nomeDaOp(pecaId) {
      const opAtiva = this.opsAtivas.find(o => o.pecaId === pecaId)
      if (opAtiva?.descricao) return String(opAtiva.descricao)

      const peca = this.pecas.find(p => p.id_da_op === pecaId)
      return String(peca?.descricao || peca?.descricaoPeca || pecaId)
    },

    // ── BUSCAR META ───────────────────────────────────────
    async buscarMetaDia() {
      await this.aguardarConexaoSocket()
      // Nunca calcula eficiência sem o índice de etapas.
      await this.garantirEtapas()

      const dataDaRequisicao = this.filtro
      this.ultimaBuscaId = (this.ultimaBuscaId || 0) + 1
      const buscaId = this.ultimaBuscaId
      this.carregandoMeta = true
      this.loading = this.dataCarregada === null

      try {
        const response = await this.emitirComAck('buscar-meta-dia', {
          estabelecimento: this.filtro.estabelecimento ?? this.store.pegar_usuario.cnpj,
          data: dataDaRequisicao,
        })
        if (buscaId !== this.ultimaBuscaId) return
        this.carregandoMeta = false
        this.loading = false
        if (!response?.sucesso) return

        const meta = response.metaDia

        // O tipo de produção é definido ANTES de qualquer retorno antecipado.
        const usuario = this.store.pegar_usuario
        this.tipoProducao =
          usuario?.tipo_de_producao ||
          meta?.Estabelecimento?.tipo_de_producao ||
          meta?.tipo_de_producao ||
          this.tipoProducao ||
          null

        if (!meta) {
          this.opsAtivas = []
          this.funcionariosDia = []
          this.dataCarregada = dataDaRequisicao
          return
        }

        // Se alguma OP do dia não está no índice de peças (OP nova), recarrega
        // uma vez (no máximo a cada 30s) para ter os tempos de referência dela.
        const opDesconhecida = (meta.pecas || []).some(
          p => p?.id_da_op != null && !this.pecas.some(x => x.id_da_op === p.id_da_op)
        )
        if (opDesconhecida && Date.now() - (this._ultimoCarregamentoPecas || 0) > 30000) {
          await this.carregarPecas()
          if (buscaId !== this.ultimaBuscaId) return
        }

        this.opsAtivas = (meta.pecas || []).map(p => ({
          pecaId: p.id_da_op,
          metaDia: p.meta || 0,
          tempoPadrao: p.peca?.tempo_padrao || 0,
          status: p.peca?.status,
          descricao: p.peca?.descricao,
        }))

        const pecasPorOpId = new Map()
        for (const p of meta.pecas || []) {
          if (p?.id_da_op != null) pecasPorOpId.set(p.id_da_op, p)
        }

        const novosFuncionarios = []

        for (const metaFunc of meta.funcionarios || []) {
          const linhas = []

          for (const producao of metaFunc.producoes || []) {
            const etapaId = producao.id_da_funcao
            const opId = producao.id_da_op || null

            const pecaDaOp = opId != null ? pecasPorOpId.get(opId) : null
            const tempoPadraoPeca = Number(pecaDaOp?.peca?.tempo_padrao || 0)

            let linha = linhas.find(l => l.etapaId === etapaId && l.opId === opId)
            if (!linha) {
              linha = {
                id: `${metaFunc.funcionarioId}-${etapaId}-${opId || 'sem-op'}`,
                tipo: linhas.length === 0 ? 'principal' : 'extra',
                etapaId,
                descricao: producao.producao_etapa?.descricao || '',
                tempoPadrao: producao.producao_etapa?.tempo_padrao || 0,
                opId,
                opDescricao: pecaDaOp?.peca?.descricao || '',
                tempoPadraoPeca,
                modoTempo: 'padrao',
                referenciaSelecionadaId: null,
                registros: {},
              }
              linhas.push(linha)
            }

            const hora = producao.hora_registro
            if (!hora) continue

            linha.registros[hora] = {
              quantidade: producao.quantidade_pecas || 0,
              tempoProduzido: producao.tempo_produzido || 60,
            }
          }

          novosFuncionarios.push({
            email: metaFunc.funcionarioId,
            nome: metaFunc.funcionario?.nome || metaFunc.funcionarioId,
            foto: metaFunc.funcionario?.foto || null,
            ausencia: metaFunc.ausencia || null,
            linhas,
          })
        }

        // Restaura as escolhas de tempo ANTES de publicar os dados no estado
        // reativo. Antes, a restauração alterava objetos depois da atribuição,
        // o que em Vue 3 não dispara recálculo e podia deixar a tela com o
        // modo antigo.
        this.restaurarModoTempoReferencia(novosFuncionarios)

        this.funcionariosDia = novosFuncionarios
        this.dataCarregada = dataDaRequisicao
      } catch (err) {
        console.error(err)
        this.carregandoMeta = false
        this.loading = false
      }
    },

    restaurarModoTempoReferencia(funcionarios) {
      const estabelecimento = this.store.pegar_usuario?.cnpj || ''
      const data = this.filtro?.data
      if (!estabelecimento || !data) return

      for (const func of funcionarios || []) {
        for (const linha of func.linhas || []) {
          if (!linha.etapaId) continue
          const chaveLS = chaveLocalStorageTempoRef(estabelecimento, data, func.email, linha.opId, linha.etapaId)
          const escolha = lerTempoRefLocalStorage(chaveLS)
          if (escolha && (escolha.modoTempo === 'padrao' || escolha.referenciaSelecionadaId)) {
            linha.modoTempo = escolha.modoTempo
            linha.referenciaSelecionadaId = escolha.referenciaSelecionadaId || null
          }
        }
      }
    },

    isEtapaFinal(linha) {
      return isEtapaFinal(linha)
    },

    // ── TOTAIS ────────────────────────────────────────────
    calcularTotalLinha(linha) {
      return calcularTotalLinha(linha, this.funcSelecionado)
    },

    calcularTotalFuncionario(func) {
      if (!Array.isArray(func?.linhas)) return 0
      return func.linhas.reduce((soma, linha) => soma + calcularTotalLinha(linha, func), 0)
    },

    calcularTotalFinalizadoFuncionario(func) {
      return calcularPecasFinalizadasFuncionario(func)
    },

    temProducao(func) {
      return this.calcularTotalFuncionario(func) > 0
    },

    // ── EFICIÊNCIA POR ETAPA (aba "Etapas") ───────────────
    calcularEficienciaLinha(linha) {
      return calcularEficienciaLinhaPadrao(linha, this.funcSelecionado, this.etapasPorId)
    },

    calcularEficienciaReferenciaLinha(linha) {
      const ref = calcularEficienciaLinhaReferencia(this.funcSelecionado, linha, this.etapasPorId, null, this.filtro?.data)
      return valido(ref) ? ref : this.calcularEficienciaLinha(linha)
    },

    referenciaEhFallbackLinha(linha) {
      if (!this.isFabrica || !this.funcSelecionado) return false
      const ref = calcularEficienciaLinhaReferencia(this.funcSelecionado, linha, this.etapasPorId, null, this.filtro?.data)
      return !valido(ref) && valido(this.calcularEficienciaLinha(linha))
    },

    tempoEfetivoLinha(linha) {
      const t = resolverTempoEfetivoReferencia(this.funcSelecionado, linha, this.etapasPorId, null, this.filtro?.data)
      return valido(t) ? t : Number(linha.tempoPadrao || 0)
    },

    // ── POR HORA ──────────────────────────────────────────
    horasPorFuncionario(func) {
      if (!func?.linhas?.length) return []
      const resultado = []

      for (const hora of this.todasHoras) {
        if (horaBloqueadaPorAusencia(func, hora)) continue

        const etapas = []
        let totalPecas = 0
        let somaProduzida = 0
        let somaProduzidaReferencia = 0
        let somaTempoProduzido = 0

        for (const linha of func.linhas) {
          const reg = linha.registros?.[hora]
          if (!reg || !reg.quantidade || !reg.tempoProduzido) continue

          const tempoPadrao = resolverTempoPadrao(linha, this.etapasPorId)
          let tempoEfetivo = resolverTempoEfetivoReferencia(func, linha, this.etapasPorId, null, this.filtro?.data)
          if (!valido(tempoEfetivo)) tempoEfetivo = tempoPadrao

          const eficiencia = calcularEficienciaRegistroPadrao(reg.quantidade, reg.tempoProduzido, linha, this.etapasPorId)
          let eficienciaReferencia = calcularEficienciaRegistroReferencia(reg.quantidade, reg.tempoProduzido, linha, func, this.etapasPorId, null, this.filtro?.data)
          if (!valido(eficienciaReferencia)) eficienciaReferencia = eficiencia

          etapas.push({
            descricao: linha.descricao || linha.etapaId || '—',
            isFinal: isEtapaFinal(linha),
            quantidade: reg.quantidade,
            tempoProduzido: reg.tempoProduzido,
            eficiencia,
            eficienciaReferencia,
          })

          totalPecas += reg.quantidade
          somaProduzida += reg.quantidade * tempoPadrao
          somaProduzidaReferencia += reg.quantidade * tempoEfetivo
          somaTempoProduzido += reg.tempoProduzido
        }

        if (!etapas.length) continue

        resultado.push({
          hora,
          etapas,
          totalPecas,
          eficiencia: somaTempoProduzido ? Math.round((somaProduzida / somaTempoProduzido) * 10000) / 100 : 0,
          eficienciaReferencia: somaTempoProduzido ? Math.round((somaProduzidaReferencia / somaTempoProduzido) * 10000) / 100 : 0,
        })
      }

      return resultado
    },

    // ── HELPERS DE UI ─────────────────────────────────────
    // Faixas legadas (OPs, etapas, por hora): >= 90 verde · >= 60 amarelo.
    clsEfic(pct) {
      const n = parseFloat(pct)
      if (n >= 90) return 'verde'
      if (n >= 60) return 'amarelo'
      return 'vermelho'
    },

    // Faixas das TRÊS eficiências (só visuais): > 75 verde · > 60 amarelo · <= 60 vermelho.
    // Calculada individualmente para cada valor; indisponível fica neutro.
    clsEficPrincipal(pct) {
      if (pct === null || pct === undefined) return 'neutro'
      const n = parseFloat(pct)
      if (isNaN(n)) return 'neutro'
      if (n > 75) return 'verde'
      if (n > 60) return 'amarelo'
      return 'vermelho'
    },

    legendaEfic(pct) {
      if (pct === null || pct === undefined) return 'Eficiência indisponível'
      const n = parseFloat(pct)
      if (n > 75) return 'Eficiência dentro da meta'
      if (n > 60) return 'Eficiência próxima da meta'
      return 'Eficiência abaixo da meta'
    },

    formatarEficiencia(valor) {
      const n = Number(valor)
      if (!n || isNaN(n)) return '0,00'
      return n.toFixed(2).replace('.', ',')
    },

    formatarDecimal(valor) {
      if (valor === null || valor === undefined) return '—'
      const n = Number(valor)
      if (isNaN(n)) return '—'
      return n.toFixed(2).replace('.', ',')
    },

    formatarOrigem(origem) {
      const origens = {
        manual: 'selecionado manualmente',
        peca: 'tempo específico do profissional nesta OP',
        ultimo_registrado: 'último registrado do profissional para esta etapa',
      }
      return origens[origem] || origem || 'desconhecida'
    },

    // Origem do tempo da Eficiência Geral. `curto` para a coluna da lista.
    rotuloOrigem(origem, curto = false) {
      if (origem === 'referencia') return curto ? 'Referência' : 'Referência Profissional'
      if (origem === 'padrao') return curto ? 'Padrão da Etapa' : 'Tempo Padrão da Etapa'
      if (origem === 'misto') return curto ? 'Misto' : 'Misto (varia por etapa)'
      return curto ? '—' : 'Indisponível'
    },

    obterOrigemRefLinha(linha) {
      if (!this.funcSelecionado || !this.isFabrica) return null
      const { origem } = resolverTempoReferenciaComOrigem(
        this.funcSelecionado, linha, this.etapasPorId, null, this.filtro?.data
      ) || {}
      return origem || null
    },

    selecionar(idx) {
      if (this.selecionado === idx) { this.selecionado = null; return }
      this.selecionado = idx
      this.abaAtiva = 'Etapas'
    },

    initials(nome) {
      return (nome || '').split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
    },

    onImgError(e) { e.target.style.display = 'none' },

    // Tolerante ao formato de retorno de resolverTempoReferenciaComOrigem.
    extrairTempoRef(r) {
      if (r == null) return null
      if (typeof r === 'number') return numValido(r)
      return numValido(r.tempoRef ?? r.tempo ?? r.tempoReferencia ?? r.valor)
    },

    fmtPct(v) {
      return v === null || v === undefined || isNaN(Number(v)) ? '—' : this.formatarEficiencia(v) + '%'
    },

    larguraBarra(v) {
      return v === null || v === undefined || isNaN(Number(v)) ? '0%' : Math.min(Number(v), 100) + '%'
    },

    fmtTempo(v) {
      return v === null || v === undefined ? '—' : this.formatarDecimal(v)
    },

    fmtMin(v) {
      return v === null || v === undefined ? 'indisponível' : this.formatarDecimal(v) + ' min'
    },

    // Totais vindos do módulo compartilhado: sem valor válido = indisponível.
    fmtTempoTotal(v) {
      return valido(v) ? v + ' min' : 'indisponível'
    },

    fmtDif(v) {
      return v === null || v === undefined ? '—' : this.fmtSinal(v, 2) + '%'
    },

    fmtPecas(n) {
      if (n == null || isNaN(Number(n))) return '—'
      return Math.round(Number(n)).toLocaleString('pt-BR')
    },

    fmtSinal(n, casas) {
      if (n == null || isNaN(Number(n))) return '—'
      const v = Number(n).toFixed(casas).replace('.', ',')
      return Number(n) > 0 ? '+' + v : v
    },

    // ── GRÁFICO ───────────────────────────────────────────
    destruirGrafico() {
      if (this._chart) {
        this._chart.destroy()
        this._chart = null
      }
    },

    async renderizarGrafico() {
      // Espera o Vue montar (ou remover) o <canvas> antes de mexer no Chart.
      await this.$nextTick()

      const visivel = this.mostrarDetalhesAnalise && this.selecionado !== null && this.analiseDetalhe
      const canvas = this.$refs.canvasProducao
      if (!visivel || !canvas) {
        this.destruirGrafico()
        return
      }

      const itens = this.analiseDetalhe.grafico.filter(g => g.valor != null)
      this.destruirGrafico() // evita "Canvas is already in use"
      if (!itens.length) return

      this._chart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: itens.map(g => g.rotulo),
          datasets: [{
            data: itens.map(g => g.valor),
            backgroundColor: itens.map(g => COR_GRAFICO[g.tipo] || COR_GRAFICO.teorica),
            borderRadius: 4,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${Math.round(ctx.parsed.x).toLocaleString('pt-BR')} peças`,
              },
            },
          },
          scales: {
            x: { beginAtZero: true, title: { display: true, text: 'peças' } },
          },
        },
      })
    },

    rankIcon(i) {
      return ['🥇', '🥈', '🥉'][i] ?? i + 1
    },
  },
}
</script>

<style scoped>
.ref-aviso {
  margin-top: 12px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--a700);
  background: var(--a100);
  border-radius: var(--rs);
}

.painel {
  --g900: #052e16;
  --g800: #14532d;
  --g700: #166534;
  --g600: #16a34a;
  --g200: #bbf7d0;
  --g100: #dcfce7;
  --g50:  #f0fdf4;

  --a700: #92400e;
  --a600: #d97706;
  --a100: #fef3c7;

  --r700: #991b1b;
  --r600: #dc2626;
  --r100: #fee2e2;

  --ink:  #0d1512;
  --ink2: #2d3f39;
  --ink3: #6b7f79;
  --line: #e3e8e6;
  --surf: #f6f8f7;
  --bg:   #ffffff;

  --rc: 10px;
  --rp: 999px;
  --rs: 6px;

  font-size: 14px;
  line-height: 1.5;
  border-radius: 10px;
  background: var(--bg);
  color: var(--ink);
  width: 100%;
  box-sizing: border-box;
  padding: 0;
}

/* ══════════════ HERO / CABEÇALHO ══════════════ */
.hero {
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--line);
  background: var(--bg);
}

.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.hero-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hero-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
  letter-spacing: -.01em;
}

.socket-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink3);
  background: var(--surf);
  border: 1px solid var(--line);
  border-radius: var(--rp);
  padding: 3px 10px 3px 8px;
}

.socket-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--r600);
  flex-shrink: 0;
  transition: background .3s;
}

.socket-dot.conectado { background: var(--g600); }
.socket-pill.conectado { color: var(--g700); }

.btn-ghost {
  height: 32px;
  padding: 0 14px;
  border-radius: var(--rp);
  border: 1px solid var(--line);
  background: var(--surf);
  color: var(--ink2);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background .12s, border-color .12s;
  font-family: inherit;
}
.btn-ghost:hover { background: var(--line); }

/* Grade principal de indicadores: eficiências em destaque + compactos */
.hero-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(160px, 1fr)) 1fr;
  gap: 12px;
  align-items: stretch;
}

.metric-featured {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  background: var(--g800);
  border-radius: var(--rc);
  padding: 16px 20px;
  min-height: 84px;
}

.metric-featured.solo { grid-column: span 2; }

.mf-label {
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .09em;
  color: var(--g200);
}

.mf-origem {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .05em;
  color: var(--g100);
}

.mf-val {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -.03em;
  line-height: 1;
}
.mf-val small { font-size: 17px; font-weight: 600; opacity: .8; }

.metrics-compact {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.metric-chip {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  background: var(--surf);
  border: 1px solid var(--line);
  border-radius: var(--rc);
  padding: 10px 16px;
}

.mc-label {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--ink3);
}

.mc-val {
  font-size: 18px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: -.02em;
}

.peca-chip {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Insights ── */
.insights-bar { margin-top: 14px; }

.insights-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--ink2);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 0;
  font-family: inherit;
}

.insights-chevron {
  display: inline-block;
  transition: transform .15s ease;
  color: var(--ink3);
}
.insights-chevron.open { transform: rotate(90deg); }

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.insight-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surf);
  border: 1px solid var(--line);
  border-radius: var(--rc);
  padding: 10px 14px;
}

.insight-icon { font-size: 18px; line-height: 1; }

.insight-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }

.insight-label {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--ink3);
}

.insight-val {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fade-collapse-enter-active, .fade-collapse-leave-active {
  transition: opacity .15s ease, max-height .2s ease;
  overflow: hidden;
}
.fade-collapse-enter-from, .fade-collapse-leave-to {
  opacity: 0;
  max-height: 0;
}
.fade-collapse-enter-to, .fade-collapse-leave-from {
  opacity: 1;
  max-height: 200px;
}

/* ══════════════ DETALHE POR OP ══════════════ */
.ops-detalhe {
  padding: 16px 24px;
  border-bottom: 1px solid var(--line);
  background: var(--surf);
}

.ops-detalhe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.op-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--rc);
  padding: 14px 16px;
  cursor: pointer;
  font-family: inherit;
  transition: border-color .12s, box-shadow .12s, transform .1s;
}

.op-card:hover { border-color: var(--g600); }
.op-card:active { transform: scale(.995); }
.op-card.ativa {
  border-color: var(--g600);
  box-shadow: 0 0 0 2px var(--g100);
}

.op-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.op-card-nome {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.op-detalhe-tag {
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--a700);
  background: var(--a100);
  border-radius: var(--rp);
  padding: 2px 7px;
  white-space: nowrap;
  flex-shrink: 0;
}

.op-card-numeros {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px 14px;
}

.op-num { display: flex; flex-direction: column; gap: 1px; }

.op-num-val {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.op-num-val small { font-size: 11px; font-weight: 600; color: var(--ink3); margin-left: 2px; }

.op-num-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--ink3);
  text-transform: uppercase;
  letter-spacing: .04em;
}

.op-card-eficiencias {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.op-card-formulas {
  border-top: 1px dashed var(--line);
  padding-top: 8px;
  margin-top: -2px;
}

.op-card-formulas summary {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--ink3);
  cursor: pointer;
  list-style: none;
}
.op-card-formulas summary::-webkit-details-marker { display: none; }
.op-card-formulas summary:hover { color: var(--ink2); }

.op-detalhe-formula {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: monospace;
  font-size: 11px;
  color: var(--ink3);
  flex-wrap: wrap;
  margin-top: 6px;
}

.formula-expr { color: var(--ink3); }
.formula-result { font-weight: 700; }
.formula-result.verde    { color: var(--g700); }
.formula-result.amarelo  { color: var(--a600); }
.formula-result.vermelho { color: var(--r600); }

/* Resumo das médias — dois cards lado a lado */
.resumo-medias {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 14px;
}
.resumo-medias.single { grid-template-columns: 1fr; }

.resumo-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--rc);
  padding: 14px 16px;
}

.resumo-icon { font-size: 16px; margin-bottom: 2px; }

.resumo-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink3);
}

.resumo-valor {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -.02em;
}
.resumo-valor.verde    { color: var(--g700); }
.resumo-valor.amarelo  { color: var(--a600); }
.resumo-valor.vermelho { color: var(--r600); }

.resumo-formula {
  font-family: monospace;
  font-size: 10.5px;
  color: var(--ink3);
  word-break: break-all;
  margin-top: 2px;
}

/* ══════════════ FILTROS ══════════════ */
.filtros-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  border-bottom: 1px solid var(--line);
}

.search-input {
  font-size: 13px;
  padding: 6px 12px;
  border: 1px solid var(--line);
  border-radius: var(--rp);
  background: var(--surf);
  color: var(--ink);
  width: 220px;
  transition: border-color .15s;
  font-family: inherit;
}
.search-input:focus { outline: none; border-color: var(--g600); }

.filtro-select {
  font-size: 12.5px;
  font-weight: 500;
  padding: 6px 10px;
  border: 1px solid var(--line);
  border-radius: var(--rp);
  background: var(--surf);
  color: var(--ink2);
  font-family: inherit;
  cursor: pointer;
}
.filtro-select:focus { outline: none; border-color: var(--g600); }

.sort-toggle {
  display: flex;
  border: 1px solid var(--line);
  border-radius: var(--rp);
  padding: 2px;
  background: var(--surf);
  flex-shrink: 0;
}

.sort-toggle-btn {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border: none;
  border-radius: var(--rp);
  background: transparent;
  color: var(--ink3);
  cursor: pointer;
  transition: background .12s, color .12s;
  font-family: inherit;
}
.sort-toggle-btn:hover { color: var(--ink); }
.sort-toggle-btn.active { background: var(--g800); color: #fff; }

.list-count {
  font-size: 12.5px;
  color: var(--ink3);
  white-space: nowrap;
  margin-left: auto;
}

/* ══════════════ LAYOUT PRINCIPAL ══════════════ */
.main-layout {
  display: grid;
  grid-template-columns: 1fr;
  min-height: 0;
  position: relative;
}

.main-layout.panel-open {
  grid-template-columns: 1fr 440px;
}

.grid-area {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.list-header {
  display: grid;
  align-items: center;
  padding: 8px 24px;
  border-bottom: 1px solid var(--line);
  background: var(--surf);
  position: sticky;
  top: 0;
  z-index: 1;
}

.lh-name {
  font-size: 11px;
  font-weight: 700;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--ink3);
}

.lh-col {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--ink3);
  text-align: right;
}

.list-body {
  overflow-y: auto;
  max-height: calc(100vh - 320px);
}

.list-row {
  display: grid;
  grid-template-columns: 1fr 72px 110px 18px;
  align-items: center;
  padding: 10px 24px;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  transition: background .12s;
}

.list-row:hover { background: var(--surf); }

.list-row.selected {
  background: var(--g50);
  box-shadow: inset 3px 0 0 var(--g600);
}

.list-row.sem-producao { opacity: .55; }

.lr-chevron {
  color: var(--ink3);
  font-size: 16px;
  text-align: right;
  transition: transform .12s, color .12s;
}
.list-row:hover .lr-chevron { color: var(--g700); transform: translateX(2px); }
.list-row.selected .lr-chevron { color: var(--g700); }

.lr-name {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.lr-pos {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink3);
  width: 24px;
  text-align: center;
  flex-shrink: 0;
  line-height: 1;
}
.lr-pos.medal { font-size: 18px; }

.lr-avatar-wrap { position: relative; flex-shrink: 0; }

.lr-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid var(--line);
  display: block;
}

.lr-avatar-fb {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--g100);
  color: var(--g800);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lr-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1.5px solid var(--bg);
}
.lr-dot.verde    { background: var(--g600); }
.lr-dot.amarelo  { background: var(--a600); }
.lr-dot.vermelho { background: var(--r600); }

.lr-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.lr-nome {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 4px;
}

.mini-tag { font-size: 11px; }

.lr-sub {
  font-size: 11.5px;
  color: var(--ink3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lr-col {
  text-align: right;
  font-size: 14px;
  color: var(--ink2);
}

.lr-col-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.lr-origem {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--ink3);
  white-space: nowrap;
}

.mono { font-variant-numeric: tabular-nums; }

.list-empty {
  padding: 36px 24px;
  text-align: center;
  color: var(--ink3);
  font-size: 14px;
}

/* ── SKELETON ── */
.sk {
  background: linear-gradient(90deg, var(--surf) 25%, var(--line) 37%, var(--surf) 63%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.4s ease infinite;
  border-radius: var(--rc);
}
@keyframes sk-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
.skeleton-wrap { grid-template-columns: repeat(2, minmax(160px, 1fr)) 1fr; }
.sk-featured { min-height: 84px; grid-column: span 2; }
.sk-compact { min-height: 84px; }
.skeleton-row { gap: 10px; }
.sk-avatar { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; }
.sk-line { height: 14px; }
.sk-badge { width: 48px; height: 20px; border-radius: var(--rp); }

/* ══════════════ BADGES ══════════════ */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--rp);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}
.badge.verde    { background: var(--g100); color: var(--g800); }
.badge.amarelo  { background: var(--a100); color: var(--a700); }
.badge.vermelho { background: var(--r100); color: var(--r700); }
.badge.sm  { font-size: 12px; padding: 2px 8px; }
.badge.lg  { font-size: 13px; padding: 4px 12px; }
.badge.xlg { font-size: 15px; padding: 5px 16px; }

.tag-final {
  display: inline-block;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  background: var(--g100);
  color: var(--g800);
  border-radius: var(--rp);
  padding: 1px 6px;
  margin-left: 5px;
  vertical-align: middle;
}

/* ══════════════ PAINEL LATERAL ══════════════ */
.detail-overlay { display: none; }

.detail-panel {
  border-left: 1px solid var(--line);
  background: var(--bg);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 320px);
}

.dp-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 18px;
  border-bottom: 1px solid var(--line);
  position: sticky;
  top: 0;
  background: var(--bg);
  z-index: 2;
}

.dp-topbar-title {
  font-size: 12.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .09em;
  color: var(--ink3);
}

.dp-close {
  background: var(--surf);
  border: 1px solid var(--line);
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 12px;
  color: var(--ink3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .1s;
}
.dp-close:hover { background: var(--line); color: var(--ink); }

.dp-profile {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--line);
}

.dp-avatar-wrap { position: relative; flex-shrink: 0; }

.dp-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--line);
  display: block;
}

.dp-avatar-fb {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--g100);
  color: var(--g800);
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dp-dot {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--bg);
}
.dp-dot.verde    { background: var(--g600); }
.dp-dot.amarelo  { background: var(--a600); }
.dp-dot.vermelho { background: var(--r600); }

.dp-profile-info { flex: 1; min-width: 0; }

.dp-nome {
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dp-email {
  font-size: 12px;
  color: var(--ink3);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dp-eff-card-label {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--ink3);
}

.dp-eff-bar-track {
  height: 5px;
  background: var(--line);
  border-radius: var(--rp);
  overflow: hidden;
}
.dp-eff-bar-fill {
  height: 100%;
  border-radius: var(--rp);
  transition: width .5s ease;
}
.dp-eff-bar-fill.verde    { background: var(--g600); }
.dp-eff-bar-fill.amarelo  { background: var(--a600); }
.dp-eff-bar-fill.vermelho { background: var(--r600); }

.dp-mini-stats {
  display: flex;
  padding: 12px 18px;
  border-bottom: 1px solid var(--line);
  gap: 8px;
}
.dp-mini-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: center;
}
.dp-stat-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--ink3);
}
.dp-stat-val {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
}
.dp-stat-val.verde { color: var(--g700); }
.dp-stat-val.vermelho { color: var(--r600); }

/* Auditoria de tempos utilizados */
.dp-auditoria {
  margin: 14px 18px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: var(--rc);
  background: var(--surf);
}
.dp-auditoria-titulo {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .07em;
  color: var(--ink3);
  margin-bottom: 10px;
}
.dp-auditoria-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  margin-bottom: 8px;
}
.dp-auditoria-item { display: flex; flex-direction: column; gap: 2px; }
.dp-auditoria-label { font-size: 10.5px; color: var(--ink3); font-weight: 600; }
.dp-auditoria-val {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.dp-auditoria-formula-wrap summary {
  font-size: 11px;
  font-weight: 600;
  color: var(--ink3);
  cursor: pointer;
  list-style: none;
  padding-top: 8px;
  border-top: 1px dashed var(--line);
}
.dp-auditoria-formula-wrap summary::-webkit-details-marker { display: none; }
.dp-auditoria-formula-wrap summary:hover { color: var(--ink2); }
.dp-auditoria-formula {
  font-size: 12.5px;
  color: var(--ink2);
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 8px;
}
.dp-auditoria-formula strong { color: var(--ink); }

.dp-ref-detalhes {
  padding-top: 10px;
  border-top: 1px dashed var(--line);
  margin-top: 10px;
}
.dp-ref-detalhes-titulo {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--ink3);
  margin-bottom: 6px;
}
.dp-ref-detalhes-linha {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  gap: 8px;
}
.dp-ref-etapa {
  font-size: 12px;
  color: var(--ink2);
  font-weight: 500;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dp-ref-valor {
  font-size: 12px;
  color: var(--ink);
  font-weight: 600;
  font-family: monospace;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}
.dp-ref-op-tag {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--ink3);
  background: var(--line);
  border-radius: var(--rp);
  padding: 1px 5px;
  margin-left: 4px;
}
.dp-ref-sem { color: var(--ink3); font-weight: 400; }
.dp-ref-origem { font-size: 10px; font-weight: 500; color: var(--ink3); font-family: inherit; }
.dp-ref-origem.manual { color: var(--g700); }
.dp-ref-origem.peca { color: #2563eb; }
.dp-ref-origem.ultimo_registrado { color: var(--a600); }

.dp-ref-origem-inline { font-size: 10px; font-weight: 500; font-style: normal; color: var(--ink3); }
.dp-ref-origem-inline.manual { color: var(--g700); }
.dp-ref-origem-inline.peca { color: #2563eb; }
.dp-ref-origem-inline.ultimo_registrado { color: var(--a600); }

.dp-tabs {
  display: flex;
  border-bottom: 1px solid var(--line);
  padding: 0 18px;
}
.dp-tab {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink3);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 10px 16px;
  cursor: pointer;
  transition: color .12s, border-color .12s;
  margin-bottom: -1px;
  font-family: inherit;
}
.dp-tab:hover { color: var(--ink); }
.dp-tab.active { color: var(--g700); border-bottom-color: var(--g600); font-weight: 600; }

.dp-content { padding: 16px 18px; flex: 1; }

.dp-etapa { padding: 12px 0; border-bottom: 1px solid var(--line); }
.dp-etapa:last-child { border-bottom: none; }
.dp-etapa-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; gap: 8px; }
.dp-etapa-nome {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dp-etapa-bar-track { height: 5px; background: var(--line); border-radius: var(--rp); overflow: hidden; margin-bottom: 6px; }
.dp-etapa-bar-fill { height: 100%; border-radius: var(--rp); transition: width .4s ease; }
.dp-etapa-bar-fill.verde    { background: var(--g600); }
.dp-etapa-bar-fill.amarelo  { background: var(--a600); }
.dp-etapa-bar-fill.vermelho { background: var(--r600); }
.dp-etapa-bottom { display: flex; justify-content: space-between; }
.small { font-size: 12px; color: var(--ink3); }

/* POR HORA */
.dp-hora-bloco { border: 1px solid var(--line); border-radius: var(--rs); overflow: hidden; margin-bottom: 12px; }
.dp-hora-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--surf);
}
.dp-hora-head-left { display: flex; align-items: center; gap: 7px; }
.dp-hora-clock { font-size: 14px; line-height: 1; }
.dp-hora-label { font-size: 14px; font-weight: 700; color: var(--ink); }
.dp-hora-total-pecas { font-size: 12.5px; font-weight: 600; color: var(--ink2); }

.dp-hora-eff-summary {
  display: flex;
  gap: 12px;
  padding: 0 14px 8px;
  background: var(--surf);
  font-size: 12px;
  font-weight: 700;
}
.dp-hora-eff-summary .verde    { color: var(--g700); }
.dp-hora-eff-summary .amarelo  { color: var(--a600); }
.dp-hora-eff-summary .vermelho { color: var(--r600); }

.dp-hora-eff-row { padding: 0 14px 10px; background: var(--surf); border-bottom: 1px solid var(--line); }
.dp-hora-eff-bar-track { height: 4px; background: var(--line); border-radius: var(--rp); overflow: hidden; margin-bottom: 6px; }
.dp-hora-eff-bar-track:last-child { margin-bottom: 0; }
.dp-hora-eff-bar-fill { height: 100%; border-radius: var(--rp); transition: width .4s ease; }
.dp-hora-eff-bar-fill.verde    { background: var(--g600); }
.dp-hora-eff-bar-fill.amarelo  { background: var(--a600); }
.dp-hora-eff-bar-fill.vermelho { background: var(--r600); }

.dp-hora-etapas-list { display: flex; flex-direction: column; }
.dp-hora-etapa-item { padding: 10px 14px; border-top: 1px solid var(--line); display: flex; flex-direction: column; gap: 6px; }
.dp-hora-etapa-item-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.dp-hora-etapa-nome { font-weight: 500; color: var(--ink2); font-size: 13.5px; }
.dp-hora-etapa-item-badges { display: flex; gap: 6px; }

.dp-empty { text-align: center; color: var(--ink3); font-size: 14px; padding: 28px 0; }

/* ══════════════ EFICIÊNCIA ÚNICA + DETALHAMENTO ══════════════ */
.dp-eff-principal {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
}
.dp-eff-principal-val { font-size: 34px; font-weight: 700; letter-spacing: -.03em; line-height: 1; }
.dp-eff-principal-val small { font-size: 18px; opacity: .8; }
.dp-eff-principal-val.verde    { color: var(--g700); }
.dp-eff-principal-val.amarelo  { color: var(--a600); }
.dp-eff-principal-val.vermelho { color: var(--r600); }

.dp-eff-origem {
  display: block;
  margin-top: 6px;
  font-size: 13px;
  font-weight: 600;
  font-style: normal;
  letter-spacing: .01em;
  color: var(--ink3);
}

.btn-detalhes {
  align-self: flex-start;
  height: 32px;
  padding: 0 16px;
  border-radius: var(--rp);
  border: 1px solid var(--g600);
  background: var(--g50);
  color: var(--g800);
  font-size: 12.5px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}
.btn-detalhes:hover { background: var(--g100); }

.dp-analise { padding: 14px 18px; border-bottom: 1px solid var(--line); background: var(--surf); }

.an-titulo {
  margin: 18px 0 8px;
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--ink3);
}
.an-titulo:first-child { margin-top: 0; }

.an-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
.an-card {
  display: flex; flex-direction: column; gap: 3px;
  background: var(--bg); border: 1px solid var(--line);
  border-radius: var(--rc); padding: 10px 12px;
}
.an-card-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--ink3); }
.an-card-val { font-size: 17px; font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; }
.an-card-val small { font-size: 11px; font-weight: 600; color: var(--ink3); }
.an-card-val.verde    { color: var(--g700); }
.an-card-val.amarelo  { color: var(--a600); }
.an-card-val.vermelho { color: var(--r600); }

.an-card-sub {
  font-size: 11px;
  font-weight: 600;
  color: var(--ink3);
}

.an-nota { margin: 8px 0 0; font-size: 11.5px; color: var(--ink3); }

.an-tabela-wrap { overflow-x: auto; background: var(--bg); border: 1px solid var(--line); border-radius: var(--rc); }
.an-tabela { width: 100%; border-collapse: collapse; font-size: 12px; }
.an-tabela th, .an-tabela td { padding: 7px 8px; border-bottom: 1px solid var(--line); text-align: left; }
.an-tabela th { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: var(--ink3); }
.an-tabela .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.an-tabela tr:last-child td { border-bottom: none; }
.an-tabela tr.an-indisp td { color: var(--ink3); }
.an-tabela tr.an-destaque td { background: var(--g100); font-weight: 700; color: var(--g900); }

.an-explica { background: var(--bg); border: 1px solid var(--line); border-radius: var(--rc); padding: 10px 12px; font-size: 13px; color: var(--ink2); }
.an-explica p { margin: 0; }
.an-aviso { margin-top: 8px !important; color: var(--a700); background: var(--a100); border-radius: var(--rs); padding: 6px 8px; font-size: 12px; }

.an-lista { list-style: none; margin: 0; padding: 0; background: var(--bg); border: 1px solid var(--line); border-radius: var(--rc); overflow: hidden; }
.an-lista li { display: flex; justify-content: space-between; gap: 8px; padding: 7px 12px; border-bottom: 1px solid var(--line); font-size: 13px; color: var(--ink2); }
.an-lista li:last-child { border-bottom: none; }
.an-lista li strong { font-variant-numeric: tabular-nums; color: var(--ink); white-space: nowrap; }
.an-lista li.an-destaque { background: var(--g100); font-weight: 700; }
.an-lista li.real strong { color: var(--g700); }
.an-tag { font-style: normal; font-size: 9px; font-weight: 700; text-transform: uppercase; background: var(--g600); color: #fff; border-radius: var(--rp); padding: 1px 6px; margin-left: 4px; }

.an-legenda { display: flex; gap: 12px; margin-bottom: 6px; font-size: 11.5px; color: var(--ink2); }
.an-leg::before { content: ''; display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: middle; }
.an-leg.teorica::before { background: #9db8b0; }
.an-leg.real::before { background: #16a34a; }
.an-chart { position: relative; height: 220px; background: var(--bg); border: 1px solid var(--line); border-radius: var(--rc); padding: 8px; margin-bottom: 8px; }

/* TRANSIÇÃO */
.panel-slide-enter-active,
.panel-slide-leave-active { transition: opacity .18s ease, transform .2s ease; }
.panel-slide-enter-from,
.panel-slide-leave-to { opacity: 0; transform: translateX(16px); }

/* RESPONSIVO */
@media (max-width: 900px) {
  .main-layout.panel-open { grid-template-columns: 1fr; }

  .detail-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(13, 21, 18, .35);
    z-index: 20;
  }

  .detail-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(420px, 92vw);
    max-height: 100vh;
    z-index: 21;
    box-shadow: -8px 0 24px rgba(0,0,0,.12);
  }

  .hero-metrics { grid-template-columns: 1fr 1fr; }
  .metric-featured { grid-column: span 1; }
  .metrics-compact { grid-column: span 2; }
}

@media (max-width: 560px) {
  .hero { padding: 14px 16px 12px; }
  .hero-metrics { grid-template-columns: 1fr; }
  .metrics-compact { grid-column: auto; }
  .filtros-row { padding: 12px 16px; }
  .search-input { width: 100%; }
  .list-header, .list-row { padding: 8px 16px; }
  .resumo-medias { grid-template-columns: 1fr; }
}
/* ═══════════════════════════════════════════════════════════
   ACRÉSCIMOS — três indicadores (Geral OFICIAL · Ficha · Referência)
   Colar no FINAL do <style scoped> (depois dos @media existentes),
   pois alguns blocos sobrescrevem regras anteriores.
   ═══════════════════════════════════════════════════════════ */

/* ── Selo OFICIAL (reutilizado em hero, lista, painel e tabelas) ── */
.tag-oficial {
  display: inline-block;
  font-style: normal;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  line-height: 1.4;
  color: #fff;
  background: var(--g600);
  border-radius: var(--rp);
  padding: 1px 6px;
  margin-left: 4px;
  vertical-align: middle;
}

/* ── Estado neutro (indisponível) ── */
.badge.neutro { background: var(--surf); color: var(--ink3); border: 1px solid var(--line); }
.lr-dot.neutro,
.dp-dot.neutro { background: var(--line); }
.dp-eff-bar-fill.neutro { background: var(--line); }
.dp-eff-card-val.neutro,
.an-card-val.neutro { color: var(--ink3); }

/* ══════════════ HERO: três cards de eficiência ══════════════ */
.hero-metrics {
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
}
.hero-metrics .metrics-compact { grid-column: 1 / -1; }

.skeleton-wrap { grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); }
.sk-featured { grid-column: span 1; }

/* Geral = destaque; Ficha e Referência = secundárias, claramente distintas */
.metric-geral {
  background: var(--g800);
  box-shadow: 0 0 0 2px var(--g600) inset;
}
.metric-geral .tag-oficial { background: var(--g200); color: var(--g900); }

.metric-ficha,
.metric-referencia {
  background: var(--surf);
  border: 1px solid var(--line);
}
.metric-ficha .mf-label,
.metric-referencia .mf-label { color: var(--ink3); }
.metric-ficha .mf-val,
.metric-referencia .mf-val { color: var(--ink); }


.lh-col { padding-left: 6px; }

.lh-geral { color: var(--g700); }

.lr-geral,
.lr-ficha,
.lr-referencia { padding-left: 6px; }

/* Coluna oficial com leve realce, sem competir com as outras */
.lr-geral {
  align-self: stretch;
  justify-content: center;
  border-radius: var(--rs);
  padding: 4px 8px;
}
.list-row.selected .lr-geral { background: var(--g100); }

/* ══════════════ PAINEL: três cards de eficiência ══════════════ */
.dp-eff-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 14px 18px 8px;
}
.dp-eff-cards.single { grid-template-columns: repeat(2, 1fr); }

.dp-eff-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  background: var(--surf);
  border: 1px solid var(--line);
  border-radius: var(--rc);
  padding: 12px 14px;
}
.dp-eff-card.oficial {
  background: var(--g50);
  border-color: var(--g600);
  box-shadow: 0 0 0 1px var(--g600) inset;
}

.dp-eff-card-val {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -.02em;
  line-height: 1.1;
}
.dp-eff-card-val.verde    { color: var(--g700); }
.dp-eff-card-val.amarelo  { color: var(--a600); }
.dp-eff-card-val.vermelho { color: var(--r600); }

.dp-eff-card-sub {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--ink3);
  line-height: 1.3;
}

.dp-eff-acoes {
  padding: 4px 18px 14px;
  border-bottom: 1px solid var(--line);
}

/* ══════════════ DETALHAMENTO ══════════════ */
.an-card-oficial {
  border-color: var(--g600);
  background: var(--g50);
}

.an-cenario {
  display: block;
  font-size: 9.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--ink3);
  margin-top: 1px;
}
.an-tabela tr.an-destaque .an-cenario { color: var(--g700); }

/* Escolha do tempo, etapa por etapa */
.an-etapas {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.an-etapa-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--rc);
  padding: 10px 12px;
}
.an-etapa-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.an-etapa-nome {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.an-etapa-origem {
  flex-shrink: 0;
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  border-radius: var(--rp);
  padding: 2px 8px;
  background: var(--line);
  color: var(--ink3);
}
.an-etapa-origem.referencia { background: var(--g100); color: var(--g800); }
.an-etapa-origem.padrao     { background: var(--a100); color: var(--a700); }
.an-etapa-origem.indisp     { background: var(--r100); color: var(--r700); }

.an-etapa-tempos { color: var(--ink2); }
.an-etapa-motivo { line-height: 1.4; }

/* Lista do comparativo de produção: capacidade da Geral oficial */
.an-lista li.oficial { background: #eff6ff; }
.an-lista li.oficial strong { color: #2563eb; }

/* Legenda do gráfico */
.an-legenda { flex-wrap: wrap; }
.an-leg.oficial::before { background: #2563eb; }

/* ══════════════ RESPONSIVO (acréscimos) ══════════════ */
@media (max-width: 900px) {
  .dp-eff-cards { grid-template-columns: repeat(3, 1fr); }
  .hero-metrics .metric-featured { grid-column: auto; }
  .hero-metrics .metrics-compact { grid-column: 1 / -1; }
}

@media (max-width: 560px) {
  .dp-eff-cards,
  .dp-eff-cards.single { grid-template-columns: 1fr; }

  .lr-origem { display: none; }
  .lr-geral { padding: 2px 4px; }
}
</style>