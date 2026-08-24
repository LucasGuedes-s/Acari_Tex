<template>
  <div class="painel">

    <!-- TOP BAR -->
    <header class="top-bar">
      <div class="metrics-row">
        <div v-if="isFabrica" class="metric-chip accent">
          <span class="mc-label">Eficiência Referência</span>
          <span class="mc-val">{{ eficienciaMediaTurmaReferencia }}%</span>
        </div>
        <div class="metric-chip accent">
          <span class="mc-label">{{ isFabrica ? 'Eficiência Ficha' : 'Eficiência da turma' }}</span>
          <span class="mc-val">{{ eficienciaMediaTurma }}%</span>
        </div>
        <div class="metric-chip">
          <span class="mc-label">Funcionários</span>
          <span class="mc-val">{{ funcionariosOrdenados.length }}</span>
        </div>
        <div class="metric-chip">
          <span class="mc-label">Peças entregues</span>
          <span class="mc-val">{{ totalPecasGeral }}</span>
        </div>
        <div class="metric-chip" v-if="opsAtivas.length">
          <span class="mc-label">Peça do dia</span>
          <span class="mc-val peca-chip">{{ opsAtivas.map(o => nomeDaOp(o.pecaId)).join(', ') }}</span>
        </div>
      </div>
      <button
        v-if="temMultiplasOpsComProducao"
        class="btn-detalhe-ops"
        @click="mostrarDetalheOps = !mostrarDetalheOps"
      >
        {{ mostrarDetalheOps ? 'Ocultar' : 'Ver' }} detalhe por OP ({{ gruposProducaoPorOp.length }})
      </button>

      <div class="top-bar-right">
        <span class="socket-dot" :class="{ conectado: socketConectado }" :title="socketConectado ? 'Conectado' : 'Desconectado'"></span>
      </div>
    </header>
    <transition name="panel-slide">
  <section v-if="mostrarDetalheOps && temMultiplasOpsComProducao" class="ops-detalhe">
    <div class="ops-detalhe-grid">
      <div v-for="op in gruposProducaoPorOp" :key="op.opId" class="op-detalhe-card">
        <div class="op-detalhe-top">
          <span class="op-detalhe-nome">{{ op.nome }}</span>
          <span
            v-if="op.multiplasEtapas"
            class="op-detalhe-tag"
            title="Esta OP teve mais de uma etapa registrada — os totais abaixo já somam todos os lançamentos de todas as etapas"
          >várias etapas</span>
        </div>
        <div class="op-detalhe-stats">
          <div class="op-detalhe-stat">
            <span class="op-detalhe-stat-label">Produção</span>
            <span class="op-detalhe-stat-val">{{ op.producao }}</span>
          </div>
          <div v-if="op.metaConfigurada !== null" class="op-detalhe-stat">
            <span class="op-detalhe-stat-label">Meta</span>
            <span class="op-detalhe-stat-val">{{ op.metaConfigurada }}</span>
          </div>
          <div class="op-detalhe-stat">
            <span class="op-detalhe-stat-label">Tempo registrado</span>
            <span class="op-detalhe-stat-val">{{ op.tempoTrabalhado }} min</span>
          </div>
          <div class="op-detalhe-stat">
            <span class="op-detalhe-stat-label">Capacidade (Ficha)</span>
            <span class="op-detalhe-stat-val">{{ op.tempoPadraoTotal }} min</span>
          </div>
          <div v-if="isFabrica" class="op-detalhe-stat">
            <span class="op-detalhe-stat-label">Capacidade (Referência)</span>
            <span class="op-detalhe-stat-val">{{ op.tempoReferenciaTotal }} min</span>
          </div>
          <div class="op-detalhe-stat">
            <span class="op-detalhe-stat-label">{{ isFabrica ? 'Efic. Ficha' : 'Eficiência' }}</span>
            <span class="op-detalhe-stat-val" :class="clsEfic(op.eficienciaFicha)">{{ op.eficienciaFicha }}%</span>
          </div>
          <div v-if="isFabrica" class="op-detalhe-stat">
            <span class="op-detalhe-stat-label">Efic. Ref.</span>
            <span class="op-detalhe-stat-val" :class="clsEfic(op.eficienciaReferencia)">{{ op.eficienciaReferencia }}%</span>
          </div>
        </div>
        <div class="op-detalhe-formula">
          {{ op.tempoPadraoTotal }} ÷ {{ op.tempoTrabalhado }} × 100 = {{ op.eficienciaFicha }}%
        </div>
      </div>
    </div>

    <div class="ops-detalhe-footer">
      <span>Média ponderada das OPs{{ isFabrica ? ' (Ficha)' : '' }}:</span>
      <strong :class="clsEfic(eficienciaMediaPonderadaOps)">{{ eficienciaMediaPonderadaOps }}%</strong>
      <template v-if="isFabrica">
        <span class="ops-detalhe-footer-sep">·</span>
        <span>Referência:</span>
        <strong :class="clsEfic(eficienciaMediaPonderadaOpsReferencia)">{{ eficienciaMediaPonderadaOpsReferencia }}%</strong>
      </template>
    </div>

    <!-- DETALHE POR FUNCIONÁRIO × OP -->
    <!-- Mostra exatamente como cada percentual foi obtido: apenas os
         intervalos com produção registrada daquela OP entram na conta,
         nunca a jornada completa. -->
    <div class="detalhe-func-op">
      <button class="btn-detalhe-ops btn-detalhe-ops--secundario" @click="mostrarDetalheFuncOp = !mostrarDetalheFuncOp">
        {{ mostrarDetalheFuncOp ? 'Ocultar' : 'Ver' }} detalhamento por funcionário e OP ({{ detalhePorFuncionarioEOp.length }})
      </button>

      <div v-if="mostrarDetalheFuncOp" class="detalhe-func-op-tbl-wrap">
        <table class="detalhe-func-op-tbl">
          <thead>
            <tr>
              <th>OP</th>
              <th>Funcionário</th>
              <th>Etapa(s)</th>
              <th class="ta-r">Qtd. produzida</th>
              <th class="ta-r">Tempo registrado</th>
              <th class="ta-r">Capacidade (Ficha)</th>
              <th v-if="isFabrica" class="ta-r">Capacidade (Referência)</th>
              <th class="ta-r">Efic. Ficha</th>
              <th v-if="isFabrica" class="ta-r">Efic. Referência</th>
              <th>Fórmula</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(linha, i) in detalhePorFuncionarioEOp" :key="i">
              <td>{{ linha.opNome }}</td>
              <td>{{ linha.funcionario }}</td>
              <td>{{ linha.etapa }}</td>
              <td class="ta-r mono">{{ linha.quantidadeProduzida }}</td>
              <td class="ta-r mono">{{ linha.tempoRegistrado }} min</td>
              <td class="ta-r mono">{{ linha.tempoFicha }} min</td>
              <td v-if="isFabrica" class="ta-r mono">{{ linha.tempoReferencia }} min</td>
              <td class="ta-r">
                <span class="badge sm" :class="clsEfic(linha.eficienciaFicha)">{{ linha.eficienciaFicha }}%</span>
              </td>
              <td v-if="isFabrica" class="ta-r">
                <span class="badge sm" :class="clsEfic(linha.eficienciaReferencia)">{{ linha.eficienciaReferencia }}%</span>
              </td>
              <td class="mono small">{{ linha.formula }}</td>
            </tr>
          </tbody>
        </table>

        <div v-if="!detalhePorFuncionarioEOp.length" class="dp-empty">
          Sem produção registrada para detalhar
        </div>
      </div>
    </div>
  </section>
