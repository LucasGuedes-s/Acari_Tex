<!--
  SlidesProducaoView.vue
  ======================================================================
  Painel industrial de produção — apresentação automática em slides para
  TV/monitor de fábrica do Linha Tex.

  ── DE ONDE VÊM OS NÚMEROS ──────────────────────────────────────────
  Esta tela NÃO calcula nada. Todos os indicadores vêm prontos de
  `GET /producao/painel` (back_end/Services/slidesProducaoService.js),
  que usa a consolidação oficial:
      relatorioProducaoService.calcularRelatorio()
        → utils/producaoCalculos.js   (backend, fonte única)
        → espelha acari_tex/src/utils/calculosProducao.js
              Eficiência = Σ(quantidade × SAM) × 100 ÷ tempo trabalhado
              SAM = MENOR tempo válido entre padrão da etapa e
                    referência do profissional (OP/etapa → etapa → padrão)

  O que a tela faz é apenas ORGANIZAR/PAGINAR o que já veio pronto:
    • `porEtapa` traz SOMENTE as etapas com produção no dia;
    • `horasDoDia` é o eixo contínuo de horas do gráfico por etapa;
    • `finalizacao` separa peça FINALIZADA (só etapa final) de peça
      processada (soma das etapas);
    • `porEtapaCompleto` já traz TODAS as etapas cadastradas, inclusive as
      que não tiveram apontamento no dia (zero de verdade);
    • ranking já vem ordenado por eficiência (nunca por peças).

  ── SLIDES (a quantidade cresce sozinha conforme os dados) ───────────
    1    Resumo do dia         (peças finalizadas × peças processadas)
    2..n Produção por etapa     (UM slide por etapa COM produção, com
                                 gráfico de produção por horário)
    n    Destaque do dia        (1º lugar do ranking)
    n..  Ranking de profissionais (demais colocados, paginado)
    n..  Ordens de produção     (cards, paginados)
    n    Eficiência da fábrica  (os três critérios oficiais)
    n    Etapas sem produção    (cadastro que ficou em zero no dia)

  Peça FINALIZADA ≠ peça processada: o total de finalizadas vem de
  `finalizacao` (só a etapa final da OP); a soma das etapas aparece
  separada, identificada como produção intermediária.
-->

<template>
  <div class="painel">
    <!-- ══════════════ CARREGANDO ══════════════ -->
    <div v-if="carregando" class="estado">
      <img src="@/assets/Logofundo.png" class="estado-logo" alt="Linha Tex" />
      <p>Carregando produção...</p>
    </div>

    <!-- ══════════════ ERRO ══════════════ -->
    <div v-else-if="erro" class="estado">
      <img src="@/assets/Logofundo.png" class="estado-logo" alt="Linha Tex" />
      <p>Não foi possível carregar o painel.</p>
      <small>{{ erro }}</small>
    </div>

    <!-- ══════════════ SEM DADOS ══════════════ -->
    <div v-else-if="vazio" class="estado">
      <img src="@/assets/Logofundo.png" class="estado-logo grande" alt="Linha Tex" />
      <h1>Nenhuma produção registrada em {{ dataLabel }}</h1>
      <p>Assim que houver apontamentos, o painel é atualizado automaticamente.</p>
    </div>

    <!-- ══════════════ PAINEL ══════════════ -->
    <template v-else>
      <header class="topo">
        <div class="marca">
          <img src="@/assets/Logofundo.png" class="marca-logo" alt="Linha Tex" />
          <div class="marca-texto">
            <span class="marca-nome">{{ nomeEstabelecimento }}</span>
            <span class="marca-sub">Painel de Produção</span>
          </div>
        </div>

        <div class="topo-centro">
          <span class="relogio">{{ horaAtual }}</span>
          <span class="topo-data">{{ dataLabel }}</span>
        </div>

        <div class="topo-status">
          <div class="chip" :class="socketConectado ? 'chip-on' : 'chip-off'">
            <span class="ponto"></span>
            {{ socketConectado ? 'Ao vivo' : 'Offline' }}
          </div>
          <span class="topo-atualizado">Atualizado {{ atualizadoHa }}</span>
        </div>
      </header>

      <main class="palco">
        <section v-if="paginaAtual" :key="paginaAtual.id" class="slide">
          <!-- ══════════ 1. RESUMO DO DIA ══════════ -->
          <template v-if="paginaAtual.chave === 'resumo'">
            <div class="slide-cabecalho">
              <div>
                <h2 class="slide-titulo">Resumo da produção</h2>
                <p class="slide-sub">
                  {{ formatarNumero(resumo.etapasComProducao) }} etapas com produção ·
                  {{ formatarNumero(resumo.profissionais) }} profissionais ·
                  {{ formatarNumero(resumo.ops) }} OP(s)
                </p>
              </div>
              <span class="selo">{{ formatarNumero(resumo.registros) }} apontamentos válidos</span>
            </div>

            <div class="destaques">
              <article class="kpi kpi-principal kpi-final">
                <span class="kpi-rotulo">Peças finalizadas</span>
                <strong v-if="finalizacao.disponivel" class="kpi-valor">
                  {{ formatarNumero(finalizacao.pecas) }}
                </strong>
                <strong v-else class="kpi-valor kpi-indisponivel">—</strong>
                <span class="kpi-nota">{{ notaFinalizadas }}</span>
              </article>

              <article class="kpi">
                <span class="kpi-rotulo">Peças processadas</span>
                <strong class="kpi-valor">{{ formatarNumero(resumo.pecasApontadas) }}</strong>
                <span class="kpi-nota">soma das etapas — não é peça finalizada</span>
              </article>

              <article class="kpi">
                <span class="kpi-rotulo">Etapas com produção</span>
                <strong class="kpi-valor">{{ formatarNumero(resumo.etapasComProducao) }}</strong>
                <span class="kpi-nota">de {{ formatarNumero(resumo.etapasCadastradas) }} cadastradas</span>
              </article>

              <article class="kpi">
                <span class="kpi-rotulo">Profissionais</span>
                <strong class="kpi-valor">{{ formatarNumero(resumo.profissionais) }}</strong>
                <span class="kpi-nota">{{ resumo.profissionaisNaMeta || 0 }} na meta da hora</span>
              </article>

              <article class="kpi kpi-efic" :class="`faixa-${faixa(resumo.eficienciaGeral)}`">
                <span class="kpi-rotulo">Eficiência geral</span>
                <strong class="kpi-valor">{{ formatarPercentual(resumo.eficienciaGeral) }}</strong>
                <span class="kpi-nota">Σ peças × SAM ÷ tempo trabalhado</span>
              </article>
            </div>

            <div class="faixa-info">
              <div class="info">
                <span class="info-rotulo">Etapa final</span>
                <strong class="info-valor info-etapa-final">{{ textoEtapaFinal }}</strong>
                <span class="info-nota">
                  {{ finalizacao.disponivel ? 'única etapa que conta peça pronta' : 'não identificada nas OPs do dia' }}
                </span>
              </div>
              <div class="info">
                <span class="info-rotulo">Jornada do dia</span>
                <strong class="info-valor">{{ jornadaFormatada }}</strong>
                <span class="info-nota">limite por pessoa</span>
              </div>
              <div class="info">
                <span class="info-rotulo">Tempo médio por pessoa</span>
                <strong class="info-valor">{{ formatarHoras(resumo.tempoMedioPorPessoa) }}</strong>
                <span class="info-nota">{{ formatarNumero(resumo.profissionais) }} pessoas no dia</span>
              </div>
              <div class="info">
                <span class="info-rotulo">Meta do dia</span>
                <strong class="info-valor">{{ metaDoDia > 0 ? formatarNumero(metaDoDia) : '—' }}</strong>
                <span class="info-nota">peças finalizadas</span>
              </div>
              <div class="info">
                <span class="info-rotulo">% da meta</span>
                <strong class="info-valor">{{ percentualMeta }}</strong>
                <div class="barra">
                  <div class="barra-preenchida" :style="{ width: percentualMetaBarra + '%' }"></div>
                </div>
              </div>
            </div>
          </template>

          <!-- ══════════ 2. PRODUÇÃO POR ETAPA (uma etapa por slide) ══════════ -->
          <template v-else-if="paginaAtual.chave === 'etapa'">
            <div class="slide-cabecalho">
              <div>
                <h2 class="slide-titulo">Produção por etapa</h2>
                <p class="slide-sub">
                  Somente etapas com produção registrada hoje ·
                  {{ formatarNumero(resumo.pecasApontadas) }} peças processadas no dia
                </p>
              </div>
              <span class="selo">
                etapa {{ paginaAtual.indice }} de {{ paginaAtual.total }}
              </span>
            </div>

            <div class="etapa-painel">
              <header class="etapa-topo">
                <div class="etapa-identidade">
                  <span class="etapa-rotulo">Etapa em acompanhamento</span>
                  <h3 class="etapa-nome">{{ paginaAtual.etapa.etapa }}</h3>
                </div>

                <div class="etapa-pecas">
                  <strong>{{ formatarNumero(paginaAtual.etapa.producao) }}</strong>
                  <span>peças processadas</span>
                </div>
              </header>

              <div class="etapa-corpo">
                <div class="etapa-dados">
                  <div
                    class="etapa-dado etapa-dado-efic"
                    :class="`faixa-${faixa(paginaAtual.etapa.eficiencia)}`"
                  >
                    <span class="dado-rotulo">Eficiência da etapa</span>
                    <strong class="dado-valor">
                      {{ percentualOuTraco(paginaAtual.etapa.eficiencia) }}
                    </strong>
                    <div class="barra barra-grande">
                      <div
                        class="barra-preenchida"
                        :class="`fill-${faixa(paginaAtual.etapa.eficiencia)}`"
                        :style="{ width: Math.min(100, Math.max(2, paginaAtual.etapa.eficiencia || 0)) + '%' }"
                      ></div>
                    </div>
                    <span class="dado-nota">Σ peças × SAM ÷ tempo trabalhado</span>
                  </div>

                  <div class="etapa-dado">
                    <span class="dado-rotulo">Tempo padrão por peça</span>
                    <strong class="dado-valor">
                      {{ formatarMinutos(paginaAtual.etapa.tempoPadraoUnitario) }}
                    </strong>
                    <span class="dado-nota">ficha da etapa (min/peça)</span>
                  </div>

                  <div class="etapa-dado">
                    <span class="dado-rotulo">Tempo de referência</span>
                    <strong class="dado-valor">
                      {{ formatarMinutos(paginaAtual.etapa.samMedio) }}
                    </strong>
                    <span class="dado-nota">SAM aplicado no cálculo (min/peça)</span>
                  </div>

                  <div class="etapa-dado">
                    <span class="dado-rotulo">Tempo necessário</span>
                    <strong class="dado-valor">
                      {{ formatarHoras(paginaAtual.etapa.tempoAplicado) }}
                    </strong>
                    <span class="dado-nota">
                      {{ formatarNumero(paginaAtual.etapa.producao) }} ×
                      {{ formatarMinutos(paginaAtual.etapa.samMedio) }}
                    </span>
                  </div>

                  <div class="etapa-dado">
                    <span class="dado-rotulo">Tempo trabalhado</span>
                    <strong class="dado-valor">
                      {{ formatarHoras(paginaAtual.etapa.tempoTrabalhado) }}
                    </strong>
                    <span class="dado-nota">
                      apontado por {{ paginaAtual.etapa.profissionais }} profissional(is)
                    </span>
                  </div>

                  <div class="etapa-dado">
                    <span class="dado-rotulo">Participação no dia</span>
                    <strong class="dado-valor">
                      {{ formatarPercentual(paginaAtual.etapa.participacao) }}
                    </strong>
                    <span class="dado-nota">
                      {{ paginaAtual.etapa.ops }} OP(s) ·
                      {{ nomesCadastrados.has(paginaAtual.etapa.etapa) ? 'etapa cadastrada' : 'fora do cadastro' }}
                    </span>
                  </div>
                </div>

                <div class="etapa-grafico">
                  <div class="grafico-topo">
                    <span class="dado-rotulo">Produção por horário</span>
                    <span v-if="paginaAtual.pico" class="grafico-pico">
                      pico {{ horaCurta(paginaAtual.pico.hora) }} ·
                      {{ formatarNumero(paginaAtual.pico.quantidade) }} peças
                    </span>
                  </div>

                  <div class="grafico-area">
                    <div v-for="barra in paginaAtual.barras" :key="barra.hora" class="barra-hora">
                      <span class="barra-hora-valor">
                        {{ barra.quantidade ? formatarNumero(barra.quantidade) : '' }}
                      </span>
                      <div class="barra-hora-trilho">
                        <div
                          class="barra-hora-preenchida"
                          :style="{ height: barra.altura + '%' }"
                        ></div>
                      </div>
                      <span class="barra-hora-rotulo">{{ horaCurta(barra.hora) }}</span>
                    </div>
                  </div>

                  <p v-if="!paginaAtual.barras.length" class="vazio-linha">
                    Nenhum horário registrado para esta etapa.
                  </p>
                </div>
              </div>
            </div>
          </template>

          <!-- ══════════ 4. DESTAQUE DO DIA ══════════ -->
          <template v-else-if="paginaAtual.chave === 'destaque'">
            <div class="slide-cabecalho">
              <div>
                <h2 class="slide-titulo">Destaque do dia</h2>
                <p class="slide-sub">
                  Melhor desempenho considerando tempo aplicado ÷ tempo trabalhado
                  (ficha ou referência, o menor)
                </p>
              </div>
              <span class="selo selo-meta">🏆 1º lugar</span>
            </div>

            <div v-if="destaque" class="destaque-area">
              <span class="destaque-foguetes" aria-hidden="true">
                <i class="foguete f1">🚀</i>
                <i class="foguete f2">🚀</i>
                <i class="foguete f3">🚀</i>
              </span>
              <span class="destaque-confete" aria-hidden="true">
                <i></i><i></i><i></i><i></i><i></i><i></i>
              </span>

              <article class="destaque-card">
                <div class="destaque-foto-area">
                  <img
                    v-if="destaque.foto"
                    :src="destaque.foto"
                    class="destaque-foto"
                    :alt="destaque.nome"
                  />
                  <span v-else class="destaque-foto destaque-iniciais">
                    {{ iniciais(destaque.nome) }}
                  </span>
                  <span class="destaque-medalha">🥇</span>
                  <span class="destaque-posicao">{{ destaque.posicao }}º lugar</span>
                </div>

                <div class="destaque-info">
                  <h3 class="destaque-nome">{{ destaque.nome }}</h3>
                  <span class="destaque-etapas">{{ resumoEtapas(destaque) }}</span>

                  <div class="destaque-eficiencia" :class="`faixa-${faixa(destaque.eficiencia)}`">
                    <strong>{{ formatarPercentual(destaque.eficiencia) }}</strong>
                    <span>eficiência individual</span>
                  </div>

                  <div class="barra barra-grande">
                    <div
                      class="barra-preenchida"
                      :class="`fill-${faixa(destaque.eficiencia)}`"
                      :style="{ width: Math.min(100, Math.max(2, destaque.eficiencia)) + '%' }"
                    ></div>
                  </div>

                  <div class="destaque-kpis">
                    <div class="destaque-kpi">
                      <strong>{{ formatarNumero(destaque.producao) }}</strong>
                      <span>peças produzidas</span>
                    </div>
                    <div class="destaque-kpi">
                      <strong>{{ formatarHoras(destaque.tempoNoDia) }}</strong>
                      <span>tempo trabalhado</span>
                    </div>
                    <div class="destaque-kpi">
                      <strong>{{ destaque.etapasExecutadas }}</strong>
                      <span>etapas realizadas</span>
                    </div>
                    <div class="destaque-kpi">
                      <strong>{{ formatarPercentual(destaque.eficienciaTempoReferencia) }}</strong>
                      <span>eficiência por referência</span>
                    </div>
                  </div>

                  <ul class="destaque-lista">
                    <li v-for="etapa in destaque.etapas.slice(0, 4)" :key="etapa.etapa">
                      <span>{{ etapa.etapa }}</span>
                      <strong>{{ formatarNumero(etapa.quantidade) }}</strong>
                    </li>
                  </ul>

                  <span v-if="destaque.bateuMeta" class="destaque-meta">
                    META DA HORA BATIDA 🎉
                  </span>
                </div>
              </article>
            </div>

            <div v-else class="estado-interno">
              <p>Nenhum profissional com produção válida neste dia.</p>
              <small>O pódio aparece quando houver apontamento com tempo calculado.</small>
            </div>
          </template>

          <!-- ══════════ 5. RANKING DE PROFISSIONAIS ══════════ -->
          <template v-else-if="paginaAtual.chave === 'ranking'">
            <div class="slide-cabecalho">
              <div>
                <h2 class="slide-titulo">Ranking de profissionais</h2>
                <p class="slide-sub">
                  Ordenado por eficiência (ficha ou referência, o menor) · meta da hora =
                  {{ resumo.metaHora || 100 }}% · {{ paginaAtual.rotuloLinhas }}
                </p>
              </div>
              <span v-if="destaques.quantidadeNaMeta" class="selo selo-meta">
                🎉 {{ destaques.quantidadeNaMeta }} bateram a meta
              </span>
            </div>

            <div class="grade-prof" :style="{ '--colunas': paginaAtual.colunas }">
              <article
                v-for="p in paginaAtual.itens"
                :key="p.email"
                class="prof-card"
                :class="[{ 'prof-meta': p.bateuMeta }, p.posicao <= 3 ? `podio podio-${p.posicao}` : '']"
              >
                <div class="prof-posicao">{{ p.posicao }}º</div>

                <div class="avatar-wrap">
                  <img v-if="p.foto" :src="p.foto" class="avatar-foto" :alt="p.nome" />
                  <span v-else class="avatar-foto avatar-iniciais">{{ iniciais(p.nome) }}</span>
                  <span v-if="p.posicao <= 3" class="podio-medalha">{{ medalha(p.posicao) }}</span>
                </div>

                <div class="prof-info">
                  <span class="prof-nome">{{ p.nome }}</span>
                  <strong class="prof-efic" :class="`faixa-${faixa(p.eficiencia)}`">
                    {{ formatarPercentual(p.eficiencia) }}
                  </strong>
                  <div class="barra">
                    <div
                      class="barra-preenchida"
                      :class="`fill-${faixa(p.eficiencia)}`"
                      :style="{ width: Math.min(100, Math.max(2, p.eficiencia)) + '%' }"
                    ></div>
                  </div>
                  <span class="prof-nota">
                    {{ formatarNumero(p.producao) }} peças · {{ formatarHoras(p.tempoNoDia) }}
                  </span>
                  <span class="prof-etapas">{{ resumoEtapas(p) }}</span>
                </div>

                <span v-if="p.bateuMeta" class="prof-selo">META 1h 🎉</span>
              </article>
            </div>
          </template>

          <!-- ══════════ 6. ORDENS DE PRODUÇÃO ══════════ -->
          <template v-else-if="paginaAtual.chave === 'ops'">
            <div class="slide-cabecalho">
              <div>
                <h2 class="slide-titulo">Ordens de produção</h2>
                <p class="slide-sub">
                  Peça concluída = somente a etapa final da OP ·
                  {{ formatarNumero(resumo.pecasConcluidas) }} concluídas de
                  {{ formatarNumero(resumo.pecasApontadas) }} apontadas ·
                  {{ paginaAtual.rotuloLinhas }}
                </p>
              </div>
              <span class="selo">{{ porOp.length }} OP(s) no dia</span>
            </div>

            <div class="grade-ops" :style="{ '--colunas': paginaAtual.colunas }">
              <article
                v-for="op in paginaAtual.itens"
                :key="op.idOp"
                class="op-card"
                :class="`op-${op.situacao}`"
              >
                <header class="op-topo">
                  <div class="op-identidade">
                    <span class="op-numero">OP {{ op.idOp }}</span>
                    <span class="op-descricao">{{ op.descricao }}</span>
                  </div>
                  <span class="op-selo" :class="`op-selo-${op.situacao}`">
                    {{ rotuloSituacao(op.situacao) }}
                  </span>
                </header>

                <div class="op-progresso">
                  <div class="op-percentual" :class="`faixa-${faixa(op.percentualMeta)}`">
                    {{ percentualOuTraco(op.percentualMeta) }}
                  </div>
                  <div class="op-barra-area">
                    <div class="barra">
                      <div
                        class="barra-preenchida"
                        :class="`fill-${faixa(op.percentualMeta)}`"
                        :style="{ width: Math.max(2, Math.min(100, op.percentualMeta || 0)) + '%' }"
                      ></div>
                    </div>
                    <span class="op-barra-nota">
                      {{ formatarNumero(op.producaoConcluida) }} de
                      {{ formatarNumero(op.meta) }} concluídas
                    </span>
                  </div>
                </div>

                <div class="op-dados">
                  <span v-if="op.quantidadePecas">
                    <em>{{ formatarNumero(op.quantidadePecas) }}</em> previstas
                  </span>
                  <span><em>{{ formatarNumero(op.producao) }}</em> apontadas</span>
                  <span><em>{{ op.profissionais }}</em> prof.</span>
                  <span><em>{{ op.etapas }}</em> etapas</span>
                  <span v-if="op.dataEntrega" class="op-entrega">
                    entrega {{ formatarData(op.dataEntrega) }}
                  </span>
                </div>

                <ul v-if="op.listaEtapas.length" class="op-etapas">
                  <li
                    v-for="etapaOp in op.listaEtapas.slice(0, 5)"
                    :key="etapaOp.etapa"
                    :class="{ 'op-etapa-final': etapaOp.final }"
                  >
                    <span class="op-etapa-nome">
                      <i v-if="etapaOp.final" aria-hidden="true">✔</i>{{ etapaOp.etapa }}
                    </span>
                    <span class="op-etapa-qtd">{{ formatarNumero(etapaOp.producao) }}</span>
                    <span class="op-etapa-efic">{{ percentualOuTraco(etapaOp.eficiencia) }}</span>
                  </li>
                  <li v-if="op.listaEtapas.length > 5" class="op-etapa-mais">
                    +{{ op.listaEtapas.length - 5 }} etapa(s)
                  </li>
                </ul>
              </article>
            </div>
          </template>

          <!-- ══════════ 7. ETAPAS CADASTRADAS SEM PRODUÇÃO HOJE ══════════ -->
          <template v-else-if="paginaAtual.chave === 'ociosas'">
            <div class="slide-cabecalho">
              <div>
                <h2 class="slide-titulo">Etapas cadastradas sem produção hoje</h2>
                <p class="slide-sub">
                  Fazem parte do cadastro do estabelecimento e continuam acompanhadas,
                  com zero peças no dia
                </p>
              </div>
              <span class="selo">{{ paginaAtual.itens.length }} etapa(s) · 0 peças</span>
            </div>

            <div class="chips-area">
              <span
                v-for="etapa in paginaAtual.itens"
                :key="etapa.idEtapa ?? etapa.etapa"
                class="chip-etapa"
              >
                <span class="chip-etapa-nome">{{ etapa.etapa }}</span>
                <span class="chip-etapa-zero">0</span>
              </span>
            </div>
          </template>

          <!-- ══════════ 7. EFICIÊNCIA DA FÁBRICA ══════════ -->
          <template v-else>
            <div class="slide-cabecalho">
              <div>
                <h2 class="slide-titulo">Eficiência da fábrica</h2>
                <p class="slide-sub">
                  Três critérios sobre o mesmo tempo trabalhado — nunca média de percentuais
                </p>
              </div>
              <span class="selo">{{ formatarNumero(resumo.etapasComProducao) }} etapas com produção</span>
            </div>

            <div class="criterios">
              <article class="criterio">
                <span class="criterio-rotulo">Tempo padrão</span>
                <strong class="criterio-valor" :class="`faixa-${faixa(resumo.eficienciaTempoPadrao)}`">
                  {{ formatarPercentual(resumo.eficienciaTempoPadrao) }}
                </strong>
                <span class="criterio-nota">Σ peças × padrão da etapa</span>
              </article>

              <article class="criterio">
                <span class="criterio-rotulo">Tempo de referência</span>
                <strong class="criterio-valor" :class="`faixa-${faixa(resumo.eficienciaTempoReferencia)}`">
                  {{ formatarPercentual(resumo.eficienciaTempoReferencia) }}
                </strong>
                <span class="criterio-nota">Σ peças × referência do profissional</span>
              </article>

              <article class="criterio criterio-principal">
                <span class="criterio-rotulo">Tempo aplicado (geral)</span>
                <strong class="criterio-valor" :class="`faixa-${faixa(resumo.eficienciaGeral)}`">
                  {{ formatarPercentual(resumo.eficienciaGeral) }}
                </strong>
                <span class="criterio-nota">menor tempo válido entre os dois</span>
              </article>
            </div>

            <div class="faixa-info efic-info">
              <div class="info">
                <span class="info-rotulo">Tempo necessário</span>
                <strong class="info-valor">{{ formatarHoras(resumo.tempoReferencia) }}</strong>
                <span class="info-nota">Σ peças × SAM</span>
              </div>
              <div class="info">
                <span class="info-rotulo">Tempo trabalhado</span>
                <strong class="info-valor">{{ formatarHoras(resumo.tempoTrabalhado) }}</strong>
                <span class="info-nota">{{ formatarNumero(resumo.profissionais) }} profissionais</span>
              </div>
              <div class="info">
                <span class="info-rotulo">Peças processadas</span>
                <strong class="info-valor">{{ formatarNumero(resumo.pecasApontadas) }}</strong>
                <span class="info-nota">soma de todas as etapas</span>
              </div>
              <div class="info">
                <span class="info-rotulo">Cobertura de referência</span>
                <strong class="info-valor">{{ formatarPercentual(resumo.referenciaCobertura) }}</strong>
                <span class="info-nota">do volume com referência medida</span>
              </div>
            </div>
          </template>
        </section>
      </main>

      <!-- ══════════════ CONTROLES ══════════════ -->
      <footer class="rodape">
        <div class="controles">
          <button class="botao" type="button" title="Slide anterior" @click="slideAnterior">‹</button>
          <button class="botao" type="button" :title="pausado ? 'Retomar' : 'Pausar'" @click="alternarPausa">
            {{ pausado ? '▶' : '❚❚' }}
          </button>
          <button class="botao" type="button" title="Próximo slide" @click="proximoSlide">›</button>
        </div>

        <div class="indicadores">
          <button
            v-for="(p, i) in paginas"
            :key="p.id"
            type="button"
            class="indicador"
            :class="{ ativo: slideAtual === i }"
            :title="p.titulo"
            @click="irParaSlide(i)"
          ></button>
        </div>

        <span class="rodape-info">
          {{ slideAtual + 1 }}/{{ paginas.length }} · {{ pausado ? 'pausado' : 'automático' }}
        </span>
      </footer>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import api from '@/Axios'