</transition>
    <!-- MAIN -->
    <div class="main-layout" :class="{ 'panel-open': selecionado !== null }">
      
      <!-- LISTA -->
      <div class="grid-area">
        <div class="list-toolbar">
          <span class="list-title">Profissionais</span>
          <div class="list-toolbar-right">
            <div v-if="isFabrica" class="sort-toggle" role="tablist" aria-label="Ordenar por">
              <button
                class="sort-toggle-btn"
                :class="{ active: modoOrdenacao === 'ficha' }"
                @click="definirModoOrdenacao('ficha')"
              >Ficha</button>
              <button
                class="sort-toggle-btn"
                :class="{ active: modoOrdenacao === 'referencia' }"
                @click="definirModoOrdenacao('referencia')"
              >Referência</button>
            </div>
            <input class="search-input" v-model="busca" placeholder="Buscar…" />
            <span class="list-count">{{ funcionariosFiltrados.length }} de {{ funcionariosOrdenados.length }}</span>
          </div>
        </div>

        <div class="list-header" :class="{ fabrica: isFabrica }">
          <span class="lh-name">Nome</span>
          <span class="lh-col">Peças</span>
          <template v-if="isFabrica">
            <span class="lh-col">Efic. Ficha</span>
            <span class="lh-col">Efic. Ref.</span>
          </template>
          <span v-else class="lh-col">Eficiência</span>
        </div>

        <div class="list-body">
          <div
            v-for="func in funcionariosFiltrados"
            :key="func.email"
            class="list-row"
            :class="{ selected: selecionado === func._idx, fabrica: isFabrica, 'sem-producao': !temProducao(func) }"
            @click="selecionar(func._idx)"
          >
            <div class="lr-name">
              <span class="lr-pos" :class="{ medal: func._idx < 3 }">{{ rankIcon(func._idx) }}</span>
              <div class="lr-avatar-wrap">
                <img v-if="func.foto" class="lr-avatar" :src="func.foto" :alt="func.nome" @error="onImgError" />
                <div v-else class="lr-avatar-fb">{{ initials(func.nome) }}</div>
                <span class="lr-dot" :class="clsEfic(calcularEficienciaFuncionario(func))"></span>
              </div>
              <div class="lr-info">
                <span class="lr-nome">{{ func.nome }}</span>
                <span class="lr-sub">{{ func.email }}</span>
              </div>
            </div>

            <span class="lr-col mono">{{ calcularTotalFuncionario(func) }}</span>

            <template v-if="isFabrica">
              <span class="lr-col" style="display:flex; align-items:center; justify-content:flex-end;">
                <span v-if="temProducao(func)" class="badge sm" :class="clsEfic(calcularEficienciaFuncionario(func))">
                  {{ calcularEficienciaFuncionario(func) }}%
                </span>
                <span v-else class="mono small">—</span>
              </span>
              <span class="lr-col" style="display:flex; align-items:center; justify-content:flex-end;">
                <span v-if="temProducao(func)" class="badge sm" :class="clsEfic(calcularEficienciaReferenciaFuncionario(func))">
                  {{ calcularEficienciaReferenciaFuncionario(func) }}%
                </span>
                <span v-else class="mono small">—</span>
              </span>
            </template>
            <span v-else class="lr-col" style="display:flex; gap:4px; align-items:center; justify-content:flex-end;">
              <span v-if="temProducao(func)" class="badge" :class="clsEfic(calcularEficienciaFuncionario(func))">
                {{ calcularEficienciaFuncionario(func) }}%
              </span>
              <span v-else class="mono small">—</span>
            </span>
          </div>

          <div v-if="!funcionariosFiltrados.length && !loading" class="list-empty">
            <span v-if="busca">Nenhum resultado para "{{ busca }}"</span>
            <span v-else>Sem dados para esta data</span>
          </div>

          <div v-if="loading" class="list-empty">Carregando…</div>
        </div>
      </div>

      <!-- PAINEL DETALHE -->
      <transition name="panel-slide">
        <aside v-if="selecionado !== null && funcSelecionado" class="detail-panel">

          <div class="dp-topbar">
            <span class="dp-topbar-title">Detalhes</span>
            <button class="dp-close" @click="selecionado = null">✕</button>
          </div>

          <!-- Profile -->
          <div class="dp-profile">
            <div class="dp-avatar-wrap">
              <img v-if="funcSelecionado.foto" class="dp-avatar" :src="funcSelecionado.foto" :alt="funcSelecionado.nome" @error="onImgError" />
              <div v-else class="dp-avatar-fb">{{ initials(funcSelecionado.nome) }}</div>
              <span class="dp-dot" :class="clsEfic(calcularEficienciaFuncionario(funcSelecionado))"></span>
            </div>
            <div class="dp-profile-info">
              <h3 class="dp-nome">{{ funcSelecionado.nome }}</h3>
              <p class="dp-email">{{ funcSelecionado.email }}</p>
            </div>
            <div v-if="isFabrica" class="dp-badges-duplas">
              <span class="badge lg" :class="clsEfic(calcularEficienciaFuncionario(funcSelecionado))">
                Ficha {{ calcularEficienciaFuncionario(funcSelecionado) }}%
              </span>
              <span class="badge lg" :class="clsEfic(calcularEficienciaReferenciaFuncionario(funcSelecionado))">
                Ref. {{ calcularEficienciaReferenciaFuncionario(funcSelecionado) }}%
              </span>
            </div>
            <span v-else class="badge xlg" :class="clsEfic(calcularEficienciaFuncionario(funcSelecionado))">
              {{ calcularEficienciaFuncionario(funcSelecionado) }}%
            </span>
          </div>

          <!-- Métricas -->
          <div class="dp-stats">
            <div class="dp-stat">
              <span class="dp-stat-label">Peças (final)</span>
              <span class="dp-stat-val">{{ calcularTotalFinalizadoFuncionario(funcSelecionado) }}</span>
            </div>
            <div class="dp-stat-div"></div>
            <template v-if="isFabrica">
              <div class="dp-stat">
                <span class="dp-stat-label">Efic. Ficha</span>
                <span class="dp-stat-val" :class="clsEfic(calcularEficienciaFuncionario(funcSelecionado))">
                  {{ calcularEficienciaFuncionario(funcSelecionado) }}%
                </span>
              </div>
              <div class="dp-stat-div"></div>
              <div class="dp-stat">
                <span class="dp-stat-label">Efic. Ref.</span>
                <span class="dp-stat-val" :class="clsEfic(calcularEficienciaReferenciaFuncionario(funcSelecionado))">
                  {{ calcularEficienciaReferenciaFuncionario(funcSelecionado) }}%
                </span>
              </div>
              <div class="dp-stat-div"></div>
            </template>
            <div v-else class="dp-stat">
              <span class="dp-stat-label">Eficiência</span>
              <span class="dp-stat-val" :class="clsEfic(calcularEficienciaFuncionario(funcSelecionado))">
                {{ calcularEficienciaFuncionario(funcSelecionado) }}%
              </span>
            </div>
            <div v-if="!isFabrica" class="dp-stat-div"></div>
            <div class="dp-stat">
              <span class="dp-stat-label">Linhas</span>
              <span class="dp-stat-val">{{ (funcSelecionado.linhas || []).length }}</span>
            </div>
          </div>

          <!-- Barra de eficiência -->
          <div class="dp-eff-bar-wrap">
            <div class="dp-eff-bar-labels">
              <span>{{ isFabrica ? 'Eficiência da ficha (tempos do dia)' : 'Eficiência geral (tempos do dia)' }}</span>
              <span :class="clsEfic(calcularEficienciaFuncionario(funcSelecionado))">
                {{ calcularEficienciaFuncionario(funcSelecionado) }}%
              </span>
            </div>
            <div class="dp-eff-bar-track">
              <div
                class="dp-eff-bar-fill"
                :class="clsEfic(calcularEficienciaFuncionario(funcSelecionado))"
                :style="{ width: Math.min(calcularEficienciaFuncionario(funcSelecionado), 100) + '%' }"
              ></div>
            </div>
          </div>

          <!-- Barra de eficiência de referência (apenas fábricas) -->
          <div v-if="isFabrica" class="dp-eff-bar-wrap">
            <div class="dp-eff-bar-labels">
              <span>Eficiência de referência (tempos do dia)</span>
              <span :class="clsEfic(calcularEficienciaReferenciaFuncionario(funcSelecionado))">
                {{ calcularEficienciaReferenciaFuncionario(funcSelecionado) }}%
              </span>
            </div>
            <div class="dp-eff-bar-track">
              <div
                class="dp-eff-bar-fill"
                :class="clsEfic(calcularEficienciaReferenciaFuncionario(funcSelecionado))"
                :style="{ width: Math.min(calcularEficienciaReferenciaFuncionario(funcSelecionado), 100) + '%' }"
              ></div>
            </div>
          </div>

          <!-- Auditoria: tempos acumulados do dia inteiro, para conferir
               exatamente como a eficiência acima foi obtida. -->
          <div v-if="totaisFuncionarioSelecionado" class="dp-auditoria">
            <div class="dp-auditoria-titulo">Como esse número foi calculado</div>
            <div class="dp-auditoria-grid">
              <div class="dp-auditoria-item">
                <span class="dp-auditoria-label">Tempo registrado total</span>
                <span class="dp-auditoria-val">{{ totaisFuncionarioSelecionado.tempoRegistrado }} min</span>
              </div>
              <div class="dp-auditoria-item">
                <span class="dp-auditoria-label">Capacidade (Ficha) total</span>
                <span class="dp-auditoria-val">{{ totaisFuncionarioSelecionado.tempoFicha }} min</span>
              </div>
              <div v-if="isFabrica" class="dp-auditoria-item">
                <span class="dp-auditoria-label">Capacidade (Referência) total</span>
                <span class="dp-auditoria-val">{{ totaisFuncionarioSelecionado.tempoReferencia }} min</span>
              </div>
            </div>
            <div class="dp-auditoria-formula">
              <div><strong>Eficiência Ficha:</strong> {{ totaisFuncionarioSelecionado.formulaFicha }}</div>
              <div v-if="isFabrica"><strong>Eficiência Referência:</strong> {{ totaisFuncionarioSelecionado.formulaReferencia }}</div>
            </div>
          </div>

          <!-- Tabs -->
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
                    R {{ calcularEficienciaReferenciaLinha(linha) }}%
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
                  padrão: {{ linha.tempoPadrao }} min/pç · referência: {{ tempoEfetivoLinha(linha) }} min/pç
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
                <span v-if="!isFabrica" class="dp-hora-total">{{ hg.totalPecas }} peças · {{ hg.eficiencia }}%</span>
                <span v-else class="dp-hora-total">
                  {{ hg.totalPecas }} peças · F {{ hg.eficiencia }}% · R {{ hg.eficienciaReferencia }}%
                </span>
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

              <table class="dp-hora-tbl">
                <thead>
                  <tr>
                    <th>Etapa</th>
                    <th class="ta-r">Qtd.</th>
                    <th class="ta-r">Tempo prod.</th>
                    <th class="ta-r" v-if="!isFabrica">Eficiência</th>
                    <template v-else>
                      <th class="ta-r">Efic. Ficha</th>
                      <th class="ta-r">Efic. Ref.</th>
                    </template>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(et, ei) in hg.etapas" :key="ei">
                    <td class="dp-hora-etapa-nome">
                      {{ et.descricao }}
                      <span v-if="et.isFinal" class="tag-final">final</span>
                    </td>
                    <td class="ta-r mono">{{ et.quantidade }} pç</td>
                    <td class="ta-r mono">{{ et.tempoProduzido }} min</td>
                    <td class="ta-r" v-if="!isFabrica">
                      <span class="badge sm" :class="clsEfic(et.eficiencia)">{{ et.eficiencia }}%</span>
                    </td>
                    <template v-else>
                      <td class="ta-r">
                        <span class="badge sm" :class="clsEfic(et.eficiencia)">{{ et.eficiencia }}%</span>
                      </td>
                      <td class="ta-r">
                        <span class="badge sm" :class="clsEfic(et.eficienciaReferencia)">{{ et.eficienciaReferencia }}%</span>
                      </td>
                    </template>
                  </tr>
                </tbody>
              </table>
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
import {
  horaParaMinutos,
  isEtapaFinal,
  resolverTempoPadrao,
  resolverTempoEfetivoReferencia,
  calcularTotalLinha,
  calcularPecasFinalizadasFuncionario,
  calcularEficienciaLinhaPadrao,
  calcularEficienciaLinhaReferencia,
  calcularEficienciaRegistroPadrao,
  calcularEficienciaRegistroReferencia,
  calcularEficienciaFuncionarioPadrao,
  calcularEficienciaFuncionarioReferencia,
  calcularEficienciaFuncionarioPorModo,
  calcularTotaisFuncionarioDia,
  horaBloqueadaPorAusencia,
  agruparProducaoPorOp,
  resumoConsolidadoOp,
  detalharEficienciaPorFuncionarioEOp,
  // calcularEficienciaOpAgrupada,
  // calcularEficienciaOpAgrupadaReferencia,
  calcularEficienciaMediaPonderadaOps,
  calcularResumoEficienciaGeral,
  minutosDisponiveisDia,
} from '@/utils/producaoCompartilhada'