import { useAuthStore } from '@/store/store'

/* ================= CONFIGURAÇÃO ================= */
const DURACAO_SLIDE_S = 14
const INTERVALO_ATUALIZACAO_MS = 2 * 60 * 1000

// Paginação: nada é escondido por falta de espaço — o excedente continua
// na página seguinte, com o mesmo padrão visual.
const PROFISSIONAIS_POR_PAGINA = 6
const OPS_POR_PAGINA = 4

/* ================= ESTADO ================= */
const carregando = ref(true)
const erro = ref(null)
const painel = ref(null)
const metaDiariaGlobal = ref(null)
const ultimaAtualizacao = ref(null)
const socketConectado = ref(false)

const slideAtual = ref(0)
const pausado = ref(false)
const agora = ref(new Date())

/* ================= DADOS DERIVADOS ================= */
const vazio = computed(() => !painel.value || painel.value.vazio)
const dataLabel = computed(() => painel.value?.dataLabel || 'hoje')
const nomeEstabelecimento = computed(() => painel.value?.estabelecimento?.nome || 'Linha Tex')
const resumo = computed(() => painel.value?.resumo || {})
const porEtapa = computed(() => painel.value?.porEtapa || [])
const porOp = computed(() => painel.value?.porOp || [])
const profissionais = computed(() => painel.value?.profissionais || [])
const destaques = computed(
  () => painel.value?.destaques || { maiorEficiencia: null, naMeta: [], quantidadeNaMeta: 0 }
)

/**
 * TODAS as etapas cadastradas, com zero quando não houve apontamento.
 * `porEtapaCompleto` só existe no payload novo; o fallback mantém a tela de
 * pé com um servidor antigo (só as etapas COM produção).
 */
const etapas = computed(() => {
  const completo = painel.value?.porEtapaCompleto
  if (Array.isArray(completo) && completo.length) return completo
  return porEtapa.value
})

/**
 * Etapas que o slide de produção individual apresenta: SOMENTE quem teve
 * produção no dia. Zero não vira slide (vai para a página de ociosas).
 */
const etapasComProducao = computed(() => porEtapa.value.filter(e => Number(e.producao) > 0))

/** Todo o resto do cadastro: aparece numa página própria, com zero. */
const etapasOciosas = computed(() =>
  etapas.value.filter(e => !(Number(e.producao) > 0) && !e.emUsoNoDia)
)

/**
 * Eixo de horas do gráfico por etapa: contínuo, do primeiro ao último
 * horário apontado no dia. Se o servidor não mandar `horasDoDia`, deduz das
 * etapas (mesma leitura, só preenchendo o eixo).
 */
const horasDoDia = computed(() => {
  const doPainel = painel.value?.horasDoDia
  if (Array.isArray(doPainel) && doPainel.length) return doPainel

  const horas = new Set()
  for (const etapa of porEtapa.value) {
    for (const item of etapa.porHora || []) horas.add(item.hora)
  }

  const ordenadas = [...horas].sort()
  if (!ordenadas.length) return []

  const primeira = Number(String(ordenadas[0]).slice(0, 2))
  const ultima = Number(String(ordenadas[ordenadas.length - 1]).slice(0, 2))
  const eixo = []
  for (let h = primeira; h <= ultima; h += 1) eixo.push(`${String(h).padStart(2, '0')}:00`)
  return eixo
})

/**
 * Peças finalizadas × processadas. `disponivel: false` quando nenhuma OP do
 * dia tem etapa final identificável — aí o painel não mostra número.
 */
const finalizacao = computed(
  () =>
    painel.value?.finalizacao || {
      disponivel: true,
      pecas: Number(resumo.value.pecasConcluidas) || 0,
      configurada: painel.value?.estabelecimento?.etapaFinalConfigurada || null,
      etapasFinais: [],
    }
)

/** Nome(s) da etapa que fecha a peça, para o resumo e o aviso do KPI. */
const textoEtapaFinal = computed(() => {
  const nomes = (finalizacao.value.etapasFinais || []).map(e => e.etapa)
  if (nomes.length) return nomes.join(' · ')
  return finalizacao.value.configurada || 'não identificada'
})

/** Nomes que existem no cadastro do estabelecimento. */
const nomesCadastrados = computed(
  () => new Set(etapas.value.filter(e => e.cadastrada !== false).map(e => e.etapa))
)

const notaFinalizadas = computed(() => {
  if (!finalizacao.value.disponivel) {
    return 'indisponível: nenhuma etapa final identificada nas OPs do dia'
  }
  if (Number(finalizacao.value.pecas) > 0) return `etapa final: ${textoEtapaFinal.value}`
  return `sem peça na etapa final (${textoEtapaFinal.value}) até agora`
})

/** 1º lugar do ranking (só com produção válida). */
const destaque = computed(() => {
  const primeiro = destaques.value.maiorEficiencia
  if (primeiro) return primeiro
  return profissionais.value.find(p => p.posicao === 1 && p.producao > 0) || null
})

/** Demais colocados (o 1º já tem slide exclusivo). */
const ranking = computed(() => profissionais.value.filter(p => p.producao > 0).slice(1))

/* ================= NAVEGAÇÃO / PAGINAÇÃO ================= */

/** Quebra uma lista em páginas de `tamanho` (mínimo 1 página). */
function paginar(lista, tamanho) {
  if (!lista.length) return [[]]
  const saida = []
  for (let i = 0; i < lista.length; i += tamanho) {
    saida.push(lista.slice(i, i + tamanho))
  }
  return saida
}

function rotuloFaixa(inicio, quantidade, total) {
  if (!total) return 'sem registros'
  if (total <= quantidade) return `${total} no total`
  return `${inicio + 1}–${inicio + quantidade} de ${total}`
}

/**
 * Barras do gráfico de uma etapa: uma por hora do dia (eixo contínuo) e
 * altura relativa ao pior horário dela. Nenhum valor é recalculado — a
 * quantidade é a que veio da consolidação.
 */
function barrasDaEtapa(etapa) {
  const porHora = new Map((etapa.porHora || []).map(h => [h.hora, h.quantidade]))
  const horas = horasDoDia.value.length ? horasDoDia.value : [...porHora.keys()].sort()

  const valores = horas.map(hora => ({ hora, quantidade: porHora.get(hora) || 0 }))
  const maximo = valores.reduce((maior, v) => Math.max(maior, v.quantidade), 0)

  return valores.map(v => ({
    ...v,
    altura: maximo ? Math.round((v.quantidade / maximo) * 100) : 0,
  }))
}

/** Horário de maior volume da etapa (null quando não há produção). */
function picoDaEtapa(barras) {
  return barras.reduce((pico, b) => (b.quantidade > (pico?.quantidade || 0) ? b : pico), null)
}

/** Páginas com uma etapa cada, na ordem de produção (já vem do backend). */
function paginasDasEtapas() {
  const lista = etapasComProducao.value
  return lista.map((etapa, i) => {
    const barras = barrasDaEtapa(etapa)
    return {
      id: `etapa-${etapa.idEtapa ?? i}`,
      chave: 'etapa',
      titulo: `Etapa ${etapa.etapa}`,
      etapa,
      barras,
      pico: picoDaEtapa(barras),
      indice: i + 1,
      total: lista.length,
    }
  })
}

/** Lista completa de páginas na ordem de apresentação. */
const paginas = computed(() => {
  const lista = [{ id: 'resumo', chave: 'resumo', titulo: 'Resumo do dia' }]

  lista.push(...paginasDasEtapas())

  lista.push({ id: 'destaque', chave: 'destaque', titulo: 'Destaque do dia' })

  paginar(ranking.value, PROFISSIONAIS_POR_PAGINA).forEach((itens, i, todas) => {
    if (!itens.length) return
    lista.push({
      id: `ranking-${i}`,
      chave: 'ranking',
      titulo: 'Ranking de profissionais',
      itens,
      colunas: Math.min(3, Math.max(1, itens.length)),
      rotuloLinhas: todas.length > 1 ? `página ${i + 1} de ${todas.length}` : 'demais colocados',
    })
  })

  paginar(porOp.value, OPS_POR_PAGINA).forEach((itens, i) => {
    if (!itens.length) return
    lista.push({
      id: `ops-${i}`,
      chave: 'ops',
      titulo: 'Ordens de produção',
      itens,
      colunas: Math.min(4, Math.max(1, itens.length)),
      rotuloLinhas: rotuloFaixa(i * OPS_POR_PAGINA, itens.length, porOp.value.length),
    })
  })

  lista.push({ id: 'eficiencia', chave: 'eficiencia', titulo: 'Eficiência da fábrica' })

  // Nenhuma etapa cadastrada fica de fora: as que hoje não produziram e não
  // estão no fluxo de nenhuma OP aparecem nesta página, com zero.
  if (etapasOciosas.value.length) {
    lista.push({
      id: 'ociosas',
      chave: 'ociosas',
      titulo: 'Etapas sem produção hoje',
      itens: etapasOciosas.value,
    })
  }

  return lista
})