const socket = io('https://acari-tex.onrender.com', { transports: ['websocket'] })

// Chave para customização manual dos minutos de jornada (uso exclusivo
// de projeções de capacidade — não afeta mais nenhum cálculo de
// eficiência, ver producaoCompartilhada.js).
const LOCAL_STORAGE_MINUTOS_KEY = 'apontamento-minutos-turno'

// ── RESTAURAÇÃO DE TEMPO DE REFERÊNCIA ESCOLHIDO PELO USUÁRIO ──────
// O Registro de Produção salva no localStorage qual "modo de tempo"
// (padrão da ficha ou referência de um funcionário específico) o usuário
// escolheu para cada etapa/linha. Este componente lê essas escolhas para
// garantir que os cálculos de eficiência usem o valor correto.
const LS_TEMPO_REF_PREFIXO = 'apontamento_tempo_referencia_escolhido'

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
      mostrarDetalheOps: false,
      mostrarDetalheFuncOp: false,
      loading: true,
      socketConectado: false,
      busca: '',
      selecionado: null,
      abaAtiva: 'Etapas',
      tabs: ['Etapas', 'Por hora'],

      opsAtivas: [],
      funcionariosDia: [],
      pecas: [],
      tipoProducao: null,

      // Índices O(1) de etapas — igual ao Registro de Produção.
      etapasPorId: new Map(),

      dataCarregada: null,
      ultimaBuscaId: 0,
      carregandoMeta: false,
    }
  },

  computed: {
    // ── MINUTOS DISPONÍVEIS DO DIA (jornada) ──
    // Mantido apenas para projeções de capacidade máxima. Não é mais
    // usado em nenhum cálculo de eficiência.
    tempoDisponivelDia() {
      return this.obterMinutosTrabalhoDia(this.filtro?.data)
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

    funcionariosOrdenados() {
      return [...this.funcionariosDia]
        .sort((a, b) => this.calcularEficienciaOrdenacao(b) - this.calcularEficienciaOrdenacao(a))
        .map((f, i) => ({ ...f, _idx: i }))
    },

    funcionariosFiltrados() {
      const q = this.busca.trim().toLowerCase()
      if (!q) return this.funcionariosOrdenados
      return this.funcionariosOrdenados.filter(f =>
        (f.nome || '').toLowerCase().includes(q) ||
        (f.email || '').toLowerCase().includes(q)
      )
    },

    funcSelecionado() {
      return this.selecionado !== null ? this.funcionariosOrdenados[this.selecionado] : null
    },

    // Totais do dia do funcionário selecionado — auditoria completa:
    // tempo registrado, tempo ficha e tempo referência ACUMULADOS (todos
    // os lançamentos, qualquer OP/etapa), e as eficiências já calculadas
    // a partir desses totais (nunca média de percentuais de OP). É a
    // MESMA função usada para gerar o badge/ranking do funcionário —
    // então os números aqui nunca podem divergir do que aparece na lista.
    totaisFuncionarioSelecionado() {
      if (!this.funcSelecionado) return null
      return calcularTotaisFuncionarioDia(this.funcSelecionado, this.etapasPorId)
    },

    isFabrica() {
      return this.tipoProducao === 'fabrica'
    },

    // Só quem realmente produziu entra nas médias/totais do dia.
    funcionariosComProducao() {
      return this.funcionariosOrdenados.filter(f => this.temProducao(f))
    },

    // Resumo de eficiência geral da turma — FÓRMULA CORRETA:
    // Σ Tempo Produzido ÷ Σ Tempo Efetivo × 100
    // Tempo efetivo de cada funcionário contado APENAS UMA VEZ.
    resumoEficienciaGeral() {
      return calcularResumoEficienciaGeral(this.funcionariosDia, this.etapasPorId, this.filtro?.data)
    },

    // Eficiência exibida no cabeçalho — usa a nova fórmula correta
    // (produzido total ÷ efetivo total), NÃO média de eficiências.
    eficienciaMediaTurma() {
      return this.resumoEficienciaGeral.eficienciaFicha
    },
    eficienciaMediaTurmaReferencia() {
      return this.resumoEficienciaGeral.eficienciaReferencia
    },

    // Base bruta agrupada por OP (computed cacheado — reaproveitado pelos
    // computeds abaixo sem recalcular várias vezes). Agrupa TODAS as
    // produções com o mesmo id_da_op, de qualquer funcionário/etapa,
    // somando quantidade/tempo registrado/tempo ficha/tempo referência.
    gruposOpBrutos() {
      return agruparProducaoPorOp(this.funcionariosDia, this.etapasPorId).filter(g => g.producao > 0)
    },

    // Quantas etapas distintas (de quaisquer funcionários) contribuíram
    // para cada OP — apenas informativo para a tag "várias etapas".
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

    // Lista pronta para exibição no painel de detalhe por OP — já traz o
    // resumo consolidado (produção, tempo registrado, tempo ficha total,
    // tempo referência total e as duas eficiências) pronto para uso
    // aqui e em qualquer outra tela (ex.: Revisão Final).
    gruposProducaoPorOp() {
      return this.gruposOpBrutos
        .map(g => {
          const resumo = resumoConsolidadoOp(g)
          const opAtiva = this.opsAtivas.find(o => o.pecaId === g.opId)
          return {
            ...resumo,
            nome: this.nomeDaOp(g.opId),
            metaConfigurada: opAtiva?.metaDia ?? null,
            multiplasEtapas: (this.etapasDistintasPorOp.get(g.opId)?.size || 0) > 1,
          }
        })
        .sort((a, b) => b.producao - a.producao)
      
    },

    // Eficiência exibida no resumo consolidado das OPs — e agora também
    // no cabeçalho (ver eficienciaMediaTurma acima, que só repassa este
    // valor). É a média simples das eficiências de cada OP do dia
    // (cada eficiência de OP já é, por sua vez, uma razão entre tempos
    // somados daquela OP — nunca uma média dentro da própria OP).
    eficienciaMediaPonderadaOps() {
      return calcularEficienciaMediaPonderadaOps(this.gruposOpBrutos, false)
    },
    eficienciaMediaPonderadaOpsReferencia() {
      return calcularEficienciaMediaPonderadaOps(this.gruposOpBrutos, true)
    },

    temMultiplasOpsComProducao() {
      return this.gruposOpBrutos.length > 1
    },

    totalPecasGeral() {
      return this.funcionariosComProducao.reduce(
        (soma, f) => soma + this.calcularTotalFinalizadoFuncionario(f),
        0
      )
    },

    // Linhas detalhadas por (funcionário, OP) para a tela "Ver detalhes
    // por OP" — mostra exatamente como cada eficiência foi obtida:
    // quantidade produzida, tempo registrado, tempo ficha, tempo
    // referência e a fórmula (razão entre os tempos já somados).
    detalhePorFuncionarioEOp() {
      return detalharEficienciaPorFuncionarioEOp(this.funcionariosDia, this.etapasPorId, this.nomeDaOp)
        .sort((a, b) => a.opNome.localeCompare(b.opNome) || a.funcionario.localeCompare(b.funcionario))
    },
  },

  watch: {
    filtro: {
      deep: true,
      handler() {
        this.buscarMetaDia()
      },
    },
  },

  async mounted() {
    this.iniciarSocket()
    await this.aguardarConexaoSocket()
    await this.carregarPecas()
    await this.buscarMetaDia()

    // Reconexão sem depender só do evento 'online' do navegador —
    // mesma tática de segurança do Registro de Produção.
    this._intervaloRetentativa = setInterval(() => {
      if (socket.connected) this.buscarMetaDia()
    }, 30000)
  },

  beforeUnmount() {
    clearInterval(this._intervaloRetentativa)
    socket.off()
    socket.disconnect()
  },

  methods: {
    // ── MINUTOS DISPONÍVEIS DO DIA (jornada — só capacidade) ───────
    // 1) Se houver uma customização manual salva (fábrica quis
    //    sobrescrever o padrão), usa ela.
    // 2) Senão, delega para a função compartilhada — a MESMA usada em
    //    qualquer outro lugar do sistema que precise desse número —
    //    que calcula 540/480/0 conforme o dia da semana da data filtrada.
    // Este valor NÃO entra mais em nenhum cálculo de eficiência.
    obterMinutosTrabalhoDia(dataFiltro) {
      try {
        const salvo = localStorage.getItem(LOCAL_STORAGE_MINUTOS_KEY)
        if (salvo && !isNaN(Number(salvo))) {
          return Number(salvo)
        }
      } catch { /* ignora falha de storage */ }

      return minutosDisponiveisDia(dataFiltro)
    },

    // ── ORDENAÇÃO (modo escolhido pelo usuário) ───────────
    calcularEficienciaOrdenacao(func) {
      // Oficina só tem "Ficha" — ignora o modo se não for Fábrica.
      const modo = this.isFabrica ? this.modoOrdenacao : 'ficha'
      return calcularEficienciaFuncionarioPorModo(func, this.etapasPorId, modo)
    },

    definirModoOrdenacao(modo) {
      this.modoOrdenacao = modo
      try {
        localStorage.setItem('painel-modo-ordenacao', modo)
      } catch { /* ignora falha de storage */ }
    },

    carregarModoOrdenacao() {
      try {
        const salvo = localStorage.getItem('painel-modo-ordenacao')
        return salvo === 'referencia' ? 'referencia' : 'ficha'
      } catch {
        return 'ficha'
      }
    },

    // ── SOCKET ────────────────────────────────────────────
    iniciarSocket() {
      socket.off('connect')
      socket.off('disconnect')

      const cnpj = this.store.pegar_usuario?.cnpj
      if (cnpj) socket.off(`nova_atualizacao_${cnpj}`)

      socket.on('connect', () => {
        this.socketConectado = true
        // Se já havia conectado antes (ou seja, isso é uma reconexão),
        // busca de novo para não perder nada que aconteceu offline.
        if (this._jaConectouUmaVez) this.buscarMetaDia()
        this._jaConectouUmaVez = true
      })
      socket.on('disconnect', () => { this.socketConectado = false })

      if (cnpj) {
        socket.on(`nova_atualizacao_${cnpj}`, () => this.onAtualizacaoRemota())
      }

      if (!socket.connected) socket.connect()
      else this.socketConectado = true
    },

    // Debounce: várias atualizações próximas viram uma única busca.
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

    // ── PEÇAS / ETAPAS ────────────────────────────────────
    async carregarPecas() {
      try {
        const res = await api.get('/pecas', {
          headers: { Authorization: this.store.pegar_token },
        })
        this.pecas = res.data.peca.em_progresso || []

        // Monta o índice O(1) de etapas (mesma estrutura do Registro
        // de Produção) para resolver tempo padrão / tempo de referência
        // com a regra padronizada.
        this.etapasPorId = new Map()
        for (const peca of this.pecas) {
          for (const etapa of (peca.etapas || [])) {
            const idFuncao = etapa.id_da_funcao || etapa.etapa?.id_da_funcao
            if (!idFuncao) continue
            if (!this.etapasPorId.has(idFuncao)) this.etapasPorId.set(idFuncao, [])
            this.etapasPorId.get(idFuncao).push(etapa)
          }
        }
      } catch (err) {
        console.error(err)
      }
    },

    nomeDaOp(pecaId) {
      // Fonte oficial: meta.pecas (id_da_op + peca.descricao), já
      // carregada em opsAtivas. Mantido fallback para this.pecas apenas
      // por compatibilidade, caso a OP não esteja em opsAtivas.
      const opAtiva = this.opsAtivas.find(o => o.pecaId === pecaId)
      if (opAtiva?.descricao) return String(opAtiva.descricao)

      const peca = this.pecas.find(p => p.id_da_op === pecaId)
      return String(
        peca?.descricao ||
        peca?.descricaoPeca ||
        pecaId
      );
    },

    // ── BUSCAR META (via Socket.IO, com ack) ──────────────
    async buscarMetaDia() {
      await this.aguardarConexaoSocket()

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
        console.log('buscar-meta-dia', response)
        if (buscaId !== this.ultimaBuscaId) return
        this.carregandoMeta = false
        this.loading = false
        if (!response?.sucesso) return

        const meta = response.metaDia
        if (!meta) {
          this.opsAtivas = []
          this.funcionariosDia = []
          this.dataCarregada = dataDaRequisicao
          return
        }

        const usuario = this.store.pegar_usuario
        this.tipoProducao =
          usuario.tipo_de_producao ||
          meta.Estabelecimento?.tipo_de_producao ||
          meta.tipo_de_producao ||
          null

        this.opsAtivas = (meta.pecas || []).map(p => ({
          pecaId: p.id_da_op,
          metaDia: p.meta || 0,
          tempoPadrao: p.peca?.tempo_padrao || 0,
          status: p.peca?.status,
          descricao: p.peca?.descricao,
        }))

        // Índice O(1) da PEÇA/OP por id_da_op. Usado apenas para
        // indicadores relacionados à PEÇA COMPLETA (capacidade,
        // planejamento, conclusão da OP) — NUNCA para calcular a
        // eficiência operacional de uma etapa/funcionário/equipe, que
        // deve usar o tempo padrão da ETAPA (producao_etapa.tempo_padrao).
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

            // Vínculo produção → peça/OP: produção.id_da_op === meta.pecas[i].id_da_op.
            // ATENÇÃO: peca.tempo_padrao é o tempo da PEÇA COMPLETA (todas
            // as etapas somadas) — serve apenas para indicadores de
            // capacidade/planejamento/conclusão da OP como um todo.
            // NÃO deve ser usado para calcular a eficiência de uma equipe
            // que trabalhou em apenas UMA etapa (ex.: revisão, unir gola).
            // Por isso fica guardado à parte, em tempoPadraoPeca, e nunca
            // é atribuído a `linha.tempoPadrao`.
            const pecaDaOp = opId != null ? pecasPorOpId.get(opId) : null
            const tempoPadraoPeca = Number(pecaDaOp?.peca?.tempo_padrao || 0)

            let linha = linhas.find(l => l.etapaId === etapaId && l.opId === opId)
            if (!linha) {
              linha = {
                id: `${metaFunc.funcionarioId}-${etapaId}-${opId || 'sem-op'}`,
                tipo: linhas.length === 0 ? 'principal' : 'extra',
                etapaId,
                // `descricao` é a informação da OPERAÇÃO (etapa/função).
                descricao: producao.producao_etapa?.descricao || '',
                // Tempo padrão da ETAPA — usado no cálculo de eficiência
                // operacional (por funcionário, equipe ou etapa).
                tempoPadrao: producao.producao_etapa?.tempo_padrao || 0,
                opId,
                opDescricao: pecaDaOp?.peca?.descricao || '',
                // Tempo padrão da PEÇA COMPLETA — apenas informativo, para
                // indicadores de capacidade/planejamento/conclusão da OP.
                // Nunca usado em resolverTempoPadrao / cálculo de eficiência.
                tempoPadraoPeca,
                // Modo de tempo: 'padrao' (ficha) ou 'referencia'.
                // Restaurado do Registro de Produção via localStorage para
                // que a eficiência use o valor que o usuário escolheu.
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
            linhas: linhas.length ? linhas : [],
          })
        }

        this.funcionariosDia = novosFuncionarios
        this.dataCarregada = dataDaRequisicao

        // Restaura as escolhas de tempo de referência que o usuário
        // fez no Registro de Produção (salvas no localStorage).
        this.restaurarModoTempoReferencia()
      } catch (err) {
        console.error(err)
        this.carregandoMeta = false
        this.loading = false
      }
    },

    // ── RESTAURAÇÃO DE MODO TEMPO ─────────────────────────
    restaurarModoTempoReferencia() {
      const estabelecimento = this.store.pegar_usuario?.cnpj || ''
      if (!estabelecimento || !this.filtro?.data) return

      for (const func of this.funcionariosDia) {
        for (const linha of func.linhas || []) {
          if (!linha.etapaId) continue
          const chaveLS = chaveLocalStorageTempoRef(
            estabelecimento, this.filtro.data,
            func.email, linha.opId, linha.etapaId
          )
          const escolha = lerTempoRefLocalStorage(chaveLS)
          if (escolha && (escolha.modoTempo === 'padrao' || escolha.referenciaSelecionadaId)) {
            linha.modoTempo = escolha.modoTempo
            linha.referenciaSelecionadaId = escolha.referenciaSelecionadaId || null
          }
        }
      }
    },

    // ── ETAPA FINAL ───────────────────────────────────────
    isEtapaFinal(linha) {
      return isEtapaFinal(linha)
    },

    // ── TOTAIS ────────────────────────────────────────────
    calcularTotalLinha(linha) {
      return calcularTotalLinha(linha, this.funcSelecionado)
    },

    calcularTotalFuncionario(func) {
      // "Peças" na lista = produção total, qualquer etapa (mantém o
      // comportamento visual original do Painel).
      if (!Array.isArray(func?.linhas)) return 0
      return func.linhas.reduce((soma, linha) => soma + calcularTotalLinha(linha, func), 0)
    },

    calcularTotalFinalizadoFuncionario(func) {
      // "Peças (final)" no painel de detalhe — mesma regra do Registro
      // de Produção (soma só etapas finais, respeitando ausências).
      return calcularPecasFinalizadasFuncionario(func)
    },

    temProducao(func) {
      return this.calcularTotalFuncionario(func) > 0
    },

    // ── EFICIÊNCIA (delega 100% para o módulo compartilhado) ──────
    // Eficiência geral do funcionário = média simples das eficiências
    // de cada OP produzida, cada uma calculada só com o tempo
    // efetivamente produzido daquela OP.
    calcularEficienciaFuncionario(func) {
      return calcularEficienciaFuncionarioPadrao(func, this.etapasPorId)
    },

    calcularEficienciaReferenciaFuncionario(func) {
      return calcularEficienciaFuncionarioReferencia(func, this.etapasPorId)
    },

    calcularEficienciaLinha(linha) {
      return calcularEficienciaLinhaPadrao(linha, this.funcSelecionado, this.etapasPorId)
    },

    calcularEficienciaReferenciaLinha(linha) {
      return calcularEficienciaLinhaReferencia(this.funcSelecionado, linha, this.etapasPorId)
    },

    tempoEfetivoLinha(linha) {
      return resolverTempoEfetivoReferencia(this.funcSelecionado, linha, this.etapasPorId)
    },

    // ── POR HORA ──────────────────────────────────────────
    // Continua registrando/somando a produção por hora normalmente —
    // isso não depende do tempo disponível do dia, só dos registros.
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

          const tempoEfetivo = resolverTempoEfetivoReferencia(func, linha, this.etapasPorId)
          const eficiencia = calcularEficienciaRegistroPadrao(reg.quantidade, reg.tempoProduzido, linha, this.etapasPorId)
          const eficienciaReferencia = calcularEficienciaRegistroReferencia(reg.quantidade, reg.tempoProduzido, linha, func, this.etapasPorId)

          etapas.push({
            descricao: linha.descricao || linha.etapaId || '—',
            isFinal: isEtapaFinal(linha),
            quantidade: reg.quantidade,
            tempoProduzido: reg.tempoProduzido,
            eficiencia,
            eficienciaReferencia,
          })

          totalPecas += reg.quantidade
          somaProduzida += reg.quantidade * resolverTempoPadrao(linha, this.etapasPorId)
          somaProduzidaReferencia += reg.quantidade * tempoEfetivo
          somaTempoProduzido += reg.tempoProduzido
        }

        if (!etapas.length) continue

        resultado.push({
          hora,
          etapas,
          totalPecas,
          eficiencia: somaTempoProduzido ? Math.round((somaProduzida / somaTempoProduzido) * 100) : 0,
          eficienciaReferencia: somaTempoProduzido ? Math.round((somaProduzidaReferencia / somaTempoProduzido) * 100) : 0,
        })
      }

      return resultado
    },

    // ── HELPERS DE UI (thresholds visuais próprios do Painel) ─────
    clsEfic(pct) {
      const n = parseFloat(pct)
      if (n >= 90) return 'verde'
      if (n >= 60) return 'amarelo'
      return 'vermelho'
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

    rankIcon(i) {
      return ['🥇', '🥈', '🥉'][i] ?? i + 1
    },
  },
}
</script>
<style scoped>
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

.sort-toggle-btn.active {
  background: var(--g800);
  color: #fff;
}

/* TOP BAR */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--line);
  background: var(--bg);
  flex-wrap: wrap;
}

.metrics-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}

.metric-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--surf);
  border: 1px solid var(--line);
  border-radius: var(--rc);
  padding: 10px 18px;
}

.metric-chip.accent {
  background: var(--g800);
  border-color: transparent;
}

.mc-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .09em;
  color: var(--ink3);
}

.metric-chip.accent .mc-label { color: var(--g200); }

.mc-val {
  font-size: 20px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: -.02em;
}

.metric-chip.accent .mc-val { color: #fff; }

.peca-chip {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.socket-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--r600);
  flex-shrink: 0;
  transition: background .3s;
}

.socket-dot.conectado { background: var(--g600); }

/* LAYOUT */
.main-layout {
  display: grid;
  grid-template-columns: 1fr;
  min-height: 0;
}

.main-layout.panel-open {
  grid-template-columns: 1fr 440px;
}

/* LISTA */
.grid-area {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px 10px;
  gap: 12px;
}

.list-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.list-toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input {
  font-size: 13px;
  padding: 5px 12px;
  border: 1px solid var(--line);
  border-radius: var(--rp);
  background: var(--surf);
  color: var(--ink);
  width: 180px;
  transition: border-color .15s;
}