const paginaAtual = computed(() => paginas.value[slideAtual.value] || paginas.value[0] || null)

const metaDoDia = computed(() => {
  const doPainel = Number(resumo.value.metaTotal || 0)
  if (doPainel > 0) return doPainel
  return Number(metaDiariaGlobal.value?.meta_diaria || 0)
})

const percentualMetaBarra = computed(() => {
  const meta = metaDoDia.value
  if (!meta) return 0
  return Math.min(100, Math.round(((Number(resumo.value.pecasConcluidas) || 0) / meta) * 100))
})

const percentualMeta = computed(() => {
  if (!metaDoDia.value) return '—'
  return `${percentualMetaBarra.value}%`
})

const jornadaFormatada = computed(() => formatarHoras(resumo.value.jornadaMinutos))

/* ================= RELÓGIO / STATUS ================= */
const horaAtual = computed(() =>
  agora.value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
)

const atualizadoHa = computed(() => {
  if (!ultimaAtualizacao.value) return '—'
  const segundos = Math.floor((agora.value - ultimaAtualizacao.value) / 1000)
  if (segundos < 10) return 'agora'
  if (segundos < 60) return `há ${segundos}s`
  const minutos = Math.floor(segundos / 60)
  return `há ${minutos} min`
})

/* ================= FORMATAÇÃO ================= */
function formatarNumero(valor) {
  return Number(valor || 0).toLocaleString('pt-BR')
}