.search-input:focus {
  outline: none;
  border-color: var(--g600);
}

.list-count {
  font-size: 12.5px;
  color: var(--ink3);
  white-space: nowrap;
}

.list-header {
  display: grid;
  grid-template-columns: 1fr 72px 110px;
  align-items: center;
  padding: 6px 24px;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  background: var(--surf);
  position: sticky;
  top: 0;
  z-index: 1;
}

.list-header.fabrica {
  grid-template-columns: 1fr 64px 92px 92px;
}

.lh-name {
  font-size: 11px;
  font-weight: 600;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--ink3);
}

.lh-col {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--ink3);
  text-align: right;
}

.list-body {
  overflow-y: auto;
  max-height: calc(100vh - 210px);
}

.list-row {
  display: grid;
  grid-template-columns: 1fr 72px 110px;
  align-items: center;
  padding: 9px 24px;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  transition: background .1s;
}

.list-row.fabrica {
  grid-template-columns: 1fr 64px 92px 92px;
}

.list-row:hover { background: var(--surf); }

.list-row.selected {
  background: var(--g50);
  border-right: 2px solid var(--g600);
}

.list-row.sem-producao {
  opacity: .6;
}

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
}

.lr-sub {
  font-size: 11.5px;
  color: var(--ink3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lr-col {
  text-align: -webkit-center;
  font-size: 14px;
  color: var(--ink2);
}

.mono { font-variant-numeric: tabular-nums; }

.list-empty {
  padding: 36px 24px;
  text-align: center;
  color: var(--ink3);
  font-size: 14px;
}

/* BADGES */
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

.dp-badges-duplas {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: flex-end;
  flex-shrink: 0;
}

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

/* PAINEL LATERAL */
.detail-panel {
  border-left: 1px solid var(--line);
  background: var(--bg);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 210px);
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

.dp-stats {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
}

.dp-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  text-align: center;
}

.dp-stat-div { width: 1px; height: 36px; background: var(--line); }

.dp-stat-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--ink3);
}

.dp-stat-val {
  font-size: 20px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: -.02em;
}

.dp-stat-val.verde    { color: var(--g700); }
.dp-stat-val.amarelo  { color: var(--a600); }
.dp-stat-val.vermelho { color: var(--r600); }

.dp-auditoria {
  margin: 0 18px 14px;
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
  margin-bottom: 10px;
}
.dp-auditoria-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.dp-auditoria-label {
  font-size: 10.5px;
  color: var(--ink3);
  font-weight: 600;
}
.dp-auditoria-val {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.dp-auditoria-formula {
  font-size: 12.5px;
  color: var(--ink2);
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
}
.dp-auditoria-formula strong { color: var(--ink); }

.dp-eff-bar-wrap {
  padding: 12px 18px 14px;
  border-bottom: 1px solid var(--line);
}

.dp-eff-bar-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--ink3);
  margin-bottom: 6px;
  font-weight: 500;
}

.dp-eff-bar-labels span:last-child { font-weight: 700; }
.dp-eff-bar-labels .verde    { color: var(--g700); }
.dp-eff-bar-labels .amarelo  { color: var(--a600); }
.dp-eff-bar-labels .vermelho { color: var(--r600); }

.dp-eff-bar-track {
  height: 7px;
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
}

.dp-tab:hover { color: var(--ink); }