function formatarPercentual(valor) {
  if (valor === null || valor === undefined) return '—'
  const n = Number(valor)
  if (!Number.isFinite(n)) return '—'
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

/** Tempo de UMA pessoa: nunca passa da jornada do dia. */
function formatarHoras(minutos) {
  const total = Math.round(Number(minutos) || 0)
  if (!total) return '0h'
  const h = Math.floor(total / 60)
  const m = total % 60
  if (!h) return `${m}min`
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

/** SAM médio em minutos/peça. */
function formatarMinutos(valor) {
  const n = Number(valor)
  if (!Number.isFinite(n) || n <= 0) return '—'
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} min`
}

/** Percentual que não existe no dia vira "—" (nada é inventado). */
function percentualOuTraco(valor) {
  const n = Number(valor)
  if (!Number.isFinite(n) || n <= 0) return '—'
  return formatarPercentual(n)
}

/** "2026-03-10" → "10/03". */
function formatarData(iso) {
  const texto = String(iso || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return '—'
  return `${texto.slice(8, 10)}/${texto.slice(5, 7)}`
}

function rotuloSituacao(situacao) {
  if (situacao === 'concluida') return 'Concluída'
  if (situacao === 'atrasada') return 'Atrasada'
  return 'Em andamento'
}

const MEDALHAS = ['🥇', '🥈', '🥉']

/** Medalha do pódio do ranking (1º, 2º, 3º). */
function medalha(posicao) {
  return MEDALHAS[Number(posicao) - 1] || ''
}

function iniciais(nome) {
  const partes = String(nome || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!partes.length) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase()
}

/** Etapas de um profissional, resumidas para caber no card. */
function resumoEtapas(p) {
  const lista = p?.etapas || []
  if (!lista.length) return 'sem etapa registrada'
  const primeira = lista[0]
  if (lista.length === 1) return `${primeira.etapa} · ${formatarNumero(primeira.quantidade)}`
  return `${primeira.etapa} +${lista.length - 1} etapa(s)`
}

/** Faixa de cor do indicador (mesma leitura do restante do sistema). */
function faixa(valor) {
  if (valor === null || valor === undefined) return 'neutra'
  const n = Number(valor)
  if (!Number.isFinite(n) || n <= 0) return 'neutra'
  if (n >= 85) return 'alta'
  if (n >= 65) return 'media'
  return 'baixa'
}

/** "08:00" → "8h" (leitura rápida na TV). */
function horaCurta(hora) {
  const h = String(hora || '').split(':')[0]
  return h ? `${Number(h)}h` : '—'
}

/* ================= NAVEGAÇÃO ================= */
let decorrido = 0

function reiniciarContador() {
  decorrido = 0
}

function irParaSlide(indice) {
  const total = paginas.value.length
  if (!total) return
  slideAtual.value = ((indice % total) + total) % total
  reiniciarContador()
}

function proximoSlide() {
  irParaSlide(slideAtual.value + 1)
}

function slideAnterior() {
  irParaSlide(slideAtual.value - 1)
}

function alternarPausa() {
  pausado.value = !pausado.value
  reiniciarContador()
}

/* ================= DADOS ================= */
async function carregarPainel({ silencioso = false } = {}) {
  try {
    if (!silencioso) carregando.value = true
    erro.value = null

    const token = useAuthStore().pegar_token
    const resposta = await api.get('/producao/painel', {
      headers: { Authorization: token },
    })

    painel.value = resposta.data
    ultimaAtualizacao.value = new Date()
    carregando.value = false

    // A quantidade de páginas muda com os dados: se a página atual deixou de
    // existir, volta para a primeira em vez de ficar num índice vazio.
    if (slideAtual.value >= paginas.value.length) slideAtual.value = 0

    // Cobre metas cadastradas fora do padrão por OP.
    if (!Number(resposta.data?.resumo?.metaTotal || 0)) {
      carregarMetaGlobal()
    }
  } catch (err) {
    // Numa atualização silenciosa, mantém o painel no ar com os dados anteriores.
    if (!silencioso || !painel.value) {
      erro.value = err?.response?.data?.mensagem || err.message || 'Erro ao carregar dados.'
    }
    console.error('Erro ao carregar painel de produção:', err)
  } finally {
    carregando.value = false
  }
}

async function carregarMetaGlobal() {
  try {
    const token = useAuthStore().pegar_token
    const resposta = await api.get('/meta-diaria', { headers: { Authorization: token } })
    metaDiariaGlobal.value = resposta.data?.metaDiaria || null
  } catch (err) {
    metaDiariaGlobal.value = null
  }
}

/* ================= CICLO DE VIDA ================= */
const socket = io('https://acari-tex.onrender.com')

let timerRelogio = null
let timerSlides = null
let timerAtualizacao = null

function aoTeclar(evento) {
  if (evento.key === 'ArrowRight') proximoSlide()
  else if (evento.key === 'ArrowLeft') slideAnterior()
  else if (evento.key === ' ') {
    evento.preventDefault()
    alternarPausa()
  }
}

onMounted(() => {
  carregarPainel()

  timerRelogio = setInterval(() => {
    agora.value = new Date()
  }, 1000)

  timerSlides = setInterval(() => {
    if (pausado.value || vazio.value || !paginas.value.length) return

    decorrido += 1
    if (decorrido >= DURACAO_SLIDE_S) {
      decorrido = 0
      proximoSlide()
    }
  }, 1000)

  timerAtualizacao = setInterval(() => {
    if (!document.hidden) carregarPainel({ silencioso: true })
  }, INTERVALO_ATUALIZACAO_MS)

  const cnpj = useAuthStore().pegar_usuario?.cnpj

  socket.on('connect', () => (socketConectado.value = true))
  socket.on('disconnect', () => (socketConectado.value = false))
  socket.on(`nova_atualizacao_${cnpj}`, () => carregarPainel({ silencioso: true }))

  window.addEventListener('keydown', aoTeclar)
})

onUnmounted(() => {
  clearInterval(timerRelogio)
  clearInterval(timerSlides)
  clearInterval(timerAtualizacao)

  window.removeEventListener('keydown', aoTeclar)

  socket.off('connect')
  socket.off('disconnect')
  socket.disconnect()
})
</script>

<style scoped>
/* ======================================================================
   TOKENS — painel claro, verde institucional Linha Tex
   ====================================================================== */
.painel {
  --verde: #0d3927;
  --verde-medio: #145a32;
  --verde-escuro: #164b33;
  --verde-claro: #eaf4ee;
  --verde-linha: #d7e6dd;
  --fundo: #f7faf8;
  --card: #ffffff;
  --texto: #12291d;
  --texto-suave: #5b7a68;
  --alerta: #b3261e;
  --atencao: #a8763e;
  --sombra: 0 1px 2px rgba(13, 57, 39, 0.06), 0 6px 18px rgba(13, 57, 39, 0.05);

  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--fundo);
  color: var(--texto);
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
}

/* ======================================================================
   ESTADOS
   ====================================================================== */
.estado {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  text-align: center;
  padding: 2rem;
}

.estado-logo {
  width: 140px;
  opacity: 0.9;
}

.estado-logo.grande {
  width: 200px;
}

.estado h1 {
  font-size: clamp(1.2rem, 2vw, 1.8rem);
  color: var(--verde);
  margin: 0;
}

.estado p {
  margin: 0;
  color: var(--texto-suave);
  font-size: clamp(0.9rem, 1.1vw, 1.1rem);
}

.estado small {
  color: var(--texto-suave);
  font-size: 0.75rem;
}

.estado-interno {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  text-align: center;
  color: var(--texto-suave);
}

.estado-interno p {
  margin: 0;
  font-size: clamp(1rem, 1.4vw, 1.3rem);
  font-weight: 600;
  color: var(--verde);
}

.estado-interno small {
  font-size: 0.85rem;
}

/* ======================================================================
   TOPO
   ====================================================================== */
.topo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: clamp(8px, 1.1vh, 16px) clamp(16px, 1.8vw, 30px);
  background: var(--card);
  border-bottom: 1px solid var(--verde-linha);
}

.marca {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.marca-logo {
  height: clamp(30px, 4vh, 46px);
  width: auto;
}

.marca-texto {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.marca-nome {
  font-size: clamp(0.9rem, 1.25vw, 1.2rem);
  font-weight: 800;
  color: var(--verde);
}

.marca-sub {
  font-size: clamp(0.6rem, 0.8vw, 0.78rem);
  color: var(--texto-suave);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 600;
}

.topo-centro {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.05;
}

.relogio {
  font-size: clamp(1.3rem, 2.2vw, 2rem);
  font-weight: 800;
  color: var(--verde);
  font-variant-numeric: tabular-nums;
}

.topo-data {
  font-size: clamp(0.6rem, 0.85vw, 0.8rem);
  color: var(--texto-suave);
  text-transform: capitalize;
}

.topo-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: clamp(0.6rem, 0.8vw, 0.75rem);
  font-weight: 700;
  background: var(--verde-claro);
  color: var(--verde-medio);
}

.chip-off {
  background: #f1f3f1;
  color: var(--texto-suave);
}

.ponto {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.chip-on .ponto {
  animation: pulso 1.6s ease-in-out infinite;
}

.topo-atualizado {
  font-size: clamp(0.55rem, 0.75vw, 0.72rem);
  color: var(--texto-suave);
}

/* ======================================================================
   PALCO / SLIDE
   ====================================================================== */
.palco {
  flex: 1;
  min-height: 0;
  padding: clamp(12px, 1.6vh, 22px) clamp(16px, 1.8vw, 30px) 0;
  display: flex;
}

.slide {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.2vh, 16px);
  animation: entrar 0.45s ease;
}

.slide-cabecalho {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.slide-titulo {
  margin: 0;
  font-size: clamp(1.1rem, 1.75vw, 1.6rem);
  color: var(--verde);
  font-weight: 800;
  letter-spacing: -0.01em;
}

.slide-sub {
  margin: 2px 0 0;
  font-size: clamp(0.7rem, 0.92vw, 0.88rem);
  color: var(--texto-suave);
}

.selo {
  flex-shrink: 0;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--verde-claro);
  color: var(--verde-medio);
  font-size: clamp(0.65rem, 0.85vw, 0.8rem);
  font-weight: 700;
  white-space: nowrap;
}

.selo-meta {
  background: #fdf5e3;
  color: #8a6420;
}

/* ======================================================================
   SLIDE 1 — KPIs
   ====================================================================== */
.destaques {
  display: grid;
  grid-template-columns: 1.35fr repeat(4, minmax(0, 1fr));
  gap: clamp(8px, 1vw, 16px);
}

.kpi {
  background: var(--card);
  border: 1px solid var(--verde-linha);
  border-left: 4px solid var(--verde-medio);
  border-radius: 14px;
  padding: clamp(10px, 1.3vw, 18px);
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-shadow: var(--sombra);
}

.kpi-principal {
  border-left-width: 5px;
}

/* Peça finalizada é o número que interessa na TV: ganha destaque próprio. */
.kpi-final {
  background: linear-gradient(150deg, #ffffff 0%, #eef7f1 100%);
}

.kpi-indisponivel {
  color: var(--texto-suave);
}

.kpi-rotulo {
  font-size: clamp(0.62rem, 0.85vw, 0.8rem);
  color: var(--texto-suave);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.kpi-valor {
  font-size: clamp(1.6rem, 2.9vw, 2.8rem);
  font-weight: 800;
  color: var(--verde);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.kpi-nota {
  font-size: clamp(0.6rem, 0.8vw, 0.76rem);
  color: var(--texto-suave);
}

.faixa-info {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: clamp(8px, 1vw, 14px);
  flex: 1;
  min-height: 0;
  align-content: start;
}

.info {
  background: var(--card);
  border: 1px solid var(--verde-linha);
  border-radius: 14px;
  padding: clamp(9px, 1.1vw, 16px);
  display: flex;
  flex-direction: column;
  gap: 3px;
  box-shadow: var(--sombra);
}

.info-rotulo {
  font-size: clamp(0.6rem, 0.8vw, 0.76rem);
  color: var(--texto-suave);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.info-valor {
  font-size: clamp(1.05rem, 1.7vw, 1.6rem);
  font-weight: 800;
  color: var(--verde);
  font-variant-numeric: tabular-nums;
}

.info-nota {
  font-size: clamp(0.55rem, 0.75vw, 0.7rem);
  color: var(--texto-suave);
}

/* Nome da etapa final pode ser comprido: quebra em vez de cortar. */
.info-etapa-final {
  font-size: clamp(0.95rem, 1.35vw, 1.25rem);
  line-height: 1.15;
  overflow-wrap: break-word;
}

/* ======================================================================
   BARRAS / CORES DE FAIXA
   ====================================================================== */
.barra {
  height: 8px;
  border-radius: 999px;
  background: #e8efea;
  overflow: hidden;
  margin-top: 2px;
}

.barra-grande {
  height: 14px;
}

.barra-preenchida {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--verde-medio), #3f8f7a);
  transition: width 0.6s ease;
}

.fill-alta { background: linear-gradient(90deg, #145a32, #2e9e63); }
.fill-media { background: linear-gradient(90deg, #a8763e, #c9a06a); }
.fill-baixa { background: linear-gradient(90deg, #b3261e, #d05a4e); }
.fill-neutra { background: #c3d3c9; }

.faixa-alta { color: #145a32; }
.faixa-media { color: #a8763e; }
.faixa-baixa { color: #b3261e; }
.faixa-neutra { color: var(--texto-suave); }

.kpi-efic.faixa-alta { border-left-color: #2e9e63; }
.kpi-efic.faixa-media { border-left-color: #c9a06a; }
.kpi-efic.faixa-baixa { border-left-color: #d05a4e; }
.kpi-efic.faixa-neutra { border-left-color: #c3d3c9; }

/* ======================================================================
   SLIDE 2 — PRODUÇÃO POR ETAPA (um slide por etapa)
   ====================================================================== */
.etapa-painel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.2vh, 16px);
  background: var(--card);
  border: 1px solid var(--verde-linha);
  border-radius: 18px;
  padding: clamp(12px, 1.6vw, 26px);
  box-shadow: var(--sombra);
  overflow: hidden;
}

.etapa-topo {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: clamp(12px, 2vw, 32px);
  padding-bottom: clamp(8px, 1.2vh, 16px);
  border-bottom: 2px solid var(--verde-linha);
}

.etapa-identidade {
  flex: 1;
  min-width: 0;
}

.etapa-rotulo {
  display: block;
  font-size: clamp(0.66rem, 1vw, 0.9rem);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--texto-suave);
}

.etapa-nome {
  margin: 2px 0 0;
  font-size: clamp(1.6rem, 3.6vw, 3.6rem);
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -0.02em;
  color: var(--verde);
  overflow-wrap: break-word;
}

.etapa-pecas {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 0.9;
}

.etapa-pecas strong {
  font-size: clamp(3rem, 7vw, 6.5rem);
  font-weight: 800;
  color: var(--verde-medio);
  font-variant-numeric: tabular-nums;
}

.etapa-pecas span {
  margin-top: 6px;
  font-size: clamp(0.66rem, 1vw, 0.92rem);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--texto-suave);
}

.etapa-corpo {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: clamp(10px, 1.4vw, 24px);
}

.etapa-dados {
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  /* A eficiência ocupa a primeira linha; os demais indicadores dividem o
     resto da altura — nada de card pequeno com vazio embaixo. */
  grid-template-rows: auto repeat(3, minmax(0, 1fr));
  gap: clamp(8px, 1vw, 16px);
}

.etapa-dado {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  background: #f7faf8;
  border: 1px solid var(--verde-linha);
  border-left: 4px solid var(--verde-linha);
  border-radius: 14px;
  padding: clamp(8px, 1vw, 16px);
  min-width: 0;
}

.etapa-dado-efic {
  grid-column: 1 / -1;
  background: #ffffff;
}

.etapa-dado-efic.faixa-alta { border-left-color: #2e9e63; }
.etapa-dado-efic.faixa-media { border-left-color: #c9a06a; }
.etapa-dado-efic.faixa-baixa { border-left-color: #d05a4e; }
.etapa-dado-efic.faixa-neutra { border-left-color: #c3d3c9; }

.dado-rotulo {
  font-size: clamp(0.62rem, 0.9vw, 0.86rem);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--texto-suave);
}

.dado-valor {
  font-size: clamp(1.6rem, 3vw, 3rem);
  font-weight: 800;
  line-height: 1;
  color: var(--verde);
  font-variant-numeric: tabular-nums;
}

.etapa-dado-efic .dado-valor {
  font-size: clamp(2.4rem, 5vw, 4.6rem);
}

.dado-nota {
  font-size: clamp(0.58rem, 0.82vw, 0.8rem);
  color: var(--texto-suave);
}

/* Gráfico de produção por horário */
.etapa-grafico {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1vh, 14px);
  background: #f7faf8;
  border: 1px solid var(--verde-linha);
  border-radius: 16px;
  padding: clamp(10px, 1.2vw, 20px);
}

.grafico-topo {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.grafico-pico {
  font-size: clamp(0.62rem, 0.9vw, 0.86rem);
  font-weight: 700;
  color: var(--verde-medio);
}

.grafico-area {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  gap: clamp(4px, 0.8vw, 14px);
}

.barra-hora {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.barra-hora-valor {
  min-height: 1.2em;
  font-size: clamp(0.7rem, 1.3vw, 1.2rem);
  font-weight: 800;
  color: var(--verde);
  font-variant-numeric: tabular-nums;
}

.barra-hora-trilho {
  flex: 1;
  width: 100%;
  min-height: 0;
  display: flex;
  align-items: flex-end;
  background: #f1f6f3;
  border-radius: 10px;
  overflow: hidden;
}

.barra-hora-preenchida {
  width: 100%;
  border-radius: 10px 10px 0 0;
  background: linear-gradient(180deg, #2e9e63, #145a32);
  transition: height 0.6s ease;
}

.barra-hora-rotulo {
  font-size: clamp(0.62rem, 1vw, 0.95rem);
  font-weight: 700;
  color: var(--texto-suave);
}

/* ======================================================================
   SLIDE 4 — DESTAQUE DO DIA
   ====================================================================== */
.destaque-area {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  justify-content: center;
  overflow: hidden;
  border-radius: 20px;
  background: linear-gradient(135deg, #ffffff 0%, #eff7f2 55%, #e3f1e8 100%);
  border: 1px solid #cfe4d9;
}

.destaque-card {
  position: relative;
  z-index: 2;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(180px, 320px) 1fr;
  align-items: center;
  gap: clamp(14px, 2vw, 34px);
  padding: clamp(14px, 2vw, 34px);
}

.destaque-foto-area {
  position: relative;
  justify-self: center;
  width: 100%;
  max-width: 300px;
  aspect-ratio: 1;
}

.destaque-foto {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 6px solid #ffffff;
  box-shadow: 0 6px 24px rgba(13, 57, 39, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--verde-claro);
}

.destaque-iniciais {
  font-size: clamp(2rem, 5vw, 4rem);
  font-weight: 800;
  color: var(--verde-medio);
}

.destaque-medalha {
  position: absolute;
  top: -10px;
  right: -6px;
  font-size: clamp(1.6rem, 3vw, 2.6rem);
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.18));
  animation: medalha-pop 2.4s ease-in-out infinite;
}

.destaque-posicao {
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--verde);
  color: #fff;
  padding: 4px 14px;
  border-radius: 999px;
  font-size: clamp(0.6rem, 0.9vw, 0.82rem);
  font-weight: 800;
  white-space: nowrap;
}

.destaque-info {
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 0.9vh, 12px);
  min-width: 0;
}

.destaque-nome {
  margin: 0;
  font-size: clamp(1.4rem, 2.9vw, 2.8rem);
  font-weight: 800;
  color: var(--verde);
  line-height: 1.05;
  overflow: hidden;
  text-overflow: ellipsis;
}

.destaque-etapas {
  font-size: clamp(0.72rem, 1vw, 0.92rem);
  color: var(--texto-suave);
  font-weight: 600;
}

.destaque-eficiencia {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.destaque-eficiencia strong {
  font-size: clamp(2.4rem, 5.2vw, 5rem);
  font-weight: 800;
  line-height: 0.95;
  font-variant-numeric: tabular-nums;
}

.destaque-eficiencia span {
  font-size: clamp(0.62rem, 0.9vw, 0.85rem);
  color: var(--texto-suave);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.destaque-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(6px, 0.8vw, 12px);
}

.destaque-kpi {
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid #dbeae2;
  border-radius: 12px;
  padding: clamp(6px, 0.8vw, 12px);
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.destaque-kpi strong {
  font-size: clamp(1rem, 1.7vw, 1.6rem);
  font-weight: 800;
  color: var(--verde);
  font-variant-numeric: tabular-nums;
}

.destaque-kpi span {
  font-size: clamp(0.52rem, 0.72vw, 0.7rem);
  color: var(--texto-suave);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
}

.destaque-lista {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.destaque-lista li {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  background: #ffffff;
  border: 1px solid #dbeae2;
  border-radius: 999px;
  padding: 3px 12px;
  font-size: clamp(0.58rem, 0.82vw, 0.8rem);
  color: var(--texto-suave);
}

.destaque-lista strong {
  color: var(--verde);
  font-weight: 800;
}

.destaque-meta {
  align-self: flex-start;
  background: #fdf5e3;
  color: #8a6420;
  border-radius: 999px;
  padding: 4px 14px;
  font-size: clamp(0.6rem, 0.9vw, 0.82rem);
  font-weight: 800;
  letter-spacing: 0.04em;
}

/* Foguetes e confete do destaque */
.destaque-foguetes,
.destaque-confete {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 1;
}

.foguete {
  position: absolute;
  bottom: -12%;
  font-size: clamp(1.2rem, 2.2vw, 2rem);
  animation: foguete-subir 5s ease-in infinite;
  opacity: 0;
}

.foguete.f1 { left: 8%; animation-delay: 0.2s; }
.foguete.f2 { left: 22%; animation-delay: 1.8s; }
.foguete.f3 { left: 88%; animation-delay: 3.1s; }

.destaque-confete i {
  position: absolute;
  bottom: -10px;
  width: 7px;
  height: 11px;
  border-radius: 2px;
  opacity: 0;
  animation: confete-subir 6s linear infinite;
}

.destaque-confete i:nth-child(1) { left: 14%; background: #2e9e63; animation-delay: 0.4s; }
.destaque-confete i:nth-child(2) { left: 32%; background: #d9b26a; animation-delay: 2.1s; }
.destaque-confete i:nth-child(3) { left: 50%; background: #6aa84f; animation-delay: 3.6s; }
.destaque-confete i:nth-child(4) { left: 66%; background: #a8763e; animation-delay: 1.2s; }
.destaque-confete i:nth-child(5) { left: 79%; background: #3f8f7a; animation-delay: 4.4s; }
.destaque-confete i:nth-child(6) { left: 92%; background: #2e9e63; animation-delay: 5.4s; }

/* ======================================================================
   SLIDE 5 — RANKING
   ====================================================================== */
.grade-prof {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(var(--colunas, 3), minmax(0, 1fr));
  grid-auto-rows: minmax(0, 1fr);
  gap: clamp(8px, 1vw, 16px);
  overflow: hidden;
}

.prof-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: clamp(8px, 1vw, 14px);
  background: var(--card);
  border: 1px solid var(--verde-linha);
  border-radius: 14px;
  padding: clamp(9px, 1.1vw, 16px);
  box-shadow: var(--sombra);
  overflow: hidden;
  min-height: 0;
}

.prof-meta {
  background: #f6fbf8;
  border-color: #bfe3ce;
}

.podio-1 { border-color: #e0c46a; box-shadow: 0 0 0 2px rgba(224, 196, 106, 0.35), var(--sombra); }
.podio-2 { border-color: #c8d0d4; box-shadow: 0 0 0 2px rgba(200, 208, 212, 0.4), var(--sombra); }
.podio-3 { border-color: #d8b48a; box-shadow: 0 0 0 2px rgba(216, 180, 138, 0.35), var(--sombra); }

.prof-posicao {
  position: absolute;
  top: 8px;
  right: 10px;
  font-size: clamp(0.65rem, 0.9vw, 0.82rem);
  font-weight: 800;
  color: var(--texto-suave);
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.avatar-foto {
  width: clamp(44px, 5vw, 74px);
  height: clamp(44px, 5vw, 74px);
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--verde-linha);
  background: var(--verde-claro);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-iniciais {
  font-weight: 800;
  color: var(--verde-medio);
  font-size: clamp(0.85rem, 1.2vw, 1.15rem);
}

.podio-medalha {
  position: absolute;
  bottom: -4px;
  right: -4px;
  font-size: clamp(0.9rem, 1.4vw, 1.35rem);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.15));
  animation: medalha-pop 2.8s ease-in-out infinite;
}

.prof-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.prof-nome {
  font-size: clamp(0.78rem, 1.1vw, 1.02rem);
  font-weight: 700;
  color: var(--verde);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prof-efic {
  font-size: clamp(1.05rem, 1.75vw, 1.6rem);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.prof-nota,
.prof-etapas {
  font-size: clamp(0.56rem, 0.76vw, 0.72rem);
  color: var(--texto-suave);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prof-selo {
  position: absolute;
  bottom: 6px;
  right: 8px;
  background: #fdf5e3;
  color: #8a6420;
  border-radius: 999px;
  padding: 1px 8px;
  font-size: clamp(0.5rem, 0.68vw, 0.64rem);
  font-weight: 800;
}

/* ======================================================================
   SLIDE 6 — ORDENS DE PRODUÇÃO
   ====================================================================== */
.grade-ops {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(var(--colunas, 2), minmax(0, 1fr));
  grid-auto-rows: minmax(0, 1fr);
  gap: clamp(8px, 1vw, 16px);
  overflow: hidden;
}

.op-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: clamp(5px, 0.7vh, 9px);
  background: var(--card);
  border: 1px solid var(--verde-linha);
  border-left: 5px solid var(--verde-medio);
  border-radius: 14px;
  padding: clamp(8px, 1vw, 14px);
  box-shadow: var(--sombra);
  min-height: 0;
  overflow: hidden;
}

.op-concluida { border-left-color: #2e9e63; }
.op-atrasada { border-left-color: #b3261e; }
.op-andamento { border-left-color: #a8763e; }

.op-topo {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.op-identidade {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.op-numero {
  font-size: clamp(0.72rem, 1vw, 0.92rem);
  font-weight: 800;
  color: var(--verde-medio);
  letter-spacing: 0.02em;
}

.op-descricao {
  font-size: clamp(0.82rem, 1.15vw, 1.08rem);
  font-weight: 700;
  color: var(--verde);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.op-selo {
  flex-shrink: 0;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: clamp(0.52rem, 0.72vw, 0.68rem);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: #f7f0e4;
  color: #8a6420;
}

.op-selo-concluida { background: var(--verde-claro); color: var(--verde-medio); }
.op-selo-atrasada { background: #fdeceb; color: var(--alerta); }

.op-progresso {
  display: flex;
  align-items: center;
  gap: clamp(8px, 1vw, 14px);
}

.op-percentual {
  font-size: clamp(1.3rem, 2.2vw, 2rem);
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  min-width: 3.4em;
}

.op-barra-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.op-barra-nota {
  font-size: clamp(0.56rem, 0.76vw, 0.72rem);
  color: var(--texto-suave);
  font-weight: 600;
}

.op-dados {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
  font-size: clamp(0.56rem, 0.78vw, 0.74rem);
  color: var(--texto-suave);
}

.op-dados em {
  font-style: normal;
  font-weight: 800;
  color: var(--verde);
}

.op-entrega {
  font-weight: 700;
  color: var(--atencao);
}

.op-atrasada .op-entrega {
  color: var(--alerta);
}

/* Poucas OPs = card largo: as etapas se espalham em colunas em vez de virar
   uma lista comprida de largura total. */
.op-etapas {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  align-content: start;
  gap: 2px clamp(8px, 1vw, 18px);
  overflow: hidden;
}

.op-etapas li {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  align-items: baseline;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: clamp(0.56rem, 0.78vw, 0.74rem);
  color: var(--texto-suave);
}

.op-etapa-final {
  background: var(--verde-claro);
  color: var(--verde-medio);
  font-weight: 700;
}

.op-etapa-nome {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.op-etapa-nome i {
  font-style: normal;
  margin-right: 4px;
  color: #2e9e63;
}

.op-etapa-qtd {
  font-weight: 800;
  color: var(--verde);
  font-variant-numeric: tabular-nums;
}

.op-etapa-efic {
  min-width: 3.6em;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.op-etapa-mais {
  font-size: clamp(0.52rem, 0.7vw, 0.66rem);
  color: var(--texto-suave);
  justify-items: center;
}

/* ======================================================================
   SLIDE 7 — ETAPAS SEM PRODUÇÃO (chips com zero)
   ====================================================================== */
.chips-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: clamp(5px, 0.7vw, 10px);
  background: var(--card);
  border: 1px solid var(--verde-linha);
  border-radius: 16px;
  padding: clamp(10px, 1.2vw, 18px);
  box-shadow: var(--sombra);
}

.chip-etapa {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f7faf8;
  border: 1px solid var(--verde-linha);
  border-radius: 999px;
  padding: clamp(3px, 0.4vw, 6px) clamp(9px, 1vw, 14px);
  max-width: 100%;
}

.chip-etapa-nome {
  font-size: clamp(0.6rem, 0.85vw, 0.82rem);
  font-weight: 600;
  color: var(--verde);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-etapa-zero {
  font-size: clamp(0.58rem, 0.78vw, 0.74rem);
  font-weight: 800;
  color: #b9c9c0;
  font-variant-numeric: tabular-nums;
}

/* ======================================================================
   SLIDE 8 — EFICIÊNCIA DA FÁBRICA
   ====================================================================== */
.criterios {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(8px, 1vw, 16px);
}

.criterio {
  background: var(--card);
  border: 1px solid var(--verde-linha);
  border-left: 4px solid var(--verde-linha);
  border-radius: 14px;
  padding: clamp(8px, 1vw, 14px);
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-shadow: var(--sombra);
}

.criterio-principal {
  border-left-color: var(--verde-medio);
}

.criterio-rotulo {
  font-size: clamp(0.6rem, 0.8vw, 0.76rem);
  color: var(--texto-suave);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.criterio-valor {
  font-size: clamp(1.3rem, 2.2vw, 2.1rem);
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.criterio-nota {
  font-size: clamp(0.54rem, 0.72vw, 0.68rem);
  color: var(--texto-suave);
}

.efic-info {
  flex: 1;
  min-height: 0;
  align-content: start;
}

/* ======================================================================
   RODAPÉ / CONTROLES
   ====================================================================== */
.rodape {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: clamp(6px, 0.9vh, 12px) clamp(16px, 1.8vw, 30px);
  background: var(--card);
  border-top: 1px solid var(--verde-linha);
}

.controles {
  display: flex;
  gap: 6px;
}

.botao {
  width: clamp(28px, 2.4vw, 38px);
  height: clamp(26px, 2.2vw, 34px);
  border-radius: 9px;
  border: 1px solid var(--verde-linha);
  background: var(--card);
  color: var(--verde-medio);
  font-size: clamp(0.7rem, 0.95vw, 0.9rem);
  font-weight: 800;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.botao:hover {
  background: var(--verde-claro);
}

.indicadores {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  justify-content: center;
}

.indicador {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  padding: 0;
  background: #cddcd3;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
}

.indicador.ativo {
  background: var(--verde-medio);
  transform: scale(1.4);
}

.rodape-info {
  font-size: clamp(0.55rem, 0.75vw, 0.72rem);
  color: var(--texto-suave);
  font-weight: 600;
  white-space: nowrap;
}

/* ======================================================================
   UTILITÁRIOS / ANIMAÇÕES
   ====================================================================== */
.vazio-linha {
  margin: 0;
  padding: 8px;
  text-align: center;
  font-size: clamp(0.62rem, 0.85vw, 0.8rem);
  color: var(--texto-suave);
}

@keyframes entrar {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulso {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

@keyframes medalha-pop {
  0%, 100% { transform: scale(1) rotate(-4deg); }
  50% { transform: scale(1.12) rotate(4deg); }
}

@keyframes foguete-subir {
  0% { transform: translateY(0) rotate(8deg) scale(0.9); opacity: 0; }
  10% { opacity: 1; }
  70% { opacity: 1; }
  100% { transform: translateY(-115vh) rotate(8deg) scale(1.15); opacity: 0; }
}

@keyframes confete-subir {
  0% { transform: translateY(0) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  85% { opacity: 1; }
  100% { transform: translateY(-105vh) rotate(320deg); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .slide,
  .foguete,
  .destaque-confete i,
  .destaque-medalha,
  .podio-medalha,
  .chip-on .ponto {
    animation: none;
  }
}
</style>