.dp-tab.active {
  color: var(--g700);
  border-bottom-color: var(--g600);
  font-weight: 600;
}

.dp-content { padding: 16px 18px; flex: 1; }

.dp-etapa {
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}

.dp-etapa:last-child { border-bottom: none; }

.dp-etapa-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 7px;
  gap: 8px;
}

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

.dp-etapa-bar-track {
  height: 5px;
  background: var(--line);
  border-radius: var(--rp);
  overflow: hidden;
  margin-bottom: 6px;
}

.dp-etapa-bar-fill {
  height: 100%;
  border-radius: var(--rp);
  transition: width .4s ease;
}

.dp-etapa-bar-fill.verde    { background: var(--g600); }
.dp-etapa-bar-fill.amarelo  { background: var(--a600); }
.dp-etapa-bar-fill.vermelho { background: var(--r600); }

.dp-etapa-bottom { display: flex; justify-content: space-between; }

.small { font-size: 12px; color: var(--ink3); }

/* POR HORA */
.dp-hora-bloco {
  border: 1px solid var(--line);
  border-radius: var(--rs);
  overflow: hidden;
  margin-bottom: 10px;
}

.dp-hora-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  background: var(--surf);
  border-bottom: 1px solid var(--line);
}

.dp-hora-head-left {
  display: flex;
  align-items: center;
  gap: 7px;
}

.dp-hora-clock { font-size: 14px; line-height: 1; }
.dp-hora-label { font-size: 14px; font-weight: 600; color: var(--ink); }
.dp-hora-total { font-size: 12.5px; color: var(--ink3); }

.dp-hora-eff-row {
  padding: 7px 14px 0;
  background: var(--surf);
  border-bottom: 1px solid var(--line);
}

.dp-hora-eff-bar-track {
  height: 4px;
  background: var(--line);
  border-radius: var(--rp);
  overflow: hidden;
  margin-bottom: 7px;
}

.dp-hora-eff-bar-track + .dp-hora-eff-bar-track {
  margin-top: -3px;
}

.dp-hora-eff-bar-fill {
  height: 100%;
  border-radius: var(--rp);
  transition: width .4s ease;
}

.dp-hora-eff-bar-fill.verde    { background: var(--g600); }
.dp-hora-eff-bar-fill.amarelo  { background: var(--a600); }
.dp-hora-eff-bar-fill.vermelho { background: var(--r600); }

.dp-hora-tbl { width: 100%; border-collapse: collapse; }

.dp-hora-tbl th {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .07em;
  color: var(--ink3);
  padding: 6px 14px;
  text-align: left;
  border-bottom: 1px solid var(--line);
  background: var(--bg);
}

.dp-hora-tbl td {
  padding: 8px 14px;
  text-align: left;
  font-size: 13.5px;
  color: var(--ink);
  border-bottom: 1px solid var(--line);
}

.dp-hora-tbl tr:last-child td { border-bottom: none; }
.dp-hora-etapa-nome { font-weight: 500; color: var(--ink2); }
.ta-r { text-align: right; }

.dp-empty {
  text-align: center;
  color: var(--ink3);
  font-size: 14px;
  padding: 28px 0;
}

/* TRANSIÇÃO */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: opacity .18s ease, transform .2s ease;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
.btn-detalhe-ops {
  height: 30px;
  padding: 0 12px;
  border-radius: var(--rp);
  border: 1px solid var(--line);
  background: var(--surf);
  color: var(--ink2);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background .1s;
  font-family: inherit;
}
.btn-detalhe-ops:hover { background: var(--line); }
.btn-detalhe-ops--secundario { margin-top: 4px; }

.ops-detalhe {
  padding: 16px 24px;
  border-bottom: 1px solid var(--line);
  background: var(--surf);
}

.ops-detalhe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.op-detalhe-card {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--rc);
  padding: 12px 14px;
}

.op-detalhe-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.op-detalhe-nome {
  font-size: 13.5px;
  font-weight: 600;
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

.op-detalhe-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.op-detalhe-stat { display: flex; flex-direction: column; gap: 2px; }

.op-detalhe-stat-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--ink3);
}

.op-detalhe-stat-val { font-size: 15px; font-weight: 600; color: var(--ink); }
.op-detalhe-stat-val.verde    { color: var(--g700); }
.op-detalhe-stat-val.amarelo  { color: var(--a600); }
.op-detalhe-stat-val.vermelho { color: var(--r600); }

.op-detalhe-formula {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--line, #e5e5e5);
  font-family: monospace;
  font-size: 11px;
  color: var(--ink3);
}

.ops-detalhe-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
  font-size: 13px;
  color: var(--ink2);
}

.ops-detalhe-footer strong { font-size: 14px; }
.ops-detalhe-footer strong.verde    { color: var(--g700); }
.ops-detalhe-footer strong.amarelo  { color: var(--a600); }
.ops-detalhe-footer strong.vermelho { color: var(--r600); }
.ops-detalhe-footer-sep { color: var(--ink3); }

/* DETALHE POR FUNCIONÁRIO × OP */
.detalhe-func-op {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.detalhe-func-op-tbl-wrap {
  margin-top: 10px;
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: var(--rc);
  background: var(--bg);
}

.detalhe-func-op-tbl {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
}

.detalhe-func-op-tbl th {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--ink3);
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid var(--line);
  background: var(--surf);
  position: sticky;
  top: 0;
}

.detalhe-func-op-tbl td {
  padding: 8px 12px;
  font-size: 13px;
  color: var(--ink);
  border-bottom: 1px solid var(--line);
}

.detalhe-func-op-tbl tr:last-child td { border-bottom: none; }

.detalhe-func-op-tag {
  display: inline-block;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--ink3);
  margin-left: 4px;
}

/* RESPONSIVO */
@media (max-width: 900px) {
  .main-layout.panel-open { grid-template-columns: 1fr; }
  .detail-panel { border-left: none; border-top: 1px solid var(--line); max-height: 55vh; }
}

@media (max-width: 560px) {
  .top-bar { padding: 12px 16px; }
  .list-header, .list-row { padding: 8px 16px; }
  .list-title { display: none; }
  .search-input { width: 130px; }
}
</style>