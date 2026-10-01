<template>
  <div>
    <SidebarNav />
    <carregandoTela v-if="loading" />

    <main v-else class="content-wrapper">
      <div class="page-section">

        <div class="header">
          <div class="header-actions">
            <div class="socket-status" :class="{ online: socketConectado }">
              <span class="status-dot"></span>
              {{ socketConectado ? 'Online' : 'Offline' }}
            </div>
            <!-- Contador global de células ainda não confirmadas pelo servidor -->
            <div v-if="totalCelulasPendentes > 0" class="fila-pendentes-badge"
              :title="`${totalCelulasPendentes} campo(s) aguardando salvamento`">
              ● {{ totalCelulasPendentes }} pendente(s)
            </div>
            <input v-model="dataSelecionada" type="date" class="date-input" />
            <span v-if="carregandoMeta" class="data-loading">Atualizando…</span>
            <button class="btn-gerar-pdf" :disabled="gerandoPdf" @click="onClicarGerarPdf">
              📄 {{ gerandoPdf ? 'Gerando PDF…' : 'Gerar PDF' }}
            </button>
            <button class="btn-gerar-excel" :disabled="gerandoExcel" @click="onClicarGerarExcel">
              📊 {{ gerandoExcel ? 'Gerando Excel…' : 'Gerar Excel' }}
            </button>
          </div>
        </div>

        <!-- SETUP CARD -->
        <div class="setup-card">

          <div class="setup-topbar">
            <div class="setup-title">
              <div class="setup-icon">⚙️</div>
              <div>
                <h3>Configuração do Dia</h3>
                <span>{{ funcionariosDia.length }} funcionários ativos</span>
              </div>
            </div>
          </div>

          <!-- OPs ATIVAS -->
          <div class="ops-section">
            <div class="ops-list">
              <div v-for="(op, idx) in opsAtivas" :key="op._uid" class="op-card">
                <div class="op-card-header">
                  <span class="op-badge">OP {{ idx + 1 }}</span>
                  <button v-if="opsAtivas.length > 1" class="btn-remove-op" @click="removerOp(idx)">×</button>
                </div>

                <div class="op-fields">
                  <div class="field field-op">
                    <label>Ordem de Produção</label>
                    <select v-model="op.pecaId" @change="salvarMetaDia">
                      <option value="">Selecione uma OP</option>
                      <option v-for="peca in pecasDisponiveis(op.pecaId)" :key="peca.id_da_op" :value="peca.id_da_op">
                        {{ peca.descricao }}
                      </option>
                    </select>
                  </div>

                  <div class="field field-meta">
                    <label>Meta do Dia</label>
                    <div class="meta-input-wrap">
                      <input v-model.number="op.metaDia" type="number" min="0" placeholder="0" class="meta-input"
                        @input="salvarMetaDia" />
                      <span class="meta-suffix">peças</span>
                    </div>
                  </div>

                  <div class="field field-total">
                    <label>Produção Atual</label>
                    <div class="total-box">{{ calcularTotalOp(op.pecaId) }}</div>
                  </div>
                </div>

                <!-- BARRA DE PROGRESSO -->
                <div v-if="op.metaDia > 0 && op.pecaId" class="meta-progress">
                  <div class="meta-progress-top">
                    <span>Progresso</span>
                    <strong>{{ calcularTotalOp(op.pecaId) }} / {{ op.metaDia }}</strong>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill"
                      :style="{ width: Math.min((calcularTotalOp(op.pecaId) / op.metaDia) * 100, 100) + '%' }"></div>
                  </div>
                  <div class="progress-footer">
                    <span>{{ Math.round((calcularTotalOp(op.pecaId) / op.metaDia) * 100) || 0 }}% concluído</span>
                    <span>Faltam {{ Math.max(op.metaDia - calcularTotalOp(op.pecaId), 0) }} peças</span>
                  </div>
                </div>
              </div>

              <!--
                OPs descobertas a partir dos REGISTROS DE PRODUÇÃO (mesma
                lista consolidada usada para montar a tabela inferior),
                que não estão mais entre as OPs configuradas no topo —
                finalizada, em coleta, ou removida do setup depois de já
                ter produção lançada. A identificação/dedup é sempre pelo
                pecaId (ver sincronizarOpsExtras): se a OP já aparece
                entre as ativas, ela NUNCA entra aqui de novo.
              -->
              <div v-for="op in opsExtras" :key="op._uid" class="op-card op-card--historico">
                <div class="op-card-header">
                  <span class="op-badge op-badge--historico">🗄️ Fora da lista ativa</span>
                </div>

                <div class="op-fields">
                  <div class="field field-op">
                    <label>Ordem de Produção</label>
                    <div class="op-fixa" :title="op.pecaId">{{ nomeDaOp(op.pecaId) }}</div>
                  </div>

                  <div class="field field-meta">
                    <label>Meta do Dia</label>
                    <div class="meta-input-wrap">
                      <input v-model.number="op.metaDia" type="number" min="0" placeholder="0" class="meta-input"
                        @input="salvarMetaDia" />
                      <span class="meta-suffix">peças</span>
                    </div>
                  </div>

                  <div class="field field-total">
                    <label>Produção Atual</label>
                    <div class="total-box">{{ calcularTotalOp(op.pecaId) }}</div>
                  </div>
                </div>

                <div v-if="op.metaDia > 0" class="meta-progress">
                  <div class="meta-progress-top">
                    <span>Progresso</span>
                    <strong>{{ calcularTotalOp(op.pecaId) }} / {{ op.metaDia }}</strong>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill"
                      :style="{ width: Math.min((calcularTotalOp(op.pecaId) / op.metaDia) * 100, 100) + '%' }"></div>
                  </div>
                  <div class="progress-footer">
                    <span>{{ Math.round((calcularTotalOp(op.pecaId) / op.metaDia) * 100) || 0 }}% concluído</span>
                    <span>Faltam {{ Math.max(op.metaDia - calcularTotalOp(op.pecaId), 0) }} peças</span>
                  </div>
                </div>
              </div>
            </div>

            <button class="btn-add-op" @click="adicionarOp">
              <span>+</span> Nova OP
            </button>
          </div>

          <div v-if="(opsAtivas.length + opsExtras.length) > 1" class="total-geral-row">
            <span>Total geral de todas as OPs:</span>
            <div class="total-box-sm">{{ calcularTotalGeral() }}</div>
          </div>

        </div>

        <!-- BARRA DE SELEÇÃO DE HORAS -->
        <div v-if="temConteudoParaTabela" class="horas-toolbar">
          <div class="horas-toolbar-row">
            <div class="seg" role="group" aria-label="Atalhos de período">
              <button type="button" class="seg-btn" @click="aplicarAtalhoTurno('dia')">Dia todo</button>
              <button type="button" class="seg-btn" @click="aplicarAtalhoTurno('manha')">Manhã</button>
              <button type="button" class="seg-btn" @click="aplicarAtalhoTurno('tarde')">Tarde</button>
            </div>

            <div class="seg" role="group" aria-label="Filtro por preenchimento">
              <button type="button" :class="['seg-btn', filtroHoras === 'todas' ? 'active' : '']"
                @click="definirFiltroHoras('todas')">Todas as horas</button>
              <button type="button" :class="['seg-btn', filtroHoras === 'preenchidas' ? 'active' : '']"
                @click="definirFiltroHoras('preenchidas')">Apenas preenchidas</button>
              <button type="button" :class="['seg-btn', filtroHoras === 'pendentes' ? 'active' : '']"
                @click="definirFiltroHoras('pendentes')">Apenas pendentes</button>
            </div>

            <details class="janelas">
              <summary>Janelas de horário</summary>
              <div class="janelas-body">
                <div v-for="t in ['manha', 'tarde']" :key="t" class="janela-row">
                  <strong>{{ t === 'manha' ? 'Manhã' : 'Tarde' }}</strong>
                  <select v-model="configHorarios[t].inicio" class="horario-select-sm"
                    @change="onAlterarConfigHorario(t)">
                    <option v-for="h in opcoesHoraInicio" :key="h" :value="h">{{ h }}</option>
                  </select>
                  <span class="horario-ate">até</span>
                  <select v-model="configHorarios[t].fim" class="horario-select-sm"
                    @change="onAlterarConfigHorario(t)">
                    <option v-for="h in opcoesHoraFimDe(t)" :key="h" :value="h">{{ h }}</option>
                  </select>
                </div>
              </div>
            </details>
          </div>

          <div class="horas-chips">
            <button v-for="h in todasHorasDia" :key="h" type="button"
              :class="['hora-chip', !horasOcultas.includes(h) ? 'is-on' : '', horasPreenchidas.has(h) ? 'is-filled' : '']"
              :aria-pressed="!horasOcultas.includes(h)"
              :title="horasOcultas.includes(h) ? 'Mostrar coluna' : 'Ocultar coluna'" @click="alternarHora(h)">
              <span class="hora-chip-mark">{{ horasPreenchidas.has(h) ? '✓' : '○' }}</span>{{ h }}
            </button>
          </div>

          <!-- RESUMO DO PERÍODO SELECIONADO (horas visíveis) -->
          <div v-if="horasVisiveis.length && resumoPeriodoGeral.total > 0" class="periodo-resumo">
            <span class="periodo-resumo-label">
              Período {{ horasVisiveis[0] }} → {{ horasVisiveis[horasVisiveis.length - 1] }}
            </span>
            <span :class="['periodo-chip', getEficClass(resumoPeriodoGeral.efFicha)]"
              title="Eficiência da FICHA no período: Σ (peças × TR da etapa) ÷ Σ tempo, acumulado nas horas visíveis">
              Ficha {{ resumoPeriodoGeral.efFicha }}%
            </span>
            <span :class="['periodo-chip', getEficClass(resumoPeriodoGeral.efRef)]"
              title="Eficiência Tempo Fábrica no período: Σ (peças × referência individual do profissional) ÷ Σ tempo, acumulado nas horas visíveis">
              Tempo Fábrica {{ resumoPeriodoGeral.efRef }}%
            </span>
          </div>

          <p v-if="!horasVisiveis.length" class="horas-vazio">
            Nenhuma hora visível. Marque ao menos um horário acima ou escolha “Todas as horas”.
          </p>
        </div>

        <!-- TABELA AGRUPADA POR OP (MÓDULOS) -->
        <div v-if="temConteudoParaTabela" class="ops-modulos-wrapper">
          <template v-for="grupo in funcionariosAgrupadosPorOp" :key="grupo.opId || 'sem-op'">

            <!-- HEADER DO MÓDULO -->
            <div :class="[
              'op-module-header',
              !grupo.opId ? 'op-module-header--empty' : '',
              opsAtivasComPeca.length === 1 && grupo.ativa ? 'op-module-header--single' : '',
              !grupo.ativa ? 'op-module-header--historico' : ''
            ]">

              <span class="op-module-badge">
                <span v-if="!grupo.opId">⚠ {{ grupo.label }}</span>
                <span v-else-if="!grupo.ativa">🗄️ {{ grupo.label }}
                  <small class="op-module-badge-tag">fora da lista de OPs ativas</small>
                </span>
                <span v-else>📦 {{ grupo.label }}</span>
              </span>

            </div>

            <!-- TABELA DO MÓDULO -->
            <div class="table-wrapper">
              <div class="table-scroll">
                <table class="apontamento-table" :style="{ '--n-horas': horasVisiveis.length }">
                  <colgroup>
                    <col class="col-func" />
                    <col class="col-etapa" />
                    <col v-for="hora in horasVisiveis" :key="'col-' + hora" class="col-hora" />
                    <col class="col-total" />
                    <col class="col-efic-dia" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th class="sticky-l sticky-l-1">Funcionário</th>
                      <th class="sticky-l sticky-l-2 sticky-edge-l">Etapa</th>
                      <th v-for="hora in horasVisiveis" :key="hora" class="hora-th">
                        {{ hora }}
                        <span class="th-dot" :class="{ 'th-dot--ok': horasPreenchidas.has(hora) }"
                          :title="horasPreenchidas.has(hora) ? 'Há lançamentos nesta hora' : 'Nenhum lançamento nesta hora'"></span>
                      </th>
                      <th class="sticky-r sticky-r-2 sticky-edge-r">Total</th>
                      <th class="sticky-r sticky-r-1">Eficiência do dia</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="funcionario in grupo.funcionarios"
                      :key="funcionario.email + '_' + (grupo.opId || 'sem')">
                      <tr v-for="(linha, idxLinha) in funcionario.linhas" :key="linha.id"
                        :class="{ 'linha-extra': linha.tipo === 'extra', 'linha-ausente': funcionarioAusenteDiaInteiro(funcionario), 'primeira-linha': idxLinha === 0 }">

                        <!-- FUNCIONÁRIO (fixo à esquerda; ocupa todas as linhas dele) -->
                        <td v-if="idxLinha === 0" class="sticky-l sticky-l-1 func-col"
                          :rowspan="funcionario.linhas.length">
                          <div class="func-info">
                            <img :src="funcionario.foto || '/default-avatar.png'" alt="" />
                            <div class="func-info-text">
                              <span class="func-nome">{{ funcionario.nome }}</span>
                              <span class="func-resumo">
                                <span>{{ resumoFunc(funcionario, grupo).total }} pç</span>
                                <span>{{ fmtHorasRegistradas(resumoFunc(funcionario, grupo).minutos) }}</span>
                                <span>{{ resumoFunc(funcionario, grupo).etapas }} etapa{{
                                  resumoFunc(funcionario, grupo).etapas === 1 ? '' : 's' }}</span>
                                <span v-if="tempoReferenciaUnico(funcionario, grupo) !== null" class="func-resumo-tr"
                                  title="Tempo Fábrica: referência individual deste profissional nesta OP/etapa">
                                  TR Fábrica {{ fmtNum(tempoReferenciaUnico(funcionario, grupo)) }} min
                                </span>
                              </span>
                              <button class="btn-ausencia-toggle" @click="abrirModalAusencia(funcionario)">
                                {{ funcionario.ausencia ? '✏️ Ausência' : '🚫 Ausência' }}
                              </button>
                              <span v-if="funcionario.ausencia" class="ausencia-tag"
                                :class="'ausencia-tag--' + funcionario.ausencia.tipo"
                                :title="funcionario.ausencia.observacao || ''">
                                <template v-if="funcionario.ausencia.tipo === 'dia_inteiro'">🌑 Ausente (dia
                                  inteiro)</template>
                                <template v-else>
                                  🕒 <strong>{{ formatarPeriodosAusencia(funcionario.ausencia.periodos) }}</strong>
                                  <span class="ausencia-tag-minutos">({{
                                    calcularMinutosAusenciaFuncionario(funcionario) }}min)</span>
                                </template>
                              </span>
                            </div>
                          </div>
                        </td>

                        <!-- ETAPA (fixa à esquerda, logo após o funcionário) -->
                        <td class="sticky-l sticky-l-2 sticky-edge-l etapa-col">
                          <div class="etapa-wrap">
                            <span v-if="linha.tipo === 'extra'" class="extra-tag" title="Etapa extra deste funcionário">↳</span>
                            <template v-if="grupo.ativa">
                              <select :value="indiceOpcaoEtapa(linha)" class="etapa-select"
                                :disabled="funcionarioAusenteDiaInteiro(funcionario)"
                                @change="onAlterarEtapaPorIndice(funcionario, linha, $event.target.value)">
                                <option value="">Etapa</option>
                                <optgroup v-for="op in opsAtivasComPeca" :key="op.pecaId" :label="nomeDaOp(op.pecaId)">
                                  <option v-for="opcao in opcoesParaOp(op.pecaId)" :key="opcao.idx" :value="opcao.idx">
                                    {{ opcao.label }}
                                  </option>
                                </optgroup>
                              </select>
                              <button v-if="linha.tipo === 'extra' && !funcionarioAusenteDiaInteiro(funcionario)"
                                class="btn-remove-linha" @click="removerLinhaExtra(funcionario, idxLinha)"
                                title="Remover esta etapa">×</button>
                              <button
                                v-if="idxLinha === funcionario.linhas.length - 1 && !funcionarioAusenteDiaInteiro(funcionario)"
                                class="btn-add-linha" @click="adicionarLinhaExtra(funcionario, true)"
                                title="Adicionar etapa">+</button>
                            </template>
                            <template v-else>
                              <div class="etapa-fixa">
                                <span class="etapa-fixa-label">{{ linha.descricao || 'Etapa' }}</span>
                                <span class="etapa-fixa-tag" title="OP fora da lista de OPs ativas">🔒 somente
                                  consulta</span>
                              </div>
                              <button
                                v-if="idxLinha === funcionario.linhas.length - 1 && !funcionarioAusenteDiaInteiro(funcionario)"
                                class="btn-add-linha" @click="adicionarLinhaExtra(funcionario, false)"
                                title="Adicionar etapa de uma OP ativa">+</button>
                              <button v-if="linha.tipo === 'extra' && !funcionarioAusenteDiaInteiro(funcionario)"
                                class="btn-remove-linha" @click="removerLinhaExtra(funcionario, idxLinha)"
                                title="Remover esta linha">×</button>
                            </template>
                          </div>

                          <!-- SELETOR DE TEMPO: padrão ou uma das referências da etapa -->
                          <div v-if="linha.etapaId && grupo.ativa" class="tempo-toggle-wrap">
                            <select class="tempo-select"
                              :value="linha.modoTempo === 'referencia' ? linha.referenciaSelecionadaId : '__padrao__'"
                              :disabled="funcionarioAusenteDiaInteiro(funcionario)"
                              @change="onSelecionarTempo(funcionario, linha, $event.target.value)">
                              <option value="__padrao__">⏱ Ficha: {{ linha.tempoPadrao }}min</option>
                              <option v-for="ref in listarRefsDaEtapa(buscarEtapa(linha.etapaId, linha.opId))"
                                :key="ref.id" :value="ref.id">
                                👤 {{ ref.nomeFunc }}: {{ ref.tempo }}min
                              </option>
                            </select>
                          </div>
                        </td>

                        <!-- HORAS: o campo de quantidade é o elemento principal -->
                        <td v-for="hora in horasVisiveis" :key="hora" class="hora-td">
                          <div v-if="horaBloqueadaPorAusencia(funcionario, hora)" class="hora-ausente-marker">
                            🚫 Ausente
                          </div>
                          <div v-else class="hora-card">
                            <div class="qtd-input-wrap">
                              <span v-if="statusCelula(funcionario, linha, hora) !== 'idle'" class="save-dot"
                                :class="'save-dot--' + statusCelula(funcionario, linha, hora)"
                                :title="tituloStatusCelula(funcionario, linha, hora)"></span>
                              <input v-model.number="linha.registros[hora].quantidade" type="number" min="0"
                                inputmode="numeric" placeholder="0" :aria-label="`Quantidade produzida às ${hora}`"
                                :class="['hora-input', linha.registros[hora].quantidade > 0 ? 'tem-producao' : '']"
                                @input="onDigitarCelula(funcionario, linha, hora)" />
                            </div>

                            <div class="hora-meta">
                              <label class="tempo-wrap" title="Minutos disponíveis nesta hora">
                                <input v-model.number="linha.registros[hora].tempoProduzido" type="number" min="1"
                                  max="60" class="min-input" @input="onDigitarCelula(funcionario, linha, hora)" />
                                <span class="min-label">min</span>
                              </label>
                              <span v-if="infoHora(linha, hora).sam" class="hora-tr"
                                :title="resumoLinha(linha).rotuloTempo === 'TR' ? 'Tempo de referência por peça' : 'Tempo da ficha por peça'">
                                {{ resumoLinha(linha).rotuloTempo }} {{ fmtNum(infoHora(linha, hora).sam) }}
                              </span>
                            </div>

                            <!-- Eficiência dupla da hora: F = Ficha (TR da etapa) · TF = Tempo Fábrica (referência individual) -->
                            <div class="hora-ef-par">
                              <span :class="['hora-ef-mini', getEficClass(infoHora(linha, hora).efFicha)]"
                                :title="`Ficha: capacidade ${fmtNum(infoHora(linha, hora).capFicha)} pçs · TR ficha ${fmtNum(resumoLinha(linha).samFicha)} min`">
                                F {{ infoHora(linha, hora).efFicha ? infoHora(linha, hora).efFicha + '%' : '—' }}
                              </span>
                              <span v-if="resumoLinha(linha).trPessoaDistinto"
                                :class="['hora-ef-mini', getEficClass(infoHora(linha, hora).efRef)]"
                                :title="`Tempo Fábrica: capacidade ${fmtNum(infoHora(linha, hora).capRef)} pçs · TR ${fmtNum(resumoLinha(linha).samRef)} min`">
                                TF {{ infoHora(linha, hora).efRef ? infoHora(linha, hora).efRef + '%' : '—' }}
                              </span>
                              <span v-else class="hora-ef-mini hora-ef-mini--vazio"
                                title="Tempo Fábrica: sem referência individual — usa o TR da ficha">
                                TF —
                              </span>
                            </div>

                            <button v-if="celulaTemAlteracaoPendente(funcionario, linha, hora)" type="button"
                              class="btn-salvar-celula" title="Salvar agora"
                              @click="salvarCelulaManual(funcionario, linha, hora)">💾</button>
                          </div>
                        </td>

                        <!-- TOTAL da linha (fixo à direita) -->
                        <td class="sticky-r sticky-r-2 sticky-edge-r total-col">{{ resumoLinha(linha).total }}</td>

                        <!-- EFICIÊNCIA DO DIA (fixa à direita; ocupa todas as linhas do funcionário) -->
                        <td v-if="idxLinha === 0" class="sticky-r sticky-r-1 efic-dia-col"
                          :rowspan="funcionario.linhas.length">
                          <span v-if="funcionarioAusenteDiaInteiro(funcionario)"
                            class="efic-badge ausencia-tag--dia_inteiro">Ausente</span>
                          <template v-else>
                            <!-- Duas métricas distintas: FICHA (TR da etapa) × TEMPO FÁBRICA (referência
                                 individual do profissional). A principal fica em destaque conforme o tipo. -->
                            <div class="efic-dia-par">
                              <span :class="['efic-dia-item', getEficClass(resumoFunc(funcionario, grupo).efFicha), tipoProducaoFabrica ? 'efic-item--primario' : 'efic-item--secundario']"
                                title="Eficiência Ficha: produção × TR da etapa ÷ tempo trabalhado (dia completo)">
                                <span class="efic-dia-item-label">Ficha:</span>
                                <span class="efic-dia-item-valor">{{ resumoFunc(funcionario, grupo).efFicha ? resumoFunc(funcionario, grupo).efFicha + '%' : '—' }}</span>
                              </span>
                              <span :class="['efic-dia-item', getEficClass(resumoFunc(funcionario, grupo).efRef), !tipoProducaoFabrica ? 'efic-item--primario' : 'efic-item--secundario']"
                                title="Eficiência Tempo Fábrica: produção × referência individual do profissional ÷ tempo trabalhado (dia completo)">
                                <span class="efic-dia-item-label">Tempo Fábrica:</span>
                                <span class="efic-dia-item-valor">{{ resumoFunc(funcionario, grupo).efRef ? resumoFunc(funcionario, grupo).efRef + '%' : '—' }}</span>
                              </span>
                            </div>
                            <span v-if="resumoFunc(funcionario, grupo).capacidade" class="efic-dia-sub">
                              {{ resumoFunc(funcionario, grupo).total }} de {{
                                fmtNum(resumoFunc(funcionario, grupo).capacidade) }} pç
                            </span>
                          </template>

                          <!-- Hierarquia: funcionário → produção → eficiências → detalhamento -->
                          <button class="btn-detalhar"
                            :aria-expanded="!!detalhesAbertos[chaveDetalhes(funcionario, grupo)]"
                            @click="alternarDetalhes(funcionario, grupo)">
                            {{ detalhesAbertos[chaveDetalhes(funcionario, grupo)] ? '⌃ Ocultar detalhes' : '⌄ Detalhar produção' }}
                          </button>
                        </td>

                      </tr>

                      <!-- PAINEL EXPANSÍVEL DE DETALHAMENTO (mesma tela, sem modal/página) -->
                      <tr v-if="detalhesAbertos[chaveDetalhes(funcionario, grupo)]" class="linha-detalhe">
                        <td :colspan="2 + horasVisiveis.length + 2" class="linha-detalhe-td">
                          <div v-for="d in [detalhesVisiveis[chaveDetalhes(funcionario, grupo)]].filter(Boolean)"
                            :key="d ? 'painel-detalhe' : 'painel-vazio'" class="detalhe-panel">
                            <div class="detalhe-header">
                              <span class="detalhe-titulo">Resumo do profissional</span>
                              <span class="detalhe-contexto">{{ funcionario.nome }} · {{ grupo.label }}</span>
                            </div>

                            <div class="detalhe-cards">
                              <div v-for="card in d.cards" :key="card.label" :class="['detalhe-card', card.classe]"
                                :title="card.titulo">
                                <span class="detalhe-card-label">{{ card.label }}</span>
                                <span class="detalhe-card-valor">{{ card.valor }}</span>
                              </div>
                            </div>

                            <div class="detalhe-colunas">
                              <!-- Produção por hora (horas visíveis) -->
                              <div class="detalhe-tabela-wrap">
                                <div class="detalhe-secao-titulo">Produção por hora</div>
                                <table class="detalhe-tabela">
                                  <thead>
                                    <tr>
                                      <th>Hora</th>
                                      <th>Produção</th>
                                      <th>Tempo</th>
                                      <th>TR Ficha</th>
                                      <th>TR Fábrica</th>
                                      <th>Ef. Ficha</th>
                                      <th>Ef. Fábrica</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr v-for="h in d.horasTabela" :key="h.hora"
                                      :class="{ 'detalhe-linha-ativa': h.qtd > 0 }">
                                      <td>{{ h.hora }}</td>
                                      <td>{{ h.qtd || '—' }}</td>
                                      <td>{{ h.qtd ? h.min + ' min' : '—' }}</td>
                                      <td>{{ h.rotuloTrFicha }}</td>
                                      <td>{{ h.rotuloTrPessoa }}</td>
                                      <td>
                                        <span :class="['detalhe-ef-chip', getEficClass(h.efFicha)]">
                                          {{ h.qtd && h.efFicha ? h.efFicha + '%' : '—' }}
                                        </span>
                                      </td>
                                      <td>
                                        <span :class="['detalhe-ef-chip', h.trDistinto ? getEficClass(h.efRef) : '']"
                                          :title="h.trDistinto ? 'Eficiência com o TR individual do profissional' : 'Sem TR individual — usa o TR da ficha (valores iguais ao da coluna Ef. Ficha)'">
                                          {{ h.qtd && h.efRef ? h.efRef + '%' : '—' }}
                                        </span>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              <!-- Produção por etapa (inclui as etapas extras) -->
                              <div class="detalhe-tabela-wrap">
                                <div class="detalhe-secao-titulo">Produção por etapa</div>
                                <table class="detalhe-tabela">
                                  <thead>
                                    <tr>
                                      <th>Etapa</th>
                                      <th>TR Ficha</th>
                                      <th>TR Fábrica</th>
                                      <th>Produção</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr v-for="e in d.etapas" :key="e.chave">
                                      <td>{{ e.descricao }}<span v-if="e.extra" class="detalhe-etapa-extra"> ↳ extra</span></td>
                                      <td>{{ e.rotuloTrFicha }}</td>
                                      <td>{{ e.rotuloTrPessoa }}</td>
                                      <td><strong>{{ e.total }}</strong></td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
            </div>
          </template>
        </div>

      </div>

      <!-- MODAL DE AUSÊNCIA -->
      <div v-if="modalAusencia.aberto" class="ausencia-overlay" @click.self="fecharModalAusencia">
        <div class="ausencia-modal">
          <div class="ausencia-modal-header">
            <h3>Ausência — {{ modalAusencia.funcionario?.nome }}</h3>
            <button class="ausencia-modal-close" @click="fecharModalAusencia">×</button>
          </div>

          <div class="ausencia-modal-body">
            <div class="ausencia-tipo-switch">
              <button :class="['ausencia-tipo-btn', modalAusencia.form.tipo === 'dia_inteiro' ? 'active' : '']"
                @click="modalAusencia.form.tipo = 'dia_inteiro'">☀️🌙 Dia inteiro</button>
              <button :class="['ausencia-tipo-btn', modalAusencia.form.tipo === 'parcial' ? 'active' : '']"
                @click="modalAusencia.form.tipo = 'parcial'">🕒 Ausência parcial</button>
            </div>

            <div v-if="modalAusencia.form.tipo === 'parcial'" class="ausencia-periodos">
              <div v-for="(periodo, idx) in modalAusencia.form.periodos" :key="periodo._uid"
                class="ausencia-periodo-row">
                <select v-model="periodo.inicio" class="ausencia-hora-select">
                  <option v-for="h in opcoesHoraAusencia" :key="'ini-' + h" :value="h">{{ h }}</option>
                </select>
                <span class="ausencia-periodo-ate">às</span>
                <select v-model="periodo.fim" class="ausencia-hora-select">
                  <option v-for="h in opcoesHoraAusencia" :key="'fim-' + h" :value="h">{{ h }}</option>
                </select>
                <button v-if="modalAusencia.form.periodos.length > 1" class="btn-remove-periodo"
                  @click="removerPeriodoAusencia(idx)" title="Remover período">×</button>
              </div>
              <button class="btn-add-periodo" @click="adicionarPeriodoAusencia">+ adicionar período</button>
            </div>
            <p v-else class="ausencia-dia-inteiro-aviso">
              O funcionário ficará indisponível durante todo o expediente e nenhum lançamento de produção
              poderá ser feito para ele neste dia.
            </p>

            <div class="ausencia-campo-observacao">
              <label>Observação / motivo (opcional)</label>
              <textarea v-model="modalAusencia.form.observacao" class="ausencia-observacao-input" rows="2"
                placeholder="Ex.: consulta médica, licença, atestado…"></textarea>
            </div>
          </div>

          <div class="ausencia-modal-footer">
            <button v-if="modalAusencia.funcionario?.ausencia" class="btn-ausencia-remover"
              @click="removerAusencia">Remover
              ausência</button>
            <div class="ausencia-modal-footer-right">
              <button class="btn-ausencia-cancelar" @click="fecharModalAusencia">Cancelar</button>
              <button class="btn-ausencia-salvar" @click="salvarAusencia">Salvar</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
<script>
import SidebarNav from '@/components/Sidebar.vue'
import carregandoTela from '@/components/carregandoTela.vue'
import { useAuthStore } from '@/store/store'
import api from '@/Axios'
import router from '@/router'
import Swal from 'sweetalert2'
import { io } from 'socket.io-client'
import debounce from 'lodash/debounce'
import { gerarPdfProducao } from '@/utils/Gerarpdfproducao'
import { exportarMapaProducaoExcel } from '@/utils/functions/ExportarExcelMapaProducao'
import { useMonitorProdutividade } from '@/composables/useMonitorProdutividade'
import { calcularEficiencia, calcularCapacidade, resolverSam } from '@/utils/calculosProducao'
import { escolherReferenciaPorData, tempoDaReferencia } from '@/utils/tempoReferencia'

//const socket = io('https://acari-tex.onrender.com', { transports: ['websocket'] })
const socket = io('https://acari-tex.onrender.com', { transports: ['websocket'] })

const LOCAL_STORAGE_KEY = 'apontamento-horarios-turno'
const LS_HORAS_OCULTAS = 'apontamento-horas-ocultas'

const CONFIG_PADRAO = {
  manha: { inicio: '08:00', fim: '11:30' },
  tarde: { inicio: '13:30', fim: '17:00' },
}

// Limiar de eficiência usado como referência de "abaixo da média".
// É o MESMO limite que já dispara os alertas do monitor de produtividade
// (useMonitorProdutividade) — nenhuma regra paralela de referência.
const LIMIAR_EFICIENCIA_REFERENCIA = 80

// Valores padrão (somente leitura) usados pelos helpers de resumo do template.
const RESUMO_LINHA_VAZIO = { total: 0, minutos: 0, ponderadaFicha: 0, ponderadaRef: 0, capacidade: 0, capacidadeFicha: 0, capacidadeRef: 0, samPrincipal: 0, samFicha: 0, samRef: 0, trPessoaDistinto: false, rotuloTempo: 'FT', horas: {} }
const RESUMO_FUNC_VAZIO = { total: 0, minutos: 0, capacidade: 0, capacidadeFicha: 0, capacidadeRef: 0, etapas: 0, efFicha: 0, efRef: 0, efDia: 0 }
const INFO_HORA_VAZIA = { sam: 0, capacidade: 0, ef: 0, efFicha: 0, efRef: 0, capFicha: 0, capRef: 0, minutos: 60 }

// ── PERSISTÊNCIA OFFLINE DE ETAPA SELECIONADA ──────────────────────────
// Garante que a seleção de etapa nunca dependa de haver produção
// lançada: é salva localmente no INSTANTE da seleção (IndexedDB, com
// fallback automático para localStorage caso o navegador não suporte ou
// bloqueie IndexedDB — ex.: alguns modos privados) e sobrevive a reload
// de página, fechamento do navegador e queda de conexão.
const OFFLINE_DB_NAME = 'apontamento-offline'
const OFFLINE_DB_VERSION = 1
const OFFLINE_STORE_NAME = 'etapasSelecionadas'
const OFFLINE_FALLBACK_KEY = 'apontamento-etapas-offline-fallback'

let _offlineDbPromise = null

function abrirOfflineDB() {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null)
  if (_offlineDbPromise) return _offlineDbPromise

  _offlineDbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION)

      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(OFFLINE_STORE_NAME)) {
          db.createObjectStore(OFFLINE_STORE_NAME, { keyPath: 'chave' })
        }
      }

      req.onsuccess = () => resolve(req.result)
      req.onerror = () => {
        console.warn('IndexedDB indisponível, usando localStorage como fallback offline.')
        resolve(null)
      }
    } catch (err) {
      console.warn('Erro ao abrir IndexedDB, usando localStorage como fallback.', err)
      resolve(null)
    }
  })

  return _offlineDbPromise
}

function lerFallbackLocalStorage(chaveLS) {
  try {
    const bruto = localStorage.getItem(chaveLS)
    return bruto ? JSON.parse(bruto) : {}
  } catch {
    return {}
  }
}

function escreverFallbackLocalStorage(chaveLS, mapa) {
  try {
    localStorage.setItem(chaveLS, JSON.stringify(mapa))
  } catch (err) {
    console.warn('Não foi possível gravar fallback offline no localStorage.', err)
  }
}

const etapaOfflineStore = {
  async salvar(registro) {
    const db = await abrirOfflineDB()
    if (db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite')
          tx.objectStore(OFFLINE_STORE_NAME).put(registro)
          tx.oncomplete = () => resolve(true)
          tx.onerror = () => resolve(false)
        } catch {
          resolve(false)
        }
      })
    }
    const mapa = lerFallbackLocalStorage(OFFLINE_FALLBACK_KEY)
    mapa[registro.chave] = registro
    escreverFallbackLocalStorage(OFFLINE_FALLBACK_KEY, mapa)
    return true
  },

  async remover(chave) {
    const db = await abrirOfflineDB()
    if (db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite')
          tx.objectStore(OFFLINE_STORE_NAME).delete(chave)
          tx.oncomplete = () => resolve(true)
          tx.onerror = () => resolve(false)
        } catch {
          resolve(false)
        }
      })
    }
    const mapa = lerFallbackLocalStorage(OFFLINE_FALLBACK_KEY)
    delete mapa[chave]
    escreverFallbackLocalStorage(OFFLINE_FALLBACK_KEY, mapa)
    return true
  },

  async listarPorData(data) {
    const db = await abrirOfflineDB()
    if (db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(OFFLINE_STORE_NAME, 'readonly')
          const req = tx.objectStore(OFFLINE_STORE_NAME).getAll()
          req.onsuccess = () => resolve((req.result || []).filter(r => r.data === data))
          req.onerror = () => resolve([])
        } catch {
          resolve([])
        }
      })
    }
    const mapa = lerFallbackLocalStorage(OFFLINE_FALLBACK_KEY)
    return Object.values(mapa).filter(r => r.data === data)
  },
}

// ── PERSISTÊNCIA LOCAL ANTI-PERDA DE PRODUÇÃO (localStorage) ──────────
// Camada de segurança pedida explicitamente: TODO valor digitado nos
// campos de quantidade/minutos é gravado IMEDIATAMENTE (a cada tecla,
// sem debounce) no localStorage, com uma chave única por
// estabelecimento + data + funcionário + OP + etapa + hora. Isso é
// independente do salvamento via API (que segue debounce de 500ms) —
// o objetivo aqui é puramente não perder o valor digitado mesmo que a
// aba feche, a internet caia, ou o salvamento na API falhe.
const LS_PRODUCAO_PREFIXO = 'apontamento_producao_pendente'

function chaveLocalStorageProducao(estabelecimento, data, funcionarioId, opId, etapaId, hora) {
  return `${LS_PRODUCAO_PREFIXO}::${estabelecimento}::${data}::${funcionarioId}::${opId || 'sem-op'}::${etapaId}::${hora}`
}

function salvarPendenteLocalStorage(chaveLS, valor) {
  try {
    localStorage.setItem(chaveLS, JSON.stringify({ ...valor, timestamp: Date.now() }))
  } catch (err) {
    console.warn('Não foi possível gravar no localStorage (camada anti-perda).', err)
  }
}

function lerPendenteLocalStorage(chaveLS) {
  try {
    const bruto = localStorage.getItem(chaveLS)
    return bruto ? JSON.parse(bruto) : null
  } catch {
    return null
  }
}

function removerPendenteLocalStorage(chaveLS) {
  try {
    localStorage.removeItem(chaveLS)
  } catch (err) {
    console.warn('Não foi possível remover a chave do localStorage.', err)
  }
}

/** Lista todas as chaves pendentes de um estabelecimento+data específicos. */
function listarChavesPendentesLocalStorage(estabelecimento, data) {
  const prefixoAlvo = `${LS_PRODUCAO_PREFIXO}::${estabelecimento}::${data}::`
  const chaves = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(prefixoAlvo)) chaves.push(k)
  }
  return chaves
}

// ── PERSISTÊNCIA DA ESCOLHA DE TEMPO (Ficha x Referência) ──────
const LS_TEMPO_REF_PREFIXO = 'apontamento_tempo_referencia_escolhido'

function chaveLocalStorageTempoRef(estabelecimento, data, funcionarioId, opId, etapaId) {
  return `${LS_TEMPO_REF_PREFIXO}::${estabelecimento}::${data}::${funcionarioId}::${opId || 'sem-op'}::${etapaId}`
}

function salvarTempoRefLocalStorage(chaveLS, valor) {
  try {
    localStorage.setItem(chaveLS, JSON.stringify(valor))
  } catch (err) {
    console.warn('Erro ao salvar tempo referência no localStorage.', err)
  }
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
  name: 'ApontamentoDia',
  components: { SidebarNav, carregandoTela },
  setup() {
    return { store: useAuthStore(), monitorProdutividade: useMonitorProdutividade({ limiarEficiencia: LIMIAR_EFICIENCIA_REFERENCIA, intervaloMinutos: 30 }), }

  },

  data() {
    return {
      loading: true,
      socketConectado: false,
      dataSelecionada: this.formatarDataLocal(),
      dataCarregada: null,
      opsAtivas: [this.novaOpSetup()],
      opsExtras: [],
      funcionarios: [],
      funcionariosDia: [],
      pecas: [],
      pecasTodas: [],
      etapas: [],
      etapasMap: {},
      // Índices O(1) para não repetir flat()+filter() em cada célula da
      // tabela a cada re-render (ver buscarEtapa/etapasDaOp).
      etapasPorId: new Map(),
      etapasPorOp: new Map(),
      configHorarios: this.carregarConfigHorarios(),
      ultimaBuscaId: 0,
      carregandoMeta: false,
      gerandoPdf: false,
      gerandoExcel: false,
      modalAusencia: {
        aberto: false,
        funcionario: null,
        form: { tipo: 'dia_inteiro', periodos: [], observacao: '' },
      },

      /**
       * Painéis de "Detalhar produção" atualmente expandidos, por
       * funcionário+OP (chave `email::opId`). Somente visualização:
       * não afeta registros, salvamento nem cálculos.
       */
      detalhesAbertos: {},

      // ── Seleção/filtro de horas (somente VISUALIZAÇÃO) ──
      // Guarda as horas ocultas (e não as visíveis) para que horas novas
      // criadas pela configuração apareçam automaticamente.
      horasOcultas: this.carregarHorasOcultas(),
      filtroHoras: 'todas', // 'todas' | 'preenchidas' | 'pendentes'
      horasFiltroSnapshot: null, // lista congelada no clique do filtro

      /**
       * Estado de salvamento POR CÉLULA (quantidade+minutos de um
       * funcionário/OP/etapa/hora específicos). Estrutura pedida:
       *   saveStatus: {
       *     [chaveCelula]: { status: 'idle'|'pending'|'saving'|'saved'|'error', lastSavedAt: null|number }
       *   }
       * A chave é montada por chaveCelula(funcionarioId, opId, etapaId, hora).
       * Objeto plano (não Map) de propósito: Vue 3 torna reativa a adição
       * de novas chaves automaticamente, o que permite usar
       * this.saveStatus[chave] diretamente no template sem passos extras.
       */
      saveStatus: {},
    }
  },

  computed: {
    opcoesHoraInicio() {
      return this.gerarOpcoesHorario(6, 22)
    },

    opcoesHoraAusencia() {
      return this.gerarOpcoesHorario(6, 22)
    },

    /** Todas as horas do dia (manhã + tarde das configurações), ordenadas e sem repetir. */
    todasHorasDia() {
      const { manha, tarde } = this.configHorarios
      const set = new Set([
        ...this.gerarSequenciaHoras(manha.inicio, manha.fim),
        ...this.gerarSequenciaHoras(tarde.inicio, tarde.fim),
      ])
      return [...set].sort((a, b) => this.horaParaMinutos(a) - this.horaParaMinutos(b))
    },

    /** Colunas exibidas. Só controla VISUALIZAÇÃO: nenhum dado é apagado. */
    horasVisiveis() {
      const ocultas = new Set(this.horasOcultas)
      let horas = this.todasHorasDia.filter(h => !ocultas.has(h))
      if (this.horasFiltroSnapshot) {
        const snap = new Set(this.horasFiltroSnapshot)
        horas = horas.filter(h => snap.has(h))
      }
      return horas
    },

    /** Horas em que alguém já lançou quantidade > 0. */
    horasPreenchidas() {
      const set = new Set()
      for (const func of this.funcionariosDia) {
        for (const linha of func.linhas || []) {
          for (const [hora, reg] of Object.entries(linha.registros || {})) {
            if (reg && reg.quantidade > 0) set.add(hora)
          }
        }
      }
      return set
    },

    /** Rótulo usado no PDF/Excel no lugar do antigo turnoAtivo. */
    rotuloTurno() {
      const v = this.horasVisiveis
      const { manha, tarde } = this.configHorarios
      const man = new Set(this.gerarSequenciaHoras(manha.inicio, manha.fim))
      const tar = new Set(this.gerarSequenciaHoras(tarde.inicio, tarde.fim))
      if (v.length && v.every(h => man.has(h))) return 'Manhã'
      if (v.length && v.every(h => tar.has(h))) return 'Tarde'
      return 'Dia todo'
    },

    opsAtivasComPeca() {
      return this.opsAtivas.filter(op => op.pecaId)
    },

    opcoesEtapaTodas() {
      const opcoes = []
      for (const op of this.opsAtivasComPeca) {
        for (const etapa of this.etapasDaOp(op.pecaId)) {
          const etapaId = etapa.id_da_funcao || etapa.etapa?.id_da_funcao
          if (!etapaId) continue
          const descricao = etapa.descricao || etapa.etapa?.descricao || 'Etapa'
          const tempoPadrao = etapa.tempo_padrao || etapa.etapa?.tempo_padrao || 0
          opcoes.push({
            opId: op.pecaId,
            etapaId,
            label: `${descricao} (${tempoPadrao}min)`,
          })
        }
      }
      return opcoes
    },

    funcionariosAgrupadosPorOp() {
      const gruposMap = new Map()
      const idsAtivos = new Set(this.opsAtivasComPeca.map(op => op.pecaId))

      gruposMap.set(null, {
        opId: null,
        label: 'Funcionários sem OP',
        ativa: true,
        funcionarios: [],
      })

      for (const op of this.opsAtivasComPeca) {
        gruposMap.set(op.pecaId, {
          opId: op.pecaId,
          label: this.nomeDaOp(op.pecaId),
          ativa: true,
          funcionarios: [],
        })
      }

      for (const func of this.funcionariosDia) {
        for (const linha of func.linhas || []) {
          const opId = linha.opId || null
          if (opId && !gruposMap.has(opId)) {
            gruposMap.set(opId, {
              opId,
              label: this.nomeDaOp(opId),
              ativa: false,
              funcionarios: [],
            })
          }
        }
      }

      for (const func of this.funcionariosDia) {
        const linhasPorOp = new Map()

        for (const linha of (func.linhas || [])) {
          const chave = linha.opId || null
          if (!linhasPorOp.has(chave)) linhasPorOp.set(chave, [])
          linhasPorOp.get(chave).push(linha)
        }

        for (const [opId, linhas] of linhasPorOp.entries()) {
          const grupo = gruposMap.get(opId) || gruposMap.get(null)
          grupo.funcionarios.push({
            ...func,
            linhas: [...linhas],
            _grupoOpId: grupo.opId,
            _funcRef: func,
          })
        }
      }

      const ordemAtivas = this.opsAtivasComPeca.map(op => op.pecaId)
      const ordemHistoricas = [...gruposMap.keys()].filter(id => id !== null && !idsAtivos.has(id))
      const ordem = [...ordemAtivas, ...ordemHistoricas, null]

      return ordem
        .map(id => gruposMap.get(id))
        .filter(g => g && g.funcionarios.length)
    },

    mapaProducaoPorOp() {
      const mapa = new Map()
      for (const grupo of this.funcionariosAgrupadosPorOp) {
        if (grupo.opId) mapa.set(grupo.opId, grupo)
      }
      return mapa
    },

    temConteudoParaTabela() {
      return this.opsAtivasComPeca.length > 0
        || this.funcionariosAgrupadosPorOp.some(g => g.opId !== null)
    },

    /**
     * ÚNICO ponto de cálculo da tabela. Por linha (funcionário/OP/etapa)
     * calcula, uma vez só, o tempo de referência e os dados de cada hora.
     * Usa SOMENTE calcularCapacidade / calcularEficiencia já existentes,
     * com os mesmos parâmetros de calcularEficienciaRegistroPadrao/Referencia.
     * Regra de qual tempo vale (a mesma do monitor de produtividade):
     *   fábrica -> Ficha; demais -> Referência escolhida (fallback p/ Ficha).
     */
    resumoLinhas() {
      const mapa = new Map()
      const fabrica = this.store.pegar_usuario?.tipo_de_producao === 'fabrica'

      for (const func of this.funcionariosDia) {
        for (const linha of func.linhas || []) {
          const samFicha = this.resolverTempoPadrao(linha)
          const samRef = this.resolverTempoEfetivoReferencia(func, linha)
          const samPrincipal = fabrica ? samFicha : samRef
          const usaRef = !fabrica && linha.modoTempo === 'referencia' && !!linha.referenciaSelecionadaId

          const trPessoaDistinto = !!samRef && samRef !== samFicha

          const horas = {}
          let total = 0, minutos = 0, ponderadaFicha = 0, ponderadaRef = 0
          let capacidade = 0, capacidadeFicha = 0, capacidadeRef = 0

          for (const [hora, reg] of Object.entries(linha.registros || {})) {
            const qtd = Number(reg?.quantidade || 0)
            const min = Number(reg?.tempoProduzido || 60)
            const cap = samPrincipal
              ? calcularCapacidade({ funcionarios: 1, tempoTrabalhado: min, sam: samPrincipal })
              : 0
            const capFicha = samFicha
              ? calcularCapacidade({ funcionarios: 1, tempoTrabalhado: min, sam: samFicha })
              : 0
            const capRef = samRef
              ? calcularCapacidade({ funcionarios: 1, tempoTrabalhado: min, sam: samRef })
              : 0
            const ef = qtd > 0 && samPrincipal
              ? calcularEficiencia({ producaoPonderada: qtd * samPrincipal, funcionarios: 1, tempoTrabalhado: min })
              : 0
            const efFicha = qtd > 0 && samFicha
              ? calcularEficiencia({ producaoPonderada: qtd * samFicha, funcionarios: 1, tempoTrabalhado: min })
              : 0
            const efRef = qtd > 0 && samRef
              ? calcularEficiencia({ producaoPonderada: qtd * samRef, funcionarios: 1, tempoTrabalhado: min })
              : 0
            horas[hora] = { sam: samPrincipal, capacidade: cap, ef, efFicha, efRef, capFicha, capRef, minutos: min }

            // Horas "válidas" = com produção e não bloqueadas por ausência
            // (mesmo critério já usado em calcularEficienciaLinha*).
            if (qtd > 0 && !this.horaBloqueadaPorAusencia(func, hora)) {
              total += qtd
              minutos += min
              ponderadaFicha += qtd * samFicha
              ponderadaRef += qtd * samRef
              capacidade += cap
              capacidadeFicha += capFicha
              capacidadeRef += capRef
            }
          }

          mapa.set(linha.id, {
            total, minutos, ponderadaFicha, ponderadaRef,
            capacidade, capacidadeFicha, capacidadeRef,
            samPrincipal, samFicha, samRef, trPessoaDistinto,
            rotuloTempo: usaRef ? 'TR' : 'FT', horas,
          })
        }
      }
      return mapa
    },

    /**
     * Consolidação do DIA por funcionário dentro de cada módulo de OP.
     * Eficiência do dia = Σ produção ponderada ÷ Σ tempo das horas válidas
     * (equivale a Σ peças ÷ Σ capacidade). NUNCA média de percentuais.
     */
    resumoFuncionarioGrupo() {
      const mapa = new Map()
      const fabrica = this.store.pegar_usuario?.tipo_de_producao === 'fabrica'

      for (const grupo of this.funcionariosAgrupadosPorOp) {
        for (const f of grupo.funcionarios) {
          let total = 0, minutos = 0, pondFicha = 0, pondRef = 0
          let capacidade = 0, capacidadeFicha = 0, capacidadeRef = 0, etapas = 0
          for (const linha of f.linhas || []) {
            const r = this.resumoLinhas.get(linha.id)
            if (!r) continue
            total += r.total
            minutos += r.minutos
            capacidade += r.capacidade
            capacidadeFicha += r.capacidadeFicha || 0
            capacidadeRef += r.capacidadeRef || 0
            pondFicha += r.ponderadaFicha
            pondRef += r.ponderadaRef
            if (linha.etapaId) etapas++
          }
          const ef = (pond) => minutos
            ? calcularEficiencia({ producaoPonderada: pond, funcionarios: 1, tempoTrabalhado: minutos })
            : 0
          const efFicha = ef(pondFicha)
          const efRef = ef(pondRef)
          mapa.set(`${f.email}::${grupo.opId || 'sem'}`, {
            total,
            minutos,
            capacidade: Math.round(capacidade * 10) / 10,
            capacidadeFicha: Math.round(capacidadeFicha * 10) / 10,
            capacidadeRef: Math.round(capacidadeRef * 10) / 10,
            etapas,
            efFicha,
            efRef,
            efDia: fabrica ? efFicha : efRef,
          })
        }
      }
      return mapa
    },

    /**
     * Tipo de produção define qual métrica é a "principal" na exibição:
     * fábrica -> Ficha (TR da etapa); demais -> referência individual (TR).
     * As DUAS continuam sendo calculadas e exibidas separadamente.
     */
    tipoProducaoFabrica() {
      return this.store.pegar_usuario?.tipo_de_producao === 'fabrica'
    },

    /**
     * Consolidação do PERÍODO SELECIONADO (horasVisiveis) por
     * funcionário dentro de cada módulo de OP. Mesma fórmula acumulada
     * do dia — Σ peças × TR ÷ Σ tempo — NUNCA média de percentuais.
     * Apenas leitura: não altera registros nem salvamento.
     */
    resumoPeriodoGrupo() {
      const mapa = new Map()
      const horasVisiveis = this.horasVisiveis

      for (const grupo of this.funcionariosAgrupadosPorOp) {
        for (const f of grupo.funcionarios) {
          let total = 0, minutos = 0, pondFicha = 0, pondRef = 0, capacidadeFicha = 0, capacidadeRef = 0

          for (const linha of f.linhas || []) {
            const samFicha = this.resolverTempoPadrao(linha)
            const samRef = this.resolverTempoEfetivoReferencia(f, linha)

            for (const hora of horasVisiveis) {
              const reg = linha.registros?.[hora]
              const qtd = Number(reg?.quantidade || 0)
              if (!qtd || this.horaBloqueadaPorAusencia(f, hora)) continue

              const min = Number(reg?.tempoProduzido || 60)
              total += qtd
              minutos += min
              pondFicha += qtd * samFicha
              pondRef += qtd * samRef
              if (samFicha) capacidadeFicha += calcularCapacidade({ funcionarios: 1, tempoTrabalhado: min, sam: samFicha })
              if (samRef) capacidadeRef += calcularCapacidade({ funcionarios: 1, tempoTrabalhado: min, sam: samRef })
            }
          }

          const ef = (pond) => minutos
            ? calcularEficiencia({ producaoPonderada: pond, funcionarios: 1, tempoTrabalhado: minutos })
            : 0

          mapa.set(`${f.email}::${grupo.opId || 'sem'}`, {
            total,
            minutos,
            efFicha: ef(pondFicha),
            efRef: ef(pondRef),
            capacidadeFicha: Math.round(capacidadeFicha * 10) / 10,
            capacidadeRef: Math.round(capacidadeRef * 10) / 10,
          })
        }
      }
      return mapa
    },

    /**
     * Eficiência consolidada do PERÍODO selecionado (horas visíveis)
     * somando todos os funcionários/etapas da tabela — alimenta a faixa
     * de resumo da barra de horários. Mesma fórmula acumulada.
     */
    resumoPeriodoGeral() {
      let total = 0, minutos = 0, pondFicha = 0, pondRef = 0

      for (const grupo of this.funcionariosAgrupadosPorOp) {
        for (const f of grupo.funcionarios) {
          for (const linha of f.linhas || []) {
            const samFicha = this.resolverTempoPadrao(linha)
            const samRef = this.resolverTempoEfetivoReferencia(f, linha)

            for (const hora of this.horasVisiveis) {
              const reg = linha.registros?.[hora]
              const qtd = Number(reg?.quantidade || 0)
              if (!qtd || this.horaBloqueadaPorAusencia(f, hora)) continue

              const min = Number(reg?.tempoProduzido || 60)
              total += qtd
              minutos += min
              pondFicha += qtd * samFicha
              pondRef += qtd * samRef
            }
          }
        }
      }

      const ef = (pond) => minutos
        ? calcularEficiencia({ producaoPonderada: pond, funcionarios: 1, tempoTrabalhado: minutos })
        : 0

      return { total, minutos, efFicha: ef(pondFicha), efRef: ef(pondRef) }
    },

    /**
     * Dados do painel "Detalhar produção", montados APENAS para os
     * funcionários atualmente expandidos (ver detalhesAbertos) —
     * reutiliza resumoLinhas/resumoFuncionarioGrupo/resumoPeriodoGrupo,
     * sem duplicar nenhuma regra de cálculo.
     */
    detalhesVisiveis() {
      const mapa = {}
      for (const grupo of this.funcionariosAgrupadosPorOp) {
        for (const f of grupo.funcionarios) {
          const chave = `${f.email}::${grupo.opId || 'sem'}`
          if (this.detalhesAbertos[chave]) mapa[chave] = this.montarDadosDetalhe(f, grupo)
        }
      }
      return mapa
    },

    /**
     * Contador global de células com alteração ainda não confirmada pelo
     * backend (pendente de debounce, em salvamento, ou em erro).
     * Alimenta o badge do header.
     */
    totalCelulasPendentes() {
      return Object.values(this.saveStatus).filter(
        s => s.status === 'pending' || s.status === 'saving' || s.status === 'error'
      ).length
    },

    /**
     * Usado para decidir se o listener de beforeunload deve estar ativo
     * (ver watch abaixo) — "existe algo que, se a aba fechar agora, pode
     * ser perdido pela API (ainda que o localStorage já tenha uma cópia)?"
     */
    existemAlteracoesPendentes() {
      return this.totalCelulasPendentes > 0
    },
  },

  watch: {
    dataSelecionada() {
      // Antes de trocar de dia (o que reconstrói funcionariosDia do
      // zero), garante que qualquer edição ainda dentro da janela do
      // debounce seja disparada imediatamente — sem isso, a edição mais
      // recente poderia ser perdida da tela (ainda ficaria seguro no
      // localStorage, mas é melhor já tentar salvar antes de trocar).
      this.flushAntesDeTrocarTela()
      // Painéis de detalhamento não fazem sentido para outro dia.
      this.detalhesAbertos = {}
      this.buscarMetaDia()
    },

    /**
     * Liga/desliga o listener de beforeunload dinamicamente, exatamente
     * como pedido: só fica ativo enquanto houver alguma célula
     * pendente/salvando/com erro. Assim que tudo é confirmado pelo
     * backend, o listener é removido e a aba pode ser fechada sem aviso.
     */
    existemAlteracoesPendentes(existemAgora) {
      if (existemAgora) {
        if (!this._beforeUnloadAtivo) {
          window.addEventListener('beforeunload', this._onBeforeUnloadHandler)
          this._beforeUnloadAtivo = true
        }
      } else if (this._beforeUnloadAtivo) {
        window.removeEventListener('beforeunload', this._onBeforeUnloadHandler)
        this._beforeUnloadAtivo = false
      }
    },
  },

  created() {
    // Bookkeeping NÃO reativo de propósito (timers e sets de controle de
    // fluxo não precisam — e não devem — disparar re-render do Vue).
    this._debounceTimers = new Map()   // chaveCelula -> timeoutId
    this._emVoo = new Set()            // chaveCelula com requisição em andamento
    this._reenviarAposSalvar = new Set() // chaveCelula que mudou de novo enquanto salvava
    this._beforeUnloadAtivo = false

    this._onBeforeUnloadHandler = (e) => {
      // Aviso padrão do navegador — o texto customizado não é mais
      // respeitado pelos navegadores modernos por segurança, mas
      // preventDefault + returnValue é o que aciona o diálogo nativo.
      this.flushAntesDeTrocarTela()
      e.preventDefault()
      e.returnValue = ''
      return ''
    }
  },

  async mounted() {
    if (!this.store.pegar_token) router.push('/')
    this.iniciarSocket()
    await this.aguardarConexaoSocket()
    await this.carregarDados()
    await this.buscarMetaDia()
    // buscarMetaDia() já dispara restaurarEtapasOffline() e
    // restaurarPendentesLocalStorage() internamente, no momento certo
    // (depois que funcionariosDia foi reconstruído), e getFaltas()
    // também — tudo se repete automaticamente a cada troca de data.

    // Sincronização periódica: tenta salvar de novo qualquer célula
    // pendente/erro mesmo sem nova digitação — cobre o caso da conexão
    // voltar sem o evento 'online' do navegador disparar de forma
    // confiável (comum em redes móveis).
    this._intervaloRetentativa = setInterval(() => {
      this.retentarCelulasPendentes()
    }, 20000)

    this._onOnlineHandler = () => this.retentarCelulasPendentes()
    window.addEventListener('online', this._onOnlineHandler)

    // No celular, trocar de app ou bloquear a tela dispara
    // visibilitychange de forma bem mais confiável que beforeunload.
    this._onVisibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        this.flushAntesDeTrocarTela()
      } else {
        this.retentarCelulasPendentes()
      }
    }
    document.addEventListener('visibilitychange', this._onVisibilityHandler)

    // O listener de beforeunload em si só é registrado quando existem
    // alterações pendentes — ver watch: existemAlteracoesPendentes.
  },

  beforeUnmount() {
    this.flushAntesDeTrocarTela()

    if (this._beforeUnloadAtivo) {
      window.removeEventListener('beforeunload', this._onBeforeUnloadHandler)
      this._beforeUnloadAtivo = false
    }
    clearInterval(this._intervaloRetentativa)
    if (this._onOnlineHandler) window.removeEventListener('online', this._onOnlineHandler)
    if (this._onVisibilityHandler) document.removeEventListener('visibilitychange', this._onVisibilityHandler)

    for (const timer of this._debounceTimers.values()) clearTimeout(timer)
    this._debounceTimers.clear()

    socket.off()
    socket.disconnect()
  },

  methods: {
    // ── DATA ──────────────────────────────────────────────
    formatarDataLocal(data = new Date()) {
      return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
    },

    // ── RESUMOS PARA O TEMPLATE (somente leitura de computeds) ─────
    resumoLinha(linha) {
      return this.resumoLinhas.get(linha.id) || RESUMO_LINHA_VAZIO
    },

    infoHora(linha, hora) {
      return this.resumoLinha(linha).horas[hora] || INFO_HORA_VAZIA
    },

    resumoFunc(funcionario, grupo) {
      return this.resumoFuncionarioGrupo.get(`${funcionario.email}::${grupo.opId || 'sem'}`) || RESUMO_FUNC_VAZIO
    },

    resumoPeriodo(funcionario, grupo) {
      return this.resumoPeriodoGrupo.get(`${funcionario.email}::${grupo.opId || 'sem'}`) || {}
    },

    /**
     * TR individual em exibição na linha do funcionário — só quando
     * existe UMA etapa e o TR individual é DIFERENTE do da ficha
     * (senão o próprio select de tempo da etapa já mostra o valor).
     */
    tempoReferenciaUnico(funcionario, grupo) {
      if (!funcionario || !grupo) return null
      const linhasComEtapa = (funcionario.linhas || []).filter(l => l.etapaId)
      if (linhasComEtapa.length !== 1) return null
      const r = this.resumoLinha(linhasComEtapa[0])
      return r.trPessoaDistinto ? r.samRef : null
    },

    fmtNum(n) {
      return Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
    },

    fmtHorasRegistradas(min) {
      const h = Math.floor((min || 0) / 60)
      const m = (min || 0) % 60
      return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
    },

    // ── DETALHAMENTO EXPANSÍVEL DO PROFISSIONAL ───────────
    // Mesma tela, sem modal e sem nova página: o painel aparece como
    // uma linha logo abaixo das linhas do funcionário na tabela.
    chaveDetalhes(funcionario, grupo) {
      return `${funcionario.email}::${grupo.opId || 'sem'}`
    },

    alternarDetalhes(funcionario, grupo) {
      const chave = this.chaveDetalhes(funcionario, grupo)
      this.detalhesAbertos = { ...this.detalhesAbertos, [chave]: !this.detalhesAbertos[chave] }
    },

    /**
     * Monta os dados do painel do profissional. Reutiliza os resumos
     * existentes (resumoLinhas/resumoFuncionarioGrupo/resumoPeriodoGrupo)
     * e as funções oficiais de eficiência/capacidade — nenhuma regra
     * de cálculo nova é criada aqui.
     */
    montarDadosDetalhe(funcionario, grupo) {
      const chave = this.chaveDetalhes(funcionario, grupo)
      const dia = this.resumoFuncionarioGrupo.get(chave) || RESUMO_FUNC_VAZIO
      const periodo = this.resumoPeriodoGrupo.get(chave) || {}

      const linhasComEtapa = (funcionario.linhas || []).filter(l => l.etapaId)
      const etapaUnica = linhasComEtapa.length === 1 ? linhasComEtapa[0] : null

      // Horas com produção no dia (deduplicadas entre etapas)
      const horasComProducao = new Set()
      for (const linha of linhasComEtapa) {
        for (const [hora, reg] of Object.entries(linha.registros || {})) {
          if (Number(reg?.quantidade || 0) > 0) horasComProducao.add(hora)
        }
      }
      const horasSemProducao = Math.max(this.todasHorasDia.length - horasComProducao.size, 0)

      // Produção por hora — consolida todas as etapas do funcionário na
      // hora com a MESMA fórmula acumulada (Σ qtd×TR ÷ Σ tempo).
      const horasTabela = this.horasVisiveis.map(hora => {
        let qtd = 0, min = 0, pondFicha = 0, pondRef = 0, trDistinto = false
        for (const linha of linhasComEtapa) {
          const reg = linha.registros?.[hora]
          const q = Number(reg?.quantidade || 0)
          if (!q) continue
          const samFicha = this.resolverTempoPadrao(linha)
          const samRef = this.resolverTempoEfetivoReferencia(funcionario, linha)
          qtd += q
          min += Number(reg?.tempoProduzido || 60)
          pondFicha += q * samFicha
          pondRef += q * samRef
          if (samRef && samRef !== samFicha) trDistinto = true
        }
        const ef = (pond) => min
          ? calcularEficiencia({ producaoPonderada: pond, funcionarios: 1, tempoTrabalhado: min })
          : 0
        return {
          hora,
          qtd,
          min,
          efFicha: ef(pondFicha),
          efRef: ef(pondRef),
          trDistinto,
          rotuloTrFicha: etapaUnica && this.resolverTempoPadrao(etapaUnica)
            ? `${this.fmtNum(this.resolverTempoPadrao(etapaUnica))} min`
            : '—',
          rotuloTrPessoa: etapaUnica && this.resolverTempoEfetivoReferencia(funcionario, etapaUnica)
            ? `${this.fmtNum(this.resolverTempoEfetivoReferencia(funcionario, etapaUnica))} min`
            : '—',
        }
      })

      // Produção por etapa (inclui as etapas extras)
      const etapas = linhasComEtapa.map(linha => {
        const r = this.resumoLinha(linha)
        const samFicha = this.resolverTempoPadrao(linha)
        const samRef = this.resolverTempoEfetivoReferencia(funcionario, linha)
        return {
          chave: linha.id,
          descricao: linha.descricao || this.buscarEtapa(linha.etapaId, linha.opId)?.descricao || '—',
          extra: linha.tipo === 'extra',
          total: r.total,
          minutos: r.minutos,
          rotuloTrFicha: samFicha ? `${this.fmtNum(samFicha)} min` : '—',
          rotuloTrPessoa: samRef ? `${this.fmtNum(samRef)} min` : '—',
          trDistinto: !!samRef && samRef !== samFicha,
        }
      })

      const classeCard = (pct) => ({
        'efic-alta': 'detalhe-card--alta',
        'efic-media': 'detalhe-card--media',
        'efic-baixa': 'detalhe-card--baixa',
      }[this.getEficClass(pct)] || '')

      const cards = [
        { label: 'Produção total', valor: `${this.fmtNum(dia.total)} peças` },
        { label: 'Horas produtivas', valor: this.fmtHorasRegistradas(dia.minutos) },
        { label: 'Horas sem produção', valor: `${horasSemProducao}h`, titulo: 'Horas do dia em que este profissional não lançou produção' },
      ]

      if (etapaUnica) {
        const samF = this.resolverTempoPadrao(etapaUnica)
        const samR = this.resolverTempoEfetivoReferencia(funcionario, etapaUnica)
        if (samF) cards.push({ label: 'Tempo de referência da ficha', valor: `${this.fmtNum(samF)} min/peça` })
        if (samR) cards.push({
          label: 'Tempo de referência Tempo Fábrica',
          valor: `${this.fmtNum(samR)} min/peça`,
          titulo: 'Referência individual deste profissional nesta OP/etapa (regra TempoReferencia existente)',
        })
      }

      cards.push(
        { label: 'Capacidade pela ficha', valor: `${this.fmtNum(dia.capacidadeFicha)} peças`, titulo: 'Produção esperada usando o TR da ficha técnica' },
        { label: 'Capacidade pelo Tempo Fábrica', valor: `${this.fmtNum(dia.capacidadeRef)} peças`, titulo: 'Produção esperada usando a referência individual do profissional' },
        { label: 'Eficiência Ficha (dia)', valor: dia.efFicha ? `${dia.efFicha}%` : '—', classe: classeCard(dia.efFicha), titulo: 'Dia completo · produção × TR da ficha ÷ tempo trabalhado' },
        { label: 'Eficiência Tempo Fábrica (dia)', valor: dia.efRef ? `${dia.efRef}%` : '—', classe: classeCard(dia.efRef), titulo: 'Dia completo · produção × referência individual ÷ tempo trabalhado' },
        { label: 'Produção no período', valor: `${this.fmtNum(periodo.total || 0)} peças`, titulo: this.horasVisiveis.length ? `Horas visíveis: ${this.horasVisiveis.join(', ')}` : '' },
        { label: 'Eficiência Ficha (período)', valor: periodo.efFicha ? `${periodo.efFicha}%` : '—', classe: classeCard(periodo.efFicha), titulo: 'Somente as horas visíveis · TR da ficha' },
        { label: 'Eficiência Tempo Fábrica (período)', valor: periodo.efRef ? `${periodo.efRef}%` : '—', classe: classeCard(periodo.efRef), titulo: 'Somente as horas visíveis · referência individual do profissional' },
      )

      return { cards, horasTabela, etapas }
    },

    // ── SELEÇÃO / FILTRO DE HORAS ─────────────────────────
    carregarHorasOcultas() {
      try {
        const bruto = localStorage.getItem(LS_HORAS_OCULTAS)
        const lista = bruto ? JSON.parse(bruto) : []
        return Array.isArray(lista) ? lista : []
      } catch {
        return []
      }
    },

    persistirHorasOcultas() {
      try {
        localStorage.setItem(LS_HORAS_OCULTAS, JSON.stringify(this.horasOcultas))
      } catch (err) {
        console.warn('Não foi possível salvar as horas ocultas.', err)
      }
    },

    alternarHora(hora) {
      this.horasOcultas = this.horasOcultas.includes(hora)
        ? this.horasOcultas.filter(h => h !== hora)
        : [...this.horasOcultas, hora]
      this.persistirHorasOcultas()
    },

    /** Atalhos de conveniência: Manhã/Tarde deixam de ser estrutura e viram só seleção. */
    aplicarAtalhoTurno(turno) {
      let alvo = this.todasHorasDia
      if (turno === 'manha' || turno === 'tarde') {
        const cfg = this.configHorarios[turno]
        alvo = this.gerarSequenciaHoras(cfg.inicio, cfg.fim)
      }
      const manter = new Set(alvo)
      this.horasOcultas = this.todasHorasDia.filter(h => !manter.has(h))
      this.persistirHorasOcultas()
      this.definirFiltroHoras('todas')
    },

    /**
     * O filtro por preenchimento usa um SNAPSHOT tirado no clique. Sem
     * isso, em "Pendentes" a coluna sumiria debaixo do cursor assim que
     * o gestor digitasse nela. Clicar no filtro de novo reavalia.
     */
    definirFiltroHoras(modo) {
      this.filtroHoras = modo
      if (modo === 'todas') {
        this.horasFiltroSnapshot = null
        return
      }
      const pre = this.horasPreenchidas
      this.horasFiltroSnapshot = this.todasHorasDia.filter(h =>
        modo === 'preenchidas' ? pre.has(h) : !pre.has(h)
      )
    },

    // ── HORÁRIOS ──────────────────────────────────────────
    horaParaMinutos(hora) {
      const [h, m] = hora.split(':').map(Number)
      return h * 60 + m
    },

    minutosParaHora(minutos) {
      const h = Math.floor(minutos / 60) % 24
      const m = minutos % 60
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    },

    gerarOpcoesHorario(horaInicial, horaFinal) {
      const opcoes = []
      for (let h = horaInicial; h <= horaFinal; h++) {
        opcoes.push(`${String(h).padStart(2, '0')}:00`)
        if (h < horaFinal) opcoes.push(`${String(h).padStart(2, '0')}:30`)
      }
      return opcoes
    },

    opcoesHoraFimDe(turno) {
      const cfg = this.configHorarios[turno]
      const inicioMin = this.horaParaMinutos(cfg.inicio)
      return this.gerarOpcoesHorario(6, 23).filter(h => this.horaParaMinutos(h) > inicioMin)
    },

    gerarSequenciaHoras(inicio, fim) {
      const inicioMin = this.horaParaMinutos(inicio)
      const fimMin = this.horaParaMinutos(fim)

      if (!inicio || !fim || fimMin <= inicioMin) {
        return inicio ? [inicio] : []
      }

      const sequencia = []
      let atual = inicioMin

      while (atual < fimMin) {
        sequencia.push(this.minutosParaHora(atual))
        atual += 60
      }

      sequencia.push(fim)
      return sequencia
    },

    carregarConfigHorarios() {
      try {
        const salvo = localStorage.getItem(LOCAL_STORAGE_KEY)
        if (!salvo) return JSON.parse(JSON.stringify(CONFIG_PADRAO))

        const parsed = JSON.parse(salvo)
        return {
          manha: {
            inicio: parsed?.manha?.inicio || CONFIG_PADRAO.manha.inicio,
            fim: parsed?.manha?.fim || CONFIG_PADRAO.manha.fim,
          },
          tarde: {
            inicio: parsed?.tarde?.inicio || CONFIG_PADRAO.tarde.inicio,
            fim: parsed?.tarde?.fim || CONFIG_PADRAO.tarde.fim,
          },
        }
      } catch (err) {
        console.warn('Erro ao carregar horários salvos, usando padrão.', err)
        return JSON.parse(JSON.stringify(CONFIG_PADRAO))
      }
    },

    salvarConfigHorarios() {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.configHorarios))
      } catch (err) {
        console.warn('Não foi possível salvar os horários no navegador.', err)
      }
    },

    onAlterarConfigHorario(turno) {
      const cfg = this.configHorarios[turno]
      if (this.horaParaMinutos(cfg.fim) <= this.horaParaMinutos(cfg.inicio)) {
        cfg.fim = this.opcoesHoraFimDe(turno)[0] || cfg.inicio
      }

      this.salvarConfigHorarios()
      this.ajustarRegistrosParaNovasHoras()
    },

    ajustarRegistrosParaNovasHoras() {
      // Antes só cobria o turno ativo; agora garante TODAS as horas do dia.
      for (const funcionario of this.funcionariosDia) {
        for (const linha of funcionario.linhas || []) {
          if (!linha.registros) linha.registros = {}

          for (const hora of this.todasHorasDia) {
            if (!linha.registros[hora]) {
              linha.registros[hora] = {
                quantidade: null,
                tempoProduzido: 60,
              }
            }
          }
        }
      }
    },

    // ── SOCKET ────────────────────────────────────────────
    iniciarSocket() {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('erro-producao')

      const cnpj = this.store.pegar_usuario?.cnpj
      if (cnpj) socket.off(`nova_atualizacao_${cnpj}`)

      socket.on('connect', () => {
        this.socketConectado = true
        if (this._jaConectouUmaVez) {
          this.buscarMetaDia()
        }
        this._jaConectouUmaVez = true
        // Reconexão também é um bom gatilho para tentar salvar de novo
        // qualquer célula pendente, sem esperar o intervalo periódico.
        this.retentarCelulasPendentes()
      })
      socket.on('disconnect', () => { this.socketConectado = false })
      socket.on('erro-producao', err => { console.log(err) })

      if (cnpj) {
        socket.on(`nova_atualizacao_${cnpj}`, () => this.onAtualizacaoRemota())
      }

      if (!socket.connected) {
        socket.connect()
      } else {
        this.socketConectado = true
      }
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

        const onConnect = () => {
          clearTimeout(timeout)
          resolve()
        }

        socket.once('connect', onConnect)
      })
    },

    // ── CARREGAMENTO ──────────────────────────────────────
    async carregarDados() {
      try {
        const token = this.store.pegar_token

        const [resFuncs, resPecas] = await Promise.all([
          api.get('/Funcionarios', { headers: { Authorization: token } }),
          api.get('/pecas', { headers: { Authorization: token } }),
        ])

        this.funcionarios = resFuncs.data.funcionarios || []
        console.log('Funcionários carregados:', this.funcionarios)

        const pecasPorStatus = resPecas.data.peca || {}
        const todasAsPecas = Array.isArray(pecasPorStatus)
          ? pecasPorStatus
          : Object.values(pecasPorStatus).flat()

        this.pecas = pecasPorStatus.em_progresso || []
        this.pecasTodas = todasAsPecas
        this.etapas = this.pecasTodas.map(p => p.etapas || [])

        this.etapasMap = {}
        this.etapasPorId = new Map()
        this.etapasPorOp = new Map()

        for (const listaEtapas of this.etapas) {
          for (const e of listaEtapas) {
            const idFuncao = e.id_da_funcao || e.etapa?.id_da_funcao
            const idOp = e.id_da_op
            if (idFuncao) {
              this.etapasMap[`${idOp}::${idFuncao}`] = e
              if (!this.etapasPorId.has(idFuncao)) this.etapasPorId.set(idFuncao, [])
              this.etapasPorId.get(idFuncao).push(e)
            }
            if (idOp) {
              if (!this.etapasPorOp.has(idOp)) this.etapasPorOp.set(idOp, [])
              this.etapasPorOp.get(idOp).push(e)
            }
          }
        }

        this.inicializarFuncionarios()

      } catch (err) {
        console.log(err)
        Swal.fire('Erro', 'Erro ao carregar dados', 'error')
      } finally {
        this.loading = false
      }
    },

    // ── OPs SETUP ─────────────────────────────────────────
    novaOpSetup() {
      return { _uid: Date.now() + Math.random(), pecaId: '', metaDia: 0 }
    },

    adicionarOp() {
      this.opsAtivas.push(this.novaOpSetup())
    },

    removerOp(idx) {
      this.opsAtivas.splice(idx, 1)
      this.sincronizarOpsExtras()
      this.salvarMetaDia()
    },

    sincronizarOpsExtras() {
      const idsAtivos = new Set(this.opsAtivas.map(op => op.pecaId).filter(Boolean))

      const idsComRegistro = new Set()
      for (const func of this.funcionariosDia) {
        for (const linha of func.linhas || []) {
          if (linha.opId) idsComRegistro.add(linha.opId)
        }
      }

      this.opsExtras = this.opsExtras.filter(op => idsComRegistro.has(op.pecaId) && !idsAtivos.has(op.pecaId))

      const jaExtras = new Set(this.opsExtras.map(op => op.pecaId))
      for (const pecaId of idsComRegistro) {
        if (idsAtivos.has(pecaId) || jaExtras.has(pecaId)) continue
        this.opsExtras.push({
          _uid: `hist-${pecaId}-${Date.now()}-${Math.random()}`,
          pecaId,
          metaDia: 0,
          historica: true,
        })
      }
    },

    pecasDisponiveis(pecaIdAtual) {
      const selecionadas = this.opsAtivas.map(o => o.pecaId).filter(id => id && id !== pecaIdAtual)
      return this.pecas.filter(p => !selecionadas.includes(p.id_da_op))
    },

    nomeDaOp(pecaId) {
      const peca = this.pecasTodas.find(p => p.id_da_op === pecaId)
      return peca?.descricao || pecaId
    },

    etapasDaOp(pecaId) {
      return this.etapasPorOp.get(pecaId) || []
    },

    opcoesParaOp(pecaId) {
      const resultado = []
      this.opcoesEtapaTodas.forEach((opcao, idx) => {
        if (opcao.opId === pecaId) resultado.push({ idx, label: opcao.label })
      })
      return resultado
    },

    indiceOpcaoEtapa(linha) {
      if (!linha?.etapaId) return ''
      const idx = this.opcoesEtapaTodas.findIndex(
        o => o.etapaId === linha.etapaId && o.opId === linha.opId
      )
      return idx === -1 ? '' : idx
    },

    onAlterarEtapaPorIndice(funcionario, linha, valorIndice) {
      if (valorIndice === '' || valorIndice === null || valorIndice === undefined) {
        if (linha.etapaId) {
          this.removerEtapaOfflineSeExistir(funcionario, linha.opId, linha.etapaId, linha.tipo)
        }
        linha.etapaId = ''
        linha.opId = null
        linha.descricao = ''
        linha.tempoPadrao = 0
        linha.modoTempo = 'padrao'
        linha.referenciaSelecionadaId = null
        this.salvarMetaDia()
        return
      }

      const opcao = this.opcoesEtapaTodas[Number(valorIndice)]
      if (!opcao) return

      if (linha.etapaId && (linha.etapaId !== opcao.etapaId || linha.opId !== opcao.opId)) {
        this.removerEtapaOfflineSeExistir(funcionario, linha.opId, linha.etapaId, linha.tipo)
      }

      linha.etapaId = opcao.etapaId
      linha.opId = opcao.opId

      this.onAlterarEtapa(funcionario, linha)
      this.persistirEtapaOffline(funcionario, linha)
    },

    // ── FUNCIONÁRIOS ──────────────────────────────────────
    inicializarFuncionarios() {
      this.funcionariosDia = this.funcionarios
        .filter(func => Number(func.permissoes) !== 1)
        .map(func => ({
          ...func,
          linhas: [this.novaLinha('principal')],
          ausencia: null,
        }))
    },

    novaLinha(tipo = 'extra') {
      return {
        id: Date.now() + Math.random(),
        tipo,
        etapaId: '',
        descricao: '',
        tempoPadrao: 0,
        opId: null,
        modoTempo: 'padrao',
        referenciaSelecionadaId: null,
        registros: this.criarRegistros(),
      }
    },

    criarRegistros() {
      const registros = {}
      const horas = [
        ...this.gerarSequenciaHoras(this.configHorarios.manha.inicio, this.configHorarios.manha.fim),
        ...this.gerarSequenciaHoras(this.configHorarios.tarde.inicio, this.configHorarios.tarde.fim),
      ]
      for (const hora of horas) {
        registros[hora] = {
          quantidade: null,
          tempoProduzido: 60,
        }
      }
      return registros
    },

    adicionarLinhaExtra(funcionario, herdarOpDoModulo = true) {
      const real = funcionario._funcRef || funcionario
      if (!Array.isArray(real.linhas)) real.linhas = []

      const linhaExtra = this.novaLinha('extra')

      if (herdarOpDoModulo && funcionario._grupoOpId) {
        linhaExtra.opId = funcionario._grupoOpId
      }

      real.linhas.push(linhaExtra)
      this.salvarMetaDia()
    },

    removerLinhaExtra(funcionario, idxLinha) {
      const real = funcionario._funcRef || funcionario

      const linhaAlvo = funcionario.linhas?.[idxLinha]
      if (!linhaAlvo) return

      if (linhaAlvo.etapaId) {
        this.removerEtapaOfflineSeExistir(funcionario, linhaAlvo.opId, linhaAlvo.etapaId, linhaAlvo.tipo)
      }

      const indiceReal = real.linhas.findIndex(l => l.id === linhaAlvo.id)
      if (indiceReal === -1) return

      real.linhas.splice(indiceReal, 1)
      this.salvarMetaDia()
    },

    listarRefsDaEtapa(etapa) {
      if (!etapa) return []
      const refs = etapa.tempo_referencia || etapa.etapa?.tempo_referencia || []
      if (!Array.isArray(refs) || !refs.length) return []

      return refs
        .filter(r => r && (r.tempo_minutos || r.tempo_por_peca))
        .map(r => {
          const t = Number(r.tempo_minutos ?? r.tempo_por_peca ?? 0)
          const func = this.funcionarios.find(f => f.email === r.id_funcionario)
          // Usar r.id (PK do banco) como valor único do option.
          // ANTIGAMENTE usava r.id_funcionario (email), mas quando um
          // profissional tinha VÁRIOS tempos de referência para a mesma
          // etapa/OP, todos os options tinham o mesmo value → o select
          // não distinguia e o resolver sempre pegava o primeiro.
          return {
            id: r.id ?? r.id_funcionario,
            funcionarioId: r.id_funcionario,
            nomeFunc: func?.nome || r.id_funcionario,
            tempo: t,
          }
        })
        .filter(r => r.tempo > 0)
    },

    onSelecionarTempo(funcionario, linha, valor) {
      if (valor === '__padrao__') {
        linha.modoTempo = 'padrao'
        linha.referenciaSelecionadaId = null
      } else {
        linha.modoTempo = 'referencia'
        linha.referenciaSelecionadaId = valor
      }

      // Salvar no localStorage para que a escolha sobreviva quando
      // buscarMetaDia reconstrói as linhas.
      const real = funcionario?._funcRef || funcionario
      if (real?.email && linha?.etapaId) {
        const chaveLS = chaveLocalStorageTempoRef(
          this.store.pegar_usuario?.cnpj || '', this.dataSelecionada,
          real.email, linha.opId, linha.etapaId
        )
        salvarTempoRefLocalStorage(chaveLS, {
          modoTempo: linha.modoTempo,
          referenciaSelecionadaId: linha.referenciaSelecionadaId,
        })
      }
    },

    // ── RESOLVERS DE TEMPO ────────────────────────────────
    listarReferenciasOp(opId) {
      if (!opId) return []
      const resultado = []
      const etapasOp = this.etapasPorOp.get(opId) || []

      for (const func of this.funcionariosDia) {
        const temLinhaOp = (func.linhas || []).some(l => l.opId === opId)
        if (!temLinhaOp) continue

        for (const etapa of etapasOp) {
          const refs = etapa?.tempo_referencia || etapa?.etapa?.tempo_referencia || []
          if (!Array.isArray(refs)) continue

          const ref = escolherReferenciaPorData(refs, {
            funcionarioId: func.email,
            dataConsulta: this.dataSelecionada,
          })
          if (!ref) continue

          const t = tempoDaReferencia(ref)
          if (!t) continue

          resultado.push({
            funcionarioId: func.email,
            nomeFunc: func.nome || func.email,
            foto: func.foto || null,
            etapaId: etapa.id_da_funcao || etapa.etapa?.id_da_funcao,
            etapaDescricao: etapa.descricao || etapa.etapa?.descricao || '—',
            tempo: t,
            tempoPadrao: Number(etapa.tempo_padrao ?? etapa.etapa?.tempo_padrao ?? 0),
          })
        }
      }

      return resultado
    },

    resolverTempoPadrao(linha) {
      if (linha?.tempoPadrao) return Number(linha.tempoPadrao)
      const etapa = this.buscarEtapa(linha?.etapaId, linha?.opId)
      return Number(etapa?.tempo_padrao ?? etapa?.etapa?.tempo_padrao ?? 0)
    },

    resolverTempoReferencia(funcionario, linha) {
      const etapa = this.buscarEtapa(linha?.etapaId, linha?.opId)
      const refs = etapa?.tempo_referencia || etapa?.etapa?.tempo_referencia || []

      if (!Array.isArray(refs) || !funcionario?.email) return null

      const ref = refs.find(r => r && r.id_funcionario === funcionario.email)
      if (!ref) return null

      const t = Number(ref.tempo_minutos ?? ref.tempo_por_peca ?? 0)
      return t > 0 ? t : null
    },

    resolverTempoEfetivoReferencia(funcionario, linha) {
      let tempoReferencia = null
      if (linha?.modoTempo === 'referencia' && linha?.referenciaSelecionadaId) {
        const etapa = this.buscarEtapa(linha.etapaId, linha.opId)
        const refs = etapa?.tempo_referencia || etapa?.etapa?.tempo_referencia || []
        let ref = null
        if (Array.isArray(refs)) {
          // Buscar primeiro pelo ID do registro no banco (r.id).
          // IMPORTANTE: Usar == em vez de === porque $event.target.value
          // retorna STRING, mas r.id do banco é NUMBER. Ex: "42" !== 42,
          // mas "42" == 42. Sem isso, a referência nunca é encontrada e
          // o sistema cai no tempo da ficha, ignorando a escolha do usuário.
          const refIdBusca = String(linha.referenciaSelecionadaId)
          ref = refs.find(r => r && String(r.id) === refIdBusca)
          // Fallback: buscar por id_funcionario (compatibilidade com
          // dados antigos que salvaram o email em referenciaSelecionadaId).
          if (!ref) ref = refs.find(r => r && r.id_funcionario === linha.referenciaSelecionadaId)
        }
        const t = Number(ref?.tempo_minutos ?? ref?.tempo_por_peca ?? 0)
        if (t > 0) tempoReferencia = t
      }
      return resolverSam({ tempoReferencia, tempoPadrao: this.resolverTempoPadrao(linha) })
    },

    minutosDisponiveisDia() {
      const horasManha = this.gerarSequenciaHoras(this.configHorarios.manha.inicio, this.configHorarios.manha.fim)
      const horasTarde = this.gerarSequenciaHoras(this.configHorarios.tarde.inicio, this.configHorarios.tarde.fim)
      return (horasManha.length + horasTarde.length) * 60
    },

    // ── AUSÊNCIA ──────────────────────────────────────────
    calcularMinutosAusenciaFuncionario(funcionario) {
      const ausencia = funcionario?.ausencia
      if (!ausencia) return 0
      if (ausencia.tipo === 'dia_inteiro') return this.minutosDisponiveisDia()

      if (ausencia.tipo === 'parcial' && Array.isArray(ausencia.periodos)) {
        const janelas = [
          [this.horaParaMinutos(this.configHorarios.manha.inicio), this.horaParaMinutos(this.configHorarios.manha.fim)],
          [this.horaParaMinutos(this.configHorarios.tarde.inicio), this.horaParaMinutos(this.configHorarios.tarde.fim)],
        ]

        let total = 0
        for (const periodo of ausencia.periodos) {
          if (!periodo?.inicio || !periodo?.fim) continue
          const pIni = this.horaParaMinutos(periodo.inicio)
          const pFim = this.horaParaMinutos(periodo.fim)

          for (const [jIni, jFim] of janelas) {
            const ini = Math.max(pIni, jIni)
            const fim = Math.min(pFim, jFim)
            if (fim > ini) total += (fim - ini)
          }
        }
        return total
      }

      return 0
    },

    calcularMinutosDisponiveisFuncionario(funcionario) {
      const totalPadrao = this.minutosDisponiveisDia()
      const ausente = this.calcularMinutosAusenciaFuncionario(funcionario)
      return Math.max(totalPadrao - ausente, 0)
    },

    funcionarioAusenteDiaInteiro(funcionario) {
      const real = funcionario?._funcRef || funcionario
      return real?.ausencia?.tipo === 'dia_inteiro'
    },

    horaBloqueadaPorAusencia(funcionario, hora) {
      const real = funcionario?._funcRef || funcionario
      const ausencia = real?.ausencia
      if (!ausencia) return false
      if (ausencia.tipo === 'dia_inteiro') return true
      if (ausencia.tipo !== 'parcial' || !Array.isArray(ausencia.periodos)) return false

      const slotIni = this.horaParaMinutos(hora)
      const slotFim = slotIni + 60

      return ausencia.periodos.some(p => {
        if (!p?.inicio || !p?.fim) return false
        const pIni = this.horaParaMinutos(p.inicio)
        const pFim = this.horaParaMinutos(p.fim)
        return pIni < slotFim && pFim > slotIni
      })
    },

    formatarPeriodosAusencia(periodos) {
      if (!Array.isArray(periodos) || !periodos.length) return ''
      return periodos.map(p => `${p.inicio}–${p.fim}`).join(', ')
    },

    // ── MODAL DE AUSÊNCIA ─────────────────────────────────
    novoPeriodoAusencia() {
      return { _uid: Date.now() + Math.random(), inicio: '08:00', fim: '09:00' }
    },

    abrirModalAusencia(funcionario) {
      const real = funcionario._funcRef || funcionario
      const existente = real.ausencia

      this.modalAusencia.funcionario = real
      this.modalAusencia.form = existente
        ? {
          tipo: existente.tipo,
          periodos: existente.tipo === 'parcial' && existente.periodos?.length
            ? existente.periodos.map(p => ({ _uid: Date.now() + Math.random(), inicio: p.inicio, fim: p.fim }))
            : [this.novoPeriodoAusencia()],
          observacao: existente.observacao || '',
        }
        : { tipo: 'dia_inteiro', periodos: [this.novoPeriodoAusencia()], observacao: '' }

      this.modalAusencia.aberto = true
    },

    fecharModalAusencia() {
      this.modalAusencia.aberto = false
      this.modalAusencia.funcionario = null
    },

    adicionarPeriodoAusencia() {
      this.modalAusencia.form.periodos.push(this.novoPeriodoAusencia())
    },

    removerPeriodoAusencia(idx) {
      this.modalAusencia.form.periodos.splice(idx, 1)
    },

    salvarAusencia() {
      const funcionario = this.modalAusencia.funcionario
      if (!funcionario) return

      const form = this.modalAusencia.form
      const observacao = (form.observacao || '').trim()

      if (form.tipo === 'parcial') {
        const periodosValidos = form.periodos
          .filter(p => p.inicio && p.fim && this.horaParaMinutos(p.fim) > this.horaParaMinutos(p.inicio))
          .map(p => ({ inicio: p.inicio, fim: p.fim }))

        if (!periodosValidos.length) {
          Swal.fire('Atenção', 'Informe ao menos um período válido de ausência (fim depois do início).', 'warning')
          return
        }

        funcionario.ausencia = { tipo: 'parcial', periodos: periodosValidos, observacao }
      } else {
        funcionario.ausencia = { tipo: 'dia_inteiro', periodos: [], observacao }
      }

      this.registrarFaltaNoBackend(funcionario)
      this.fecharModalAusencia()
      this.ordenarFuncionariosPorAusencia()
      this.salvarMetaDia()
    },

    removerAusencia() {
      const funcionario = this.modalAusencia.funcionario
      if (funcionario) {
        funcionario.ausencia = null
        this.registrarFaltaNoBackend(funcionario)
      }
      this.fecharModalAusencia()
      this.ordenarFuncionariosPorAusencia()
      this.salvarMetaDia()
    },

    async registrarFaltaNoBackend(funcionario) {
      const ausencia = funcionario.ausencia
      const token = this.store.pegar_token
      const base = {
        funcionarioId: funcionario.email,
        data: this.dataSelecionada,
        estabelecimento: this.store.pegar_usuario?.cnpj || '',
        usuarioResponsavel: this.store.pegar_usuario?.email || '',
      }

      try {
        if (!ausencia) {
          await api.post('/registrar-faltas', {
            ...base,
            tipo: null,
            removida: true,
          }, {
            headers: { Authorization: token }
          })
          return
        }

        if (ausencia.tipo === 'dia_inteiro') {
          await api.post('/registrar-faltas', {
            ...base,
            tipo: 'dia_inteiro',
            observacao: ausencia.observacao || '',
          }, {
            headers: { Authorization: token }
          })
          return
        }

        if (ausencia.tipo === 'parcial' && Array.isArray(ausencia.periodos) && ausencia.periodos.length) {
          await Promise.all(ausencia.periodos.map(periodo => api.post('/registrar-faltas', {
            ...base,
            tipo: 'parcial',
            horarioInicial: periodo.inicio,
            horarioFinal: periodo.fim,
            observacao: ausencia.observacao || '',
          }, {
            headers: { Authorization: token }
          })))
        }
      } catch (err) {
        console.error('Erro ao registrar falta no backend', err)
        Swal.fire(
          'Atenção',
          'A ausência foi aplicada na tela, mas não foi possível confirmar o registro no servidor. Verifique a conexão e tente novamente.',
          'warning'
        )
      }
    },

    async getFaltas() {
      const dataRequisitada = this.dataSelecionada
      try {
        const token = this.store.pegar_token
        const response = await api.get('/buscar-faltas', {
          params: { data: dataRequisitada },
          headers: { Authorization: token }
        })

        if (dataRequisitada !== this.dataSelecionada) return

        const faltas = Array.isArray(response.data)
          ? response.data
          : (response.data?.faltas || [])

        this.aplicarFaltasAosFuncionarios(faltas)
      } catch (err) {
        console.error('Erro ao buscar faltas do backend', err)
      }
    },

    normalizarHora(valor) {
      if (!valor) return null
      if (/^\d{2}:\d{2}$/.test(valor)) return valor
      const d = new Date(valor)
      if (isNaN(d.getTime())) return null
      const h = String(d.getUTCHours()).padStart(2, '0')
      const m = String(d.getUTCMinutes()).padStart(2, '0')
      return `${h}:${m}`
    },

    mapearFaltasParaAusencia(registros) {
      if (!registros || !registros.length) return null

      const diaInteiro = registros.find(r => r.tipo === 'dia_inteiro')
      if (diaInteiro) {
        return {
          tipo: 'dia_inteiro',
          periodos: [],
          observacao: diaInteiro.observacao || '',
        }
      }

      const parciais = registros
        .filter(r => r.tipo === 'parcial' && r.horarioInicial && r.horarioFinal)
        .map(r => ({
          inicio: this.normalizarHora(r.horarioInicial),
          fim: this.normalizarHora(r.horarioFinal),
        }))
        .filter(p => p.inicio && p.fim)

      if (!parciais.length) return null

      return {
        tipo: 'parcial',
        periodos: parciais,
        observacao: registros.map(r => r.observacao).filter(Boolean).join(' | '),
      }
    },

    aplicarFaltasAosFuncionarios(faltas) {
      const porFuncionario = new Map()
      for (const registro of faltas || []) {
        if (!registro?.funcionarioId) continue
        if (!porFuncionario.has(registro.funcionarioId)) {
          porFuncionario.set(registro.funcionarioId, [])
        }
        porFuncionario.get(registro.funcionarioId).push(registro)
      }

      for (const funcionario of this.funcionariosDia) {
        const registros = porFuncionario.get(funcionario.email)
        funcionario.ausencia = this.mapearFaltasParaAusencia(registros)
      }

      this.ordenarFuncionariosPorAusencia()
    },

    ordenarFuncionariosPorAusencia() {
      this.funcionariosDia = [...this.funcionariosDia].sort((a, b) => {
        const ausenteA = a.ausencia?.tipo === 'dia_inteiro' ? 1 : 0
        const ausenteB = b.ausencia?.tipo === 'dia_inteiro' ? 1 : 0
        return ausenteA - ausenteB
      })
    },

    aplicarDadosDaEtapa(funcionarioReal, linha) {
      const etapa = this.buscarEtapa(linha.etapaId, linha.opId)

      linha.tempoPadrao = Number(
        etapa?.tempo_padrao ?? etapa?.etapa?.tempo_padrao ?? linha.tempoPadrao ?? 0
      )
      linha.descricao = etapa?.descricao || etapa?.etapa?.descricao || linha.descricao || ''
      linha.opId = linha.opId || etapa?.id_da_op || null

      // 1. Tentar restaurar do localStorage (escolha manual do usuário)
      const chaveLS = funcionarioReal?.email
        ? chaveLocalStorageTempoRef(
          this.store.pegar_usuario?.cnpj || '', this.dataSelecionada,
          funcionarioReal.email, linha.opId, linha.etapaId
        )
        : null
      const escolhaSalva = chaveLS ? lerTempoRefLocalStorage(chaveLS) : null
      if (escolhaSalva && (escolhaSalva.modoTempo === 'padrao' || escolhaSalva.referenciaSelecionadaId)) {
        linha.modoTempo = escolhaSalva.modoTempo
        linha.referenciaSelecionadaId = escolhaSalva.referenciaSelecionadaId || null
        return
      }

      // 2. Auto-detectar: se o profissional tem referência, usar 'referencia'
      // Buscar o r.id (PK do banco) da referência encontrada para que
      // o select possa identificar corretamente qual option selecionar.
      const refs = etapa?.tempo_referencia || etapa?.etapa?.tempo_referencia || []
      const refEncontrada = escolherReferenciaPorData(refs, {
        funcionarioId: funcionarioReal?.email,
        dataConsulta: this.dataSelecionada,
      })
      if (refEncontrada) {
        linha.modoTempo = 'referencia'
        // Usar r.id (PK) para que o <select> encontre a option correta.
        // Fallback para r.id_funcionario (compatibilidade).
        linha.referenciaSelecionadaId = refEncontrada.id ?? (refEncontrada.id_funcionario || null)
      } else {
        linha.modoTempo = 'padrao'
        linha.referenciaSelecionadaId = null
      }
    },

    onAlterarEtapa(funcionario, linha) {
      const real = funcionario?._funcRef || funcionario
      this.aplicarDadosDaEtapa(real, linha)
      this.salvarMetaDia()
    },

    buscarEtapa(etapaId, opId = null) {
      if (!etapaId) return null

      const candidatas = this.etapasPorId.get(etapaId) || []

      if (opId != null && opId !== '') {
        const match = candidatas.find(e => e.id_da_op === opId)
        if (match) return match
      }

      return candidatas[0] || null
    },

    // ── PERSISTÊNCIA OFFLINE DE ETAPA SELECIONADA (IndexedDB) ────
    chaveEtapaOffline(funcionarioId, opId, etapaId, data, tipo) {
      return `${funcionarioId}::${data}::${opId || 'sem-op'}::${etapaId}::${tipo}`
    },

    async persistirEtapaOffline(funcionario, linha) {
      if (!linha?.etapaId) return
      const real = funcionario?._funcRef || funcionario
      const chave = this.chaveEtapaOffline(real.email, linha.opId, linha.etapaId, this.dataSelecionada, linha.tipo)
      await etapaOfflineStore.salvar({
        chave,
        funcionarioId: real.email,
        opId: linha.opId || null,
        etapaId: linha.etapaId,
        data: this.dataSelecionada,
        tipoLinha: linha.tipo,
        horarioSelecao: new Date().toISOString(),
      })
    },

    async removerEtapaOfflineSeExistir(funcionario, opId, etapaId, tipo) {
      if (!etapaId) return
      const real = funcionario?._funcRef || funcionario
      const chave = this.chaveEtapaOffline(real.email, opId, etapaId, this.dataSelecionada, tipo)
      await etapaOfflineStore.remover(chave)
    },

    async restaurarEtapasOffline() {
      const registros = await etapaOfflineStore.listarPorData(this.dataSelecionada)
      if (!registros.length) return

      let algumaRestauracao = false

      for (const registro of registros) {
        const funcionario = this.funcionariosDia.find(f => f.email === registro.funcionarioId)
        if (!funcionario) continue

        const jaConfirmadoPeloServidor = (funcionario.linhas || []).some(
          l => l.etapaId === registro.etapaId && (l.opId || null) === (registro.opId || null)
        )
        if (jaConfirmadoPeloServidor) {
          await etapaOfflineStore.remover(registro.chave)
          continue
        }

        let linha = null
        if (registro.tipoLinha === 'principal') {
          linha = (funcionario.linhas || []).find(l => l.tipo === 'principal' && !l.etapaId)
        }
        if (!linha) {
          linha = this.novaLinha('extra')
          if (!Array.isArray(funcionario.linhas)) funcionario.linhas = []
          funcionario.linhas.push(linha)
        }

        linha.etapaId = registro.etapaId
        linha.opId = registro.opId
        this.aplicarDadosDaEtapa(funcionario, linha)
        algumaRestauracao = true
      }

      if (algumaRestauracao) {
        this.salvarMetaDia()
      }
    },

    // ── ETAPA FINAL ──────────────────────────────────────
    isEtapaFinal(linha) {
      if (!linha?.descricao) return false
      const d = linha.descricao.toLowerCase()
      if (d.includes('revisão intermediaria') || d.includes('revisao intermediaria')) return false
      return (
        d.includes('final') || d.includes('revisão final') || d.includes('revisao final') ||
        d.includes('revisão') || d.includes('revisao') ||
        d.includes('acabamento') || d.includes('qualidade') || d.includes('revisar peça pronta')
      )
    },

    // ── TOTAIS ────────────────────────────────────────────
    calcularTotalLinha(linha, funcionario = null) {
      if (!linha?.registros) return 0
      return Object.entries(linha.registros).reduce((s, [hora, r]) => {
        if (funcionario && this.horaBloqueadaPorAusencia(funcionario, hora)) return s
        return s + Number(r?.quantidade || 0)
      }, 0)
    },

    calcularTempoUtilizadoLinha(linha, funcionario = null) {
      if (!linha?.registros) return 0
      return Object.entries(linha.registros).reduce((soma, [hora, reg]) => {
        if (funcionario && this.horaBloqueadaPorAusencia(funcionario, hora)) return soma
        if (reg && reg.quantidade > 0) return soma + (reg.tempoProduzido || 60)
        return soma
      }, 0)
    },

    calcularEficienciaLinhaPadrao(linha, funcionario = null) {
      const sam = this.resolverTempoPadrao(linha)
      let producaoPonderada = 0
      let tempoTrabalhado = 0
      for (const [hora, reg] of Object.entries(linha?.registros || {})) {
        if (funcionario && this.horaBloqueadaPorAusencia(funcionario, hora)) continue
        if (reg && reg.quantidade > 0) {
          producaoPonderada += reg.quantidade * sam
          tempoTrabalhado += reg.tempoProduzido || 60
        }
      }
      return calcularEficiencia({ producaoPonderada, funcionarios: 1, tempoTrabalhado })
    },

    calcularEficienciaLinhaReferencia(funcionario, linha) {
      const sam = this.resolverTempoEfetivoReferencia(funcionario, linha)
      let producaoPonderada = 0
      let tempoTrabalhado = 0
      for (const [hora, reg] of Object.entries(linha?.registros || {})) {
        if (this.horaBloqueadaPorAusencia(funcionario, hora)) continue
        if (reg && reg.quantidade > 0) {
          producaoPonderada += reg.quantidade * sam
          tempoTrabalhado += reg.tempoProduzido || 60
        }
      }
      return calcularEficiencia({ producaoPonderada, funcionarios: 1, tempoTrabalhado })
    },

    /**
     * Decide QUAL eficiência usar para fins de alerta, conforme o tipo de
     * empresa — sem duplicar nenhuma fórmula: delega 100% para os métodos
     * que já existem (calcularEficienciaLinhaPadrao / calcularEficienciaLinhaReferencia).
     *   - "fabrica"        -> sempre Ficha (tempo padrão da etapa).
     *   - qualquer outro tipo -> Referência do funcionário, com fallback
     *     automático para o padrão já embutido em resolverTempoEfetivoReferencia.
     */
    calcularEficienciaLinhaComRegra(linha, funcionario) {
      const tipoDeProducao = this.store.pegar_usuario?.tipo_de_producao
      return tipoDeProducao === 'fabrica'
        ? this.calcularEficienciaLinhaPadrao(linha, funcionario)
        : this.calcularEficienciaLinhaReferencia(funcionario, linha)
    },

    /**
     * Tempo efetivo (SAM ou Referência, conforme a mesma regra acima) —
     * usado só para exibir "peças/h esperadas" no alerta.
     */
    resolverTempoEfetivoComRegra(funcionario, linha) {
      const tipoDeProducao = this.store.pegar_usuario?.tipo_de_producao
      return tipoDeProducao === 'fabrica'
        ? this.resolverTempoPadrao(linha)
        : this.resolverTempoEfetivoReferencia(funcionario, linha)
    },

    /** Métricas de peças/hora para o texto do alerta — reaproveita calcularTotalLinha/calcularTempoUtilizadoLinha. */
    calcularPecasPorHoraLinha(linha, funcionario) {
      const tempoEfetivo = this.resolverTempoEfetivoComRegra(funcionario, linha)
      const esperadoPorHora = tempoEfetivo ? Math.round((60 / tempoEfetivo) * 10) / 10 : 0

      const quantidade = this.calcularTotalLinha(linha, funcionario)
      const tempoTrabalhado = this.calcularTempoUtilizadoLinha(linha, funcionario)
      const registradoPorHora = tempoTrabalhado ? Math.round((quantidade / tempoTrabalhado) * 60 * 10) / 10 : 0

      return { esperadoPorHora, registradoPorHora, quantidade, tempoTrabalhado }
    },

    calcularTotalFuncionario(funcionario) {
      if (!Array.isArray(funcionario?.linhas)) return 0
      return funcionario.linhas.reduce((soma, linha) => {
        if (!this.isEtapaFinal(linha)) return soma
        return soma + this.calcularTotalLinha(linha, funcionario)
      }, 0)
    },

    calcularTotalGeral() {
      return this.funcionariosDia.reduce((s, f) => s + this.calcularTotalFuncionario(f), 0)
    },

    calcularTotalOp(pecaId) {
      if (!pecaId) return 0
      const grupo = this.mapaProducaoPorOp.get(pecaId)
      if (!grupo) return 0
      let total = 0
      for (const func of grupo.funcionarios) {
        for (const linha of func.linhas || []) {
          if (!this.isEtapaFinal(linha)) continue
          total += this.calcularTotalLinha(linha, func)
        }
      }
      return total
    },

    calcularFuncionariosOp(opId) {
      if (!opId) return 0
      const grupo = this.mapaProducaoPorOp.get(opId)
      return grupo ? grupo.funcionarios.length : 0
    },

    calcularEficienciaOpPadrao(opId) {
      if (!opId) return 0
      const grupo = this.mapaProducaoPorOp.get(opId)
      if (!grupo) return 0
      let producaoPonderada = 0
      let tempoDisponivelTotal = 0

      for (const func of grupo.funcionarios) {
        const real = func._funcRef || func
        tempoDisponivelTotal += this.calcularMinutosDisponiveisFuncionario(real)

        for (const linha of func.linhas || []) {
          const sam = this.resolverTempoPadrao(linha)
          for (const [hora, reg] of Object.entries(linha.registros || {})) {
            if (this.horaBloqueadaPorAusencia(func, hora)) continue
            if (reg && reg.quantidade > 0) {
              producaoPonderada += reg.quantidade * sam
            }
          }
        }
      }

      if (!tempoDisponivelTotal) return 0
      return calcularEficiencia({ producaoPonderada, funcionarios: 1, tempoTrabalhado: tempoDisponivelTotal })
    },

    calcularCapacidadeOpPadrao(opId) {
      if (!opId) return 0
      const grupo = this.mapaProducaoPorOp.get(opId)
      if (!grupo) return 0
      let capacidade = 0
      let tempoRegistrado = 0

      for (const func of grupo.funcionarios) {
        for (const linha of func.linhas || []) {
          const sam = this.resolverTempoPadrao(linha)
          if (!sam) continue
          for (const [hora, reg] of Object.entries(linha.registros || {})) {
            if (this.horaBloqueadaPorAusencia(func, hora)) continue
            if (reg && reg.quantidade > 0) {
              const minutos = reg.tempoProduzido || 60
              capacidade += calcularCapacidade({ funcionarios: 1, tempoTrabalhado: minutos, sam })
              tempoRegistrado += minutos
            }
          }
        }
      }

      if (!tempoRegistrado) {
        for (const func of grupo.funcionarios) {
          const real = func._funcRef || func
          for (const linha of func.linhas || []) {
            const sam = this.resolverTempoPadrao(linha) || 60
            const minutosDisponiveis = this.calcularMinutosDisponiveisFuncionario(real)
            capacidade += calcularCapacidade({ funcionarios: 1, tempoTrabalhado: minutosDisponiveis, sam })
          }
        }
      }

      return capacidade
    },

    calcularEficienciaFuncionarioPadrao(funcionario) {
      if (!funcionario?.linhas?.length) return 0
      const real = funcionario._funcRef || funcionario
      let producaoPonderada = 0

      for (const linha of funcionario.linhas) {
        if (!linha?.registros) continue
        const sam = this.resolverTempoPadrao(linha)
        for (const [hora, reg] of Object.entries(linha.registros)) {
          if (this.horaBloqueadaPorAusencia(funcionario, hora)) continue
          if (reg && reg.quantidade > 0) {
            producaoPonderada += reg.quantidade * sam
          }
        }
      }

      const tempoDisponivel = this.calcularMinutosDisponiveisFuncionario(real)
      if (!tempoDisponivel) return 0
      return calcularEficiencia({ producaoPonderada, funcionarios: 1, tempoTrabalhado: tempoDisponivel })
    },

    calcularEficienciaRegistroPadrao(quantidade, tempoProduzido, linha) {
      const sam = this.resolverTempoPadrao(linha)
      if (!quantidade || !tempoProduzido || !sam) return 0
      return calcularEficiencia({
        producaoPonderada: quantidade * sam,
        funcionarios: 1,
        tempoTrabalhado: tempoProduzido,
      })
    },

    calcularEficienciaOpReferencia(opId) {
      if (!opId) return 0
      const grupo = this.mapaProducaoPorOp.get(opId)
      if (!grupo) return 0
      let producaoPonderada = 0
      let tempoDisponivelTotal = 0

      for (const func of grupo.funcionarios) {
        const real = func._funcRef || func
        tempoDisponivelTotal += this.calcularMinutosDisponiveisFuncionario(real)

        for (const linha of func.linhas || []) {
          const sam = this.resolverTempoEfetivoReferencia(func, linha)
          for (const [hora, reg] of Object.entries(linha.registros || {})) {
            if (this.horaBloqueadaPorAusencia(func, hora)) continue
            if (reg && reg.quantidade > 0) {
              producaoPonderada += reg.quantidade * sam
            }
          }
        }
      }

      if (!tempoDisponivelTotal) return 0
      return calcularEficiencia({ producaoPonderada, funcionarios: 1, tempoTrabalhado: tempoDisponivelTotal })
    },

    calcularCapacidadeOpReferencia(opId) {
      if (!opId) return 0
      const grupo = this.mapaProducaoPorOp.get(opId)
      if (!grupo) return 0
      let capacidade = 0
      let tempoRegistrado = 0

      for (const func of grupo.funcionarios) {
        for (const linha of func.linhas || []) {
          const sam = this.resolverTempoEfetivoReferencia(func, linha)
          if (!sam) continue
          for (const [hora, reg] of Object.entries(linha.registros || {})) {
            if (this.horaBloqueadaPorAusencia(func, hora)) continue
            if (reg && reg.quantidade > 0) {
              const minutos = reg.tempoProduzido || 60
              capacidade += calcularCapacidade({ funcionarios: 1, tempoTrabalhado: minutos, sam })
              tempoRegistrado += minutos
            }
          }
        }
      }

      if (!tempoRegistrado) {
        for (const func of grupo.funcionarios) {
          const real = func._funcRef || func
          for (const linha of func.linhas || []) {
            const sam = this.resolverTempoEfetivoReferencia(func, linha) || 60
            const minutosDisponiveis = this.calcularMinutosDisponiveisFuncionario(real)
            capacidade += calcularCapacidade({ funcionarios: 1, tempoTrabalhado: minutosDisponiveis, sam })
          }
        }
      }

      return capacidade
    },

    calcularEficienciaFuncionarioReferencia(funcionario) {
      if (!funcionario?.linhas?.length) return 0
      const real = funcionario._funcRef || funcionario
      let producaoPonderada = 0

      for (const linha of funcionario.linhas) {
        if (!linha?.registros) continue
        const sam = this.resolverTempoEfetivoReferencia(funcionario, linha)
        for (const [hora, reg] of Object.entries(linha.registros)) {
          if (this.horaBloqueadaPorAusencia(funcionario, hora)) continue
          if (reg && reg.quantidade > 0) {
            producaoPonderada += reg.quantidade * sam
          }
        }
      }

      const tempoDisponivel = this.calcularMinutosDisponiveisFuncionario(real)
      if (!tempoDisponivel) return 0
      return calcularEficiencia({ producaoPonderada, funcionarios: 1, tempoTrabalhado: tempoDisponivel })
    },

    calcularEficienciaRegistroReferencia(quantidade, tempoProduzido, linha, funcionario) {
      const sam = this.resolverTempoEfetivoReferencia(funcionario, linha)
      if (!quantidade || !tempoProduzido || !sam) return 0
      return calcularEficiencia({
        producaoPonderada: quantidade * sam,
        funcionarios: 1,
        tempoTrabalhado: tempoProduzido,
      })
    },

    // ── UTILITÁRIOS ───────────────────────────────────────
    /**
     * Regra ÚNICA de cor dos indicadores de eficiência da tela:
     *   verde  -> dentro/acima da referência (>= LIMIAR_EFICIENCIA_REFERENCIA,
     *             o mesmo limiar do monitor de produtividade)
     *   vermelho -> abaixo da referência (destaque discreto)
     *   neutro  -> sem produção calculada
     */
    getEficClass(pct) {
      if (!pct || pct <= 0) return ''
      return pct >= LIMIAR_EFICIENCIA_REFERENCIA ? 'efic-alta' : 'efic-baixa'
    },

    // ══════════════════════════════════════════════════════════════
    // SISTEMA DE SALVAMENTO POR CÉLULA (autosave + botão manual +
    // localStorage anti-perda + indicador visual)
    // ══════════════════════════════════════════════════════════════

    /** Chave única por funcionário + OP + etapa + hora — identifica "esta célula". */
    chaveCelula(funcionarioId, opId, etapaId, hora) {
      return `${funcionarioId}::${opId || 'sem-op'}::${etapaId}::${hora}`
    },

    /** Lê o status atual da célula (para o :class da bolinha e o botão de salvar). */
    statusCelula(funcionario, linha, hora) {
      if (!linha?.etapaId) return 'idle'
      const real = funcionario._funcRef || funcionario
      const chave = this.chaveCelula(real.email, linha.opId, linha.etapaId, hora)
      return this.saveStatus[chave]?.status || 'idle'
    },

    celulaTemAlteracaoPendente(funcionario, linha, hora) {
      const status = this.statusCelula(funcionario, linha, hora)
      return status === 'pending' || status === 'error'
    },

    tituloStatusCelula(funcionario, linha, hora) {
      switch (this.statusCelula(funcionario, linha, hora)) {
        case 'pending': return 'Alterado — ainda não salvo'
        case 'saving': return 'Salvando…'
        case 'saved': return 'Salvo com sucesso'
        case 'error': return 'Erro ao salvar — clique em 💾 para tentar de novo'
        default: return ''
      }
    },

    definirStatusCelula(chave, status, extra = {}) {
      const atual = this.saveStatus[chave] || { status: 'idle', lastSavedAt: null }
      // Reatribuição do objeto inteiro (em vez de mutar campo a campo)
      // garante que o Vue 3 detecte a mudança mesmo em chaves novas.
      this.saveStatus = { ...this.saveStatus, [chave]: { ...atual, status, ...extra } }
    },

    /**
     * Handler do @input dos campos de quantidade e minutos. Roda a CADA
     * tecla digitada:
     *   1. marca a célula como 'pending' (bolinha cinza) imediatamente;
     *   2. grava IMEDIATAMENTE no localStorage (sem debounce nenhum —
     *      esta é a camada anti-perda; mesmo que a aba feche no
     *      milissegundo seguinte, o valor já está gravado em disco);
     *   3. agenda o salvamento de verdade na API com debounce de 500ms.
     */
    onDigitarCelula(funcionario, linha, hora) {
      if (!linha?.etapaId) return
      const real = funcionario._funcRef || funcionario
      const chave = this.chaveCelula(real.email, linha.opId, linha.etapaId, hora)
      const registro = linha.registros[hora]
      if (!registro) return

      this.definirStatusCelula(chave, 'pending')

      const chaveLS = chaveLocalStorageProducao(
        this.store.pegar_usuario?.cnpj || '', this.dataSelecionada,
        real.email, linha.opId, linha.etapaId, hora
      )
      salvarPendenteLocalStorage(chaveLS, {
        quantidade: registro.quantidade || 0,
        tempoProduzido: registro.tempoProduzido || 60,
        tipoLinha: linha.tipo,
      })

      this.agendarSalvamentoCelula(funcionario, linha, hora)
    },

    /** Debounce de 500ms POR CÉLULA (um timer independente por chave). */
    agendarSalvamentoCelula(funcionario, linha, hora) {
      const real = funcionario._funcRef || funcionario
      const chave = this.chaveCelula(real.email, linha.opId, linha.etapaId, hora)

      if (this._debounceTimers.has(chave)) {
        clearTimeout(this._debounceTimers.get(chave))
      }
      const timer = setTimeout(() => {
        this._debounceTimers.delete(chave)
        this.salvarCelula(funcionario, linha, hora)
      }, 500)
      this._debounceTimers.set(chave, timer)
    },

    /**
     * Executa o salvamento de verdade na API (via socket, método já
     * existente 'salvar-producao' com ack). Evita duas requisições
     * simultâneas para a MESMA célula: se já existe uma em andamento,
     * apenas marca que deve reenviar assim que a atual terminar (o
     * reenvio pega os valores mais recentes, então nenhuma digitação
     * feita durante o envio é perdida).
     */
    async salvarCelula(funcionario, linha, hora) {
      if (!linha?.etapaId) return
      const real = funcionario._funcRef || funcionario
      const chave = this.chaveCelula(real.email, linha.opId, linha.etapaId, hora)
      const registro = linha.registros[hora]
      if (!registro) return

      if (this._emVoo.has(chave)) {
        this._reenviarAposSalvar.add(chave)
        return
      }

      this._emVoo.add(chave)
      this.definirStatusCelula(chave, 'saving')

      const payload = {
        funcionarioId: real.email,
        etapaId: linha.etapaId,
        opId: linha.opId || null,
        quantidade: registro.quantidade || 0,
        hora,
        data: this.dataSelecionada,
        estabelecimento: this.store.pegar_usuario.cnpj,
        tipoRegistro: linha.tipo,
        tempoProduzido: registro.tempoProduzido || 60,
      }

      try {
        if (!socket.connected) {
          throw new Error('Sem conexão com o servidor no momento.')
        }
        console.log('Enviando para o backend o registro de célula', payload)
        const resposta = await this.emitirComAck('salvar-producao', payload, 8000)
        console.log('Resposta do backend ao salvar célula', resposta)
        if (!resposta || resposta.sucesso === false) {
          throw new Error(resposta?.mensagem || 'Servidor recusou o registro.')
        }

        this.definirStatusCelula(chave, 'saved', { lastSavedAt: Date.now() })

        const chaveLS = chaveLocalStorageProducao(
          this.store.pegar_usuario?.cnpj || '', this.dataSelecionada,
          real.email, linha.opId, linha.etapaId, hora
        )
        removerPendenteLocalStorage(chaveLS)
        this.definirStatusCelula(chave, 'saved', { lastSavedAt: Date.now() })

        // ── Monitor de produtividade (Ficha na fábrica, Referência+fallback nos demais) ──
        const eficiencia = this.calcularEficienciaLinhaComRegra(linha, real)
        const { esperadoPorHora, registradoPorHora, quantidade, tempoTrabalhado } =
          this.calcularPecasPorHoraLinha(linha, real)

        this.monitorProdutividade.verificar({
          funcionario: real,
          linha,
          eficiencia,
          esperadoPorHora,
          registradoPorHora,
          quantidade,
          tempoTrabalhado,
          opNome: this.nomeDaOp(linha.opId),
          empresaId: this.store.pegar_usuario?.cnpj,
          tempoPadrao: this.resolverTempoPadrao(linha),
          tempoReferencia: this.store.pegar_usuario?.tipo_de_producao === 'fabrica'
            ? null
            : this.resolverTempoEfetivoReferencia(real, linha),
          token: this.store.pegar_token,
        })
        // Bolinha verde visível por pelo menos 2s, depois some (volta a 'idle').
        setTimeout(() => {
          if (this.saveStatus[chave]?.status === 'saved') {
            this.definirStatusCelula(chave, 'idle')
          }
        }, 2000)
      } catch (err) {
        this.definirStatusCelula(chave, 'error')
      } finally {
        this._emVoo.delete(chave)
        if (this._reenviarAposSalvar.has(chave)) {
          this._reenviarAposSalvar.delete(chave)
          this.salvarCelula(funcionario, linha, hora)
        }
      }
    },

    /** Botão "Salvar" manual: cancela o debounce pendente e salva na hora. */
    async salvarCelulaManual(funcionario, linha, hora) {
      const real = funcionario._funcRef || funcionario
      const chave = this.chaveCelula(real.email, linha.opId, linha.etapaId, hora)
      if (this._debounceTimers.has(chave)) {
        clearTimeout(this._debounceTimers.get(chave))
        this._debounceTimers.delete(chave)
      }
      await this.salvarCelula(funcionario, linha, hora)
    },

    /**
     * Restaura, ao carregar a tela (ou trocar de data), qualquer valor
     * que ficou pendente no localStorage e que o backend não confirmou
     * — por exemplo, a aba foi fechada com a conexão caída no meio do
     * debounce. Precisa rodar DEPOIS que funcionariosDia/linhas já
     * refletem o que veio do servidor (para não sobrescrever a etapa
     * errada) e depois de restaurarEtapasOffline() (para que a linha já
     * exista quando a etapa só tinha sido escolhida offline).
     */
    restaurarPendentesLocalStorage() {
      const estabelecimento = this.store.pegar_usuario?.cnpj || ''
      const chavesLS = listarChavesPendentesLocalStorage(estabelecimento, this.dataSelecionada)
      if (!chavesLS.length) return

      for (const chaveLS of chavesLS) {
        const partes = chaveLS.split('::')
        // formato: prefixo::estabelecimento::data::funcionarioId::opId::etapaId::hora
        const funcionarioId = partes[3]
        const opIdBruto = partes[4]
        const etapaId = partes[5]
        const hora = partes[6]
        const opId = opIdBruto === 'sem-op' ? null : opIdBruto

        const valor = lerPendenteLocalStorage(chaveLS)
        if (!valor) continue

        const funcionario = this.funcionariosDia.find(f => f.email === funcionarioId)
        if (!funcionario) continue

        const linha = (funcionario.linhas || []).find(
          l => l.etapaId === etapaId && (l.opId || null) === opId
        )
        if (!linha || !linha.registros[hora]) continue

        linha.registros[hora].quantidade = valor.quantidade
        linha.registros[hora].tempoProduzido = valor.tempoProduzido

        const chave = this.chaveCelula(funcionarioId, opId, etapaId, hora)
        this.definirStatusCelula(chave, 'pending')

        // Já tenta salvar de novo agora que a tela está aberta.
        this.agendarSalvamentoCelula(funcionario, linha, hora)
      }
    },

    /** Reenvia toda célula ainda pendente/erro — usado por reconexão, evento 'online', intervalo periódico e visibilitychange. */
    retentarCelulasPendentes() {
      for (const [chave, info] of Object.entries(this.saveStatus)) {
        if (info.status !== 'pending' && info.status !== 'error') continue

        const partes = chave.split('::')
        const funcionarioId = partes[0]
        const opIdBruto = partes[1]
        const etapaId = partes[2]
        const hora = partes[3]
        const opId = opIdBruto === 'sem-op' ? null : opIdBruto

        const funcionario = this.funcionariosDia.find(f => f.email === funcionarioId)
        if (!funcionario) continue
        const linha = (funcionario.linhas || []).find(l => l.etapaId === etapaId && (l.opId || null) === opId)
        if (!linha) continue

        this.salvarCelula(funcionario, linha, hora)
      }
    },

    /**
     * Dispara IMEDIATAMENTE (sem esperar o debounce de 500ms) o
     * salvamento de qualquer célula que ainda tenha um timer agendado —
     * chamado antes de trocar de data, ao ficar em segundo plano
     * (visibilitychange) e no beforeunload.
     */
    flushAntesDeTrocarTela() {
      if (typeof this.salvarMetaDia.flush === 'function') {
        this.salvarMetaDia.flush()
      }

      for (const [chave, timer] of this._debounceTimers.entries()) {
        clearTimeout(timer)
        this._debounceTimers.delete(chave)

        const partes = chave.split('::')
        const funcionarioId = partes[0]
        const opIdBruto = partes[1]
        const etapaId = partes[2]
        const hora = partes[3]
        const opId = opIdBruto === 'sem-op' ? null : opIdBruto

        const funcionario = this.funcionariosDia.find(f => f.email === funcionarioId)
        if (!funcionario) continue
        const linha = (funcionario.linhas || []).find(l => l.etapaId === etapaId && (l.opId || null) === opId)
        if (!linha) continue

        this.salvarCelula(funcionario, linha, hora)
      }
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

    // ── META ──────────────────────────────────────────────
    salvarMetaDia: debounce(function () {
      const pecasAtivas = this.opsAtivasComPeca
      const pecasExtras = this.opsExtras.filter(op => op.pecaId)
      const temAusenciaRegistrada = this.funcionariosDia.some(f => f.ausencia)
      if (!pecasAtivas.length && !pecasExtras.length && !temAusenciaRegistrada) return

      socket.emit('salvar-meta-dia', {
        estabelecimento: this.store.pegar_usuario.cnpj,
        usuario: this.store.pegar_usuario.email,
        data: this.dataSelecionada,
        pecas: [
          ...pecasAtivas.map(op => ({ id_da_op: op.pecaId, meta: op.metaDia })),
          ...pecasExtras.map(op => ({ id_da_op: op.pecaId, meta: op.metaDia })),
        ],
        funcionarios: this.funcionariosDia.map(func => ({
          funcionarioId: func.email,
          ausencia: func.ausencia || null,
          linhas: (func.linhas || []).map(linha => ({
            tipo: linha.tipo,
            etapaId: linha.etapaId,
            opId: linha.opId,
          })),
        })),
      })
    }, 500),

    // ── BUSCAR META ───────────────────────────────────────
    async buscarMetaDia() {
      await this.aguardarConexaoSocket()

      const dataDaRequisicao = this.dataSelecionada
      this.ultimaBuscaId = (this.ultimaBuscaId || 0) + 1
      const buscaId = this.ultimaBuscaId
      this.carregandoMeta = true

      const trocouDeData = this.dataCarregada !== null && this.dataCarregada !== dataDaRequisicao
      if (trocouDeData) {
        this.opsAtivas = [this.novaOpSetup()]
        this.opsExtras = []
        this.inicializarFuncionarios()
      }

      setTimeout(() => {
        if (buscaId === this.ultimaBuscaId) this.carregandoMeta = false
      }, 8000)

      socket.emit(
        'buscar-meta-dia',
        { estabelecimento: this.store.pegar_usuario.cnpj, data: dataDaRequisicao },
        response => {
          if (buscaId !== this.ultimaBuscaId || dataDaRequisicao !== this.dataSelecionada) return

          this.carregandoMeta = false
          if (!response?.sucesso) return

          const meta = response.metaDia

          const alocacoesPendentes = new Map()
          if (this.dataCarregada === dataDaRequisicao) {
            for (const func of this.funcionariosDia) {
              const pendentes = (func.linhas || []).filter(l => l.etapaId)
              if (pendentes.length) {
                alocacoesPendentes.set(func.email, pendentes.map(l => ({
                  etapaId: l.etapaId,
                  opId: l.opId || null,
                })))
              }
            }
          }

          if (!meta) {
            this.opsAtivas = [this.novaOpSetup()]
            this.opsExtras = []
            this.inicializarFuncionarios()
            this.reaplicarAlocacoesPendentes(alocacoesPendentes)
            this.sincronizarOpsExtras()
            this.dataCarregada = dataDaRequisicao
            this.restaurarEtapasOffline().then(() => this.restaurarPendentesLocalStorage())
            this.getFaltas()
            return
          }

          if (meta.pecas?.length) {
            const idsEmAndamento = new Set(this.pecas.map(p => p.id_da_op))
            const ativas = []
            const historicas = []

            for (const p of meta.pecas) {
              const item = {
                _uid: Date.now() + Math.random(),
                pecaId: p.id_da_op,
                metaDia: p.meta || 0,
              }
              if (idsEmAndamento.has(p.id_da_op)) ativas.push(item)
              else historicas.push({ ...item, historica: true })
            }

            this.opsAtivas = ativas.length ? ativas : [this.novaOpSetup()]
            this.opsExtras = historicas
          } else {
            this.opsAtivas = [this.novaOpSetup()]
            this.opsExtras = []
          }

          // Capturar modoTempo/referenciaSelecionadaId de TODAS as linhas
          // ANTES de inicializarFuncionarios() destruir as linhas antigas.
          const modoTempoGlobal = new Map()
          for (const func of (this.funcionariosDia || [])) {
            for (const l of (func.linhas || [])) {
              if (l.etapaId && (l.modoTempo === 'referencia' || l.referenciaSelecionadaId)) {
                const chave = `${func.email}::${l.etapaId}::${l.opId || 'sem-op'}`
                modoTempoGlobal.set(chave, {
                  modoTempo: l.modoTempo,
                  referenciaSelecionadaId: l.referenciaSelecionadaId,
                })
              }
            }
          }

          this.inicializarFuncionarios()

          for (const metaFunc of meta.funcionarios || []) {
            const funcionario = this.funcionariosDia.find(f => f.email === metaFunc.funcionarioId)
            if (!funcionario) continue

            funcionario.ausencia = metaFunc.ausencia || null

            const linhas = []

            for (const producao of metaFunc.producoes || []) {
              const etapaId = producao.id_da_funcao
              let opId = producao.id_da_op || null
              if (!opId) {
                const etapaInferida = this.buscarEtapa(etapaId)
                opId = etapaInferida?.id_da_op || null
              }

              let linha = linhas.find(l => l.etapaId === etapaId && l.opId === opId)

              if (!linha) {
                linha = this.novaLinha(linhas.length === 0 ? 'principal' : 'extra')
                linha.etapaId = etapaId
                linha.descricao = producao.producao_etapa?.descricao || ''
                linha.tempoPadrao = producao.producao_etapa?.tempo_padrao || 0
                linha.opId = opId

                // Restaurar modoTempo da linha anterior (capturado ANTES de inicializarFuncionarios)
                const chaveAntiga = `${funcionario.email}::${etapaId}::${opId || 'sem-op'}`
                const anterior = modoTempoGlobal.get(chaveAntiga)
                if (anterior) {
                  linha.modoTempo = anterior.modoTempo
                  linha.referenciaSelecionadaId = anterior.referenciaSelecionadaId
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

            funcionario.linhas = linhas.length ? linhas : [this.novaLinha('principal')]

            for (const linha of funcionario.linhas) {
              if (linha.etapaId) this.aplicarDadosDaEtapa(funcionario, linha)
            }
          }

          this.reaplicarAlocacoesPendentes(alocacoesPendentes)
          this.sincronizarOpsExtras()
          this.dataCarregada = dataDaRequisicao

          this.restaurarEtapasOffline().then(() => this.restaurarPendentesLocalStorage())

          this.getFaltas()
        }
      )
    },

    reaplicarAlocacoesPendentes(mapaAlocacoes) {
      for (const [email, alocacoes] of mapaAlocacoes) {
        const funcionario = this.funcionariosDia.find(f => f.email === email)
        if (!funcionario) continue
        if (!Array.isArray(funcionario.linhas)) funcionario.linhas = []

        for (const alocacao of alocacoes) {
          const jaExiste = funcionario.linhas.some(
            l => l.etapaId === alocacao.etapaId && (l.opId || null) === alocacao.opId
          )
          if (jaExiste) continue

          const linha = this.novaLinha('extra')
          linha.etapaId = alocacao.etapaId
          linha.opId = alocacao.opId
          this.aplicarDadosDaEtapa(funcionario, linha)
          funcionario.linhas.push(linha)
        }

        if (funcionario.linhas.length > 1) {
          const comEtapa = funcionario.linhas.filter(l => l.etapaId)
          if (comEtapa.length) funcionario.linhas = comEtapa
        }
      }
    },

    montarDadosParaPdf() {
      const idsAtivos = new Set(this.opsAtivasComPeca.map(op => op.pecaId))
      const idsHistoricos = new Set()
      for (const func of this.funcionariosDia) {
        for (const linha of func.linhas || []) {
          if (linha.opId && !idsAtivos.has(linha.opId)) idsHistoricos.add(linha.opId)
        }
      }
      const opsHistoricas = [...idsHistoricos].map(id => ({ pecaId: id, metaDia: 0 }))

      return {
        emitidoEm: new Date(),
        estabelecimento: this.store.pegar_usuario?.cnpj || '',
        dataProducao: this.dataSelecionada,
        turno: this.rotuloTurno,
        ausencias: this.funcionariosDia
          .filter(f => f.ausencia)
          .map(f => ({
            nome: f.nome || f.email,
            tipo: f.ausencia.tipo,
            periodos: f.ausencia.periodos || [],
            observacao: f.ausencia.observacao || '',
          })),
        ops: [
          ...this.opsAtivasComPeca.map(op => this.montarDadosDaOpParaPdf(op)),
          ...opsHistoricas.map(op => this.montarDadosDaOpParaPdf(op)),
        ],
      }
    },

    montarDadosDaOpParaPdf(op) {
      const peca = this.pecasTodas.find(p => p.id_da_op === op.pecaId)
      const grupo = this.mapaProducaoPorOp.get(op.pecaId)

      const funcionariosDaOp = []
      const etapasMapa = new Map()

      for (const func of (grupo?.funcionarios || [])) {
        for (const linha of func.linhas || []) {
          if (!linha.etapaId) continue

          const etapa = this.buscarEtapa(linha.etapaId, linha.opId)
          const descricaoEtapa = etapa?.descricao || etapa?.etapa?.descricao || linha.descricao || '—'
          const tempoUtilizado = this.calcularTempoUtilizadoLinha(linha, func)
          const producaoLinha = this.calcularTotalLinha(linha, func)

          funcionariosDaOp.push({
            nome: func.nome || func.email,
            etapa: descricaoEtapa,
            tempoUtilizado,
            tempoReferencia: this.resolverTempoEfetivoReferencia(func, linha),
            producaoRealizada: producaoLinha,
            eficienciaFicha: this.calcularEficienciaLinhaPadrao(linha, func),
            eficienciaReferencia: this.calcularEficienciaLinhaReferencia(func, linha),
            ausencia: func.ausencia ? { tipo: func.ausencia.tipo, periodos: func.ausencia.periodos || [], observacao: func.ausencia.observacao || '' } : null,
          })

          if (!etapasMapa.has(linha.etapaId)) {
            etapasMapa.set(linha.etapaId, {
              descricao: descricaoEtapa,
              tempoPadrao: this.resolverTempoPadrao(linha),
              funcionarios: new Set(),
              producao: 0,
              tempoUtilizado: 0,
            })
          }

          const infoEtapa = etapasMapa.get(linha.etapaId)
          infoEtapa.funcionarios.add(func.email)
          infoEtapa.producao += producaoLinha
          infoEtapa.tempoUtilizado += tempoUtilizado
        }
      }

      const funcionariosAlocados = grupo ? grupo.funcionarios.length : 0

      let tempoDisponivel = 0
      for (const func of (grupo?.funcionarios || [])) {
        const real = func._funcRef || func
        tempoDisponivel += this.calcularMinutosDisponiveisFuncionario(real)
      }

      const tempoUtilizadoTotal = funcionariosDaOp.reduce((soma, f) => soma + f.tempoUtilizado, 0)

      const dadosOp = {
        numero: op.pecaId,
        titulo: this.nomeDaOp(op.pecaId),
        meta: op.metaDia || 0,
        producaoRealizada: this.calcularTotalOp(op.pecaId),
        funcionariosAlocados,
        eficienciaFicha: this.calcularEficienciaOpPadrao(op.pecaId),
        eficienciaReferencia: this.calcularEficienciaOpReferencia(op.pecaId),
        capacidadeFicha: this.calcularCapacidadeOpPadrao(op.pecaId),
        capacidadeReferencia: this.calcularCapacidadeOpReferencia(op.pecaId),
        tempoDisponivel,
        tempoUtilizado: tempoUtilizadoTotal,
        ocupacao: tempoDisponivel ? Math.round((tempoUtilizadoTotal / tempoDisponivel) * 100) : 0,
        funcionarios: funcionariosDaOp,
        etapas: [...etapasMapa.values()].map(e => ({
          descricao: e.descricao,
          tempoPadrao: e.tempoPadrao,
          tempoUtilizado: e.tempoUtilizado,
          funcionariosAlocados: e.funcionarios.size,
          producao: e.producao,
          eficiencia: e.tempoUtilizado
            ? Math.round(((e.producao * e.tempoPadrao) / e.tempoUtilizado) * 100)
            : 0,
        })),
      }

      if (peca?.cliente) dadosOp.cliente = peca.cliente
      if (peca?.observacoes) dadosOp.observacoes = peca.observacoes

      return dadosOp
    },

    async onClicarGerarPdf() {
      if (this.gerandoPdf) return
      this.gerandoPdf = true
      try {
        await gerarPdfProducao(this.montarDadosParaPdf())
      } catch (err) {
        console.error(err)
        Swal.fire('Erro', 'Não foi possível gerar o PDF da produção.', 'error')
      } finally {
        this.gerandoPdf = false
      }
    },

    async onClicarGerarExcel() {
      if (this.gerandoExcel) return
      this.gerandoExcel = true
      try {
        await exportarMapaProducaoExcel({
          funcionariosDia: this.funcionariosDia,
          horas: this.horasVisiveis,
          resolverTempoEfetivoReferencia: this.resolverTempoEfetivoReferencia.bind(this),
          calcularEficiencia,
          horaBloqueadaPorAusencia: this.horaBloqueadaPorAusencia.bind(this),
          dataProducao: this.dataSelecionada,
          turno: this.rotuloTurno,
          empresa: this.store.pegar_usuario?.cnpj || '',
        })
        Swal.fire('Sucesso', 'Mapa de produção exportado com sucesso!', 'success')
      } catch (err) {
        console.error(err)
        Swal.fire('Erro', 'Não foi possível gerar o Excel da produção.', 'error')
      } finally {
        this.gerandoExcel = false
      }
    },
  },
}
</script>
<style scoped>
* {
  box-sizing: border-box;
}

.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
  width: 100%;
  min-height: 100vh;
}

.page-section {
  padding: 1.2rem;
}

/* ── HEADER ─────────────────────────────────────────── */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-gerar-pdf {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 16px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #0d6632, #118a43);
  color: white;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(13, 102, 50, .2);
  transition: .2s;
  font-family: inherit;
}

.btn-gerar-pdf:hover:not(:disabled) {
  filter: brightness(1.05);
}

.btn-gerar-pdf:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.btn-gerar-excel {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 16px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #0d5a3b, #1a8a50);
  color: white;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(13, 102, 50, .2);
  transition: .2s;
  font-family: inherit;
}

.btn-gerar-excel:hover:not(:disabled) {
  filter: brightness(1.05);
}

.btn-gerar-excel:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.socket-status {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  background: #ffecec;
  color: #d23b3b;
}

.socket-status.online {
  background: #e7f8ef;
  color: #0d7a3f;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.fila-pendentes-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  background: #fff4cf;
  color: #8a6a00;
  white-space: nowrap;
}

.date-input {
  height: 38px;
  border-radius: 12px;
  border: 1px solid #dceee3;
  padding: 0 14px;
  font-family: inherit;
  background: white;
}

.data-loading {
  font-size: 13px;
  font-weight: 700;
  color: #0d6632;
  animation: pulseFade 1.1s ease-in-out infinite;
}

@keyframes pulseFade {

  0%,
  100% {
    opacity: .5;
  }

  50% {
    opacity: 1;
  }
}

/* ── SETUP CARD ─────────────────────────────────────── */
.setup-card {
  background: linear-gradient(135deg, #ffffff, #f8fcf9);
  border-radius: 24px;
  border: 1px solid #dceee3;
  padding: 1.4rem;
  margin-bottom: 1rem;
  box-shadow: 0 4px 18px rgba(0, 0, 0, .03);
}

.setup-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.4rem;
  flex-wrap: wrap;
}

.setup-title {
  display: flex;
  align-items: center;
  gap: 14px;
}

.setup-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0d6632, #118a43);
  color: white;
  font-size: 22px;
  box-shadow: 0 8px 20px rgba(13, 102, 50, .2);
}

.setup-title h3 {
  margin: 0;
  font-size: 23px;
  color: #052e14;
}

.setup-title span {
  font-size: 14px;
  color: #72907e;
}

.horario-select-sm {
  height: 42px;
  border-radius: 12px;
  border: 1px solid #dceee3;
  background: white;
  padding: 0 10px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  color: #052e14;
  transition: .2s;
}

.horario-select-sm:focus {
  border-color: #118a43;
  box-shadow: 0 0 0 4px rgba(17, 138, 67, .08);
  outline: none;
}

.horario-ate {
  font-size: 13px;
  font-weight: 700;
  color: #648673;
}

/* ── OPs SECTION ────────────────────────────────────── */
.ops-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ops-list {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.op-card {
  flex: 1 1 340px;
  background: white;
  border: 1px solid #dceee3;
  border-radius: 18px;
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: .75rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, .03);
}

.op-card--historico {
  background: linear-gradient(135deg, #fefcf6, #faf8f2);
  border-color: #e6ddc0;
}

.op-badge--historico {
  color: #7a6a2e;
  background: #f0ead2;
}

.op-fixa {
  height: 46px;
  display: flex;
  align-items: center;
  border-radius: 13px;
  border: 1px dashed #dceee3;
  background: #f7faf8;
  padding: 0 12px;
  font-size: 14px;
  font-weight: 700;
  color: #4c6656;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.op-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.op-badge {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .06em;
  color: #0d6632;
  background: #e7f8ef;
  border-radius: 8px;
  padding: 3px 10px;
  text-transform: uppercase;
}

.btn-remove-op {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 8px;
  background: #ffecec;
  color: #d93b3b;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  line-height: 1;
}

.op-fields {
  display: grid;
  grid-template-columns: 1fr 180px 120px;
  gap: .75rem;
  align-items: end;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 12px;
  font-weight: 700;
  color: #648673;
  padding-left: 2px;
}

.field select {
  height: 46px;
  border-radius: 13px;
  border: 1px solid #dceee3;
  background: white;
  padding: 0 12px;
  font-family: inherit;
  font-size: 14px;
  width: 100%;
  transition: .2s;
}

.field select:focus {
  border-color: #118a43;
  box-shadow: 0 0 0 4px rgba(17, 138, 67, .08);
  outline: none;
}

.meta-input-wrap {
  height: 46px;
  border-radius: 13px;
  border: 1px solid #dceee3;
  background: white;
  display: flex;
  align-items: center;
  overflow: hidden;
  transition: .2s;
}

.meta-input-wrap:focus-within {
  border-color: #118a43;
  box-shadow: 0 0 0 4px rgba(17, 138, 67, .08);
}

.meta-input {
  flex: 1;
  height: 100%;
  border: none;
  background: transparent;
  padding: 0 12px;
  font-size: 17px;
  font-weight: 700;
  color: #052e14;
}

.meta-input:focus {
  outline: none;
}

.meta-suffix {
  height: 100%;
  padding: 0 12px;
  display: flex;
  align-items: center;
  background: #f2f8f4;
  border-left: 1px solid #e2eee7;
  color: #5d8470;
  font-size: 12px;
  font-weight: 700;
}

.total-box {
  height: 46px;
  border-radius: 13px;
  background: linear-gradient(135deg, #0d6632, #118a43);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 23px;
  font-weight: 800;
  box-shadow: 0 6px 16px rgba(13, 102, 50, .2);
}

.meta-progress {
  margin-top: .25rem;
  padding: .85rem 1rem;
  border-radius: 14px;
  background: linear-gradient(135deg, #f7fcf9, #edf7f1);
  border: 1px solid #dceee3;
}

.meta-progress-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: #537664;
}

.meta-progress-top strong {
  color: #052e14;
  font-size: 14px;
}

.progress-bar {
  width: 100%;
  height: 12px;
  border-radius: 999px;
  background: #dceee3;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0d6632, #20b15a);
  transition: width .3s ease;
}

.progress-footer {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #648673;
}

.btn-add-op {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 18px;
  border: 2px dashed #b2d9c0;
  border-radius: 13px;
  background: transparent;
  color: #0d6632;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: .2s;
  font-family: inherit;
}

.btn-add-op:hover {
  background: #edf7f1;
  border-color: #0d6632;
}

.btn-add-op span {
  font-size: 18px;
  line-height: 1;
}

.total-geral-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e6f2ea;
  font-size: 14px;
  font-weight: 700;
  color: #537664;
}

.total-box-sm {
  min-width: 80px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0d6632, #118a43);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  font-weight: 800;
  box-shadow: 0 4px 12px rgba(13, 102, 50, .2);
  padding: 0 16px;
}

/* ── BARRA DE HORAS ─────────────────────────────────── */
.horas-toolbar {
  background: white;
  border: 1px solid #dceee3;
  border-radius: 16px;
  padding: .8rem 1rem;
  margin-bottom: .75rem;
  display: flex;
  flex-direction: column;
  gap: .6rem;
}

.horas-toolbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .6rem 1rem;
}

.seg {
  display: inline-flex;
  gap: 4px;
  background: #edf7f1;
  padding: 4px;
  border-radius: 12px;
}

.seg-btn {
  height: 36px;
  padding: 0 14px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: #5d8470;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
}

.seg-btn:hover {
  background: rgba(13, 102, 50, .08);
}

.seg-btn.active {
  background: linear-gradient(135deg, #0d6632, #118a43);
  color: white;
}

.janelas summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  color: #5d8470;
  list-style: none;
}

.janelas summary::-webkit-details-marker {
  display: none;
}

.janelas summary::before {
  content: '⚙ ';
}

.janelas-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.janela-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #052e14;
}

.janela-row strong {
  width: 52px;
}

.horas-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.hora-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid #dceee3;
  background: #f7faf8;
  color: #93a89c;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  text-decoration: line-through;
}

.hora-chip.is-on {
  background: white;
  color: #052e14;
  border-color: #118a43;
  text-decoration: none;
}

.hora-chip-mark {
  font-size: 11px;
  color: #9aa5a1;
}

.hora-chip.is-filled .hora-chip-mark {
  color: #1fae57;
}

.horas-vazio {
  margin: 0;
  font-size: 13px;
  color: #8a6a00;
}

/* ── TABELA: só a região das horas rola ─────────────── */
.table-wrapper {
  --w-func: 200px;
  --w-etapa: 250px;
  --w-hora: 124px;
  --w-total: 72px;
  --w-efic: 132px;
  background: white;
  border-radius: 20px;
  border: 1px solid #e3f0e7;
  overflow: hidden;
}

.table-scroll {
  /* Rolagem vertical é responsabilidade da PÁGINA (sem max-height):
   * ao expandir o detalhamento, o conteúdo simplesmente cresce para
   * baixo — sem scroll interno. Só o eixo horizontal rola aqui. */
  overflow: auto;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
}

.apontamento-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  min-width: calc(var(--w-func) + var(--w-etapa) + var(--n-horas, 10) * var(--w-hora) + var(--w-total) + var(--w-efic));
}

.col-func {
  width: var(--w-func);
}

.col-etapa {
  width: var(--w-etapa);
}

.col-hora {
  width: var(--w-hora);
}

.col-total {
  width: var(--w-total);
}

.col-efic-dia {
  width: var(--w-efic);
}

.apontamento-table thead th {
  position: sticky;
  top: 0;
  z-index: 3;
  height: 46px;
  padding: 0 8px;
  text-align: left;
  background: #0d6632;
  color: white;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.apontamento-table td {
  padding: 8px;
  vertical-align: middle;
  border-bottom: 1px solid #edf6f1;
  background: white;
}

.apontamento-table tr.linha-extra td {
  background: #f9fcfa;
}

.apontamento-table tr.primeira-linha td {
  border-top: 2px solid #e3f0e7;
}

/* colunas fixas */
.sticky-l,
.sticky-r {
  position: sticky;
  z-index: 2;
}

.apontamento-table thead th.sticky-l,
.apontamento-table thead th.sticky-r {
  z-index: 5;
}

.sticky-l-1 {
  left: 0;
}

.sticky-l-2 {
  left: var(--w-func);
}

.sticky-r-1 {
  right: 0;
}

.sticky-r-2 {
  right: var(--w-efic);
}

.sticky-edge-l {
  box-shadow: 6px 0 8px -6px rgba(5, 46, 20, .25);
}

.sticky-edge-r {
  box-shadow: -6px 0 8px -6px rgba(5, 46, 20, .25);
}

.hora-th {
  text-align: center !important;
}

.th-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-left: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, .35);
}

.th-dot--ok {
  background: #7ee2a3;
}

.func-col {
  vertical-align: top !important;
}

.func-info {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.func-info img {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  object-fit: cover;
  flex-shrink: 0;
}

.func-info-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  justify-content: center;
  min-width: 0;
}

.func-nome {
  font-size: 13px;
  font-weight: 700;
  text-align: justify;
  color: #052e14;
}

.func-resumo {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #648673;
}

.func-resumo span+span {
  padding-left: 8px;
  border-left: 1px solid #dceee3;
}

.extra-tag {
  font-size: 14px;
  font-weight: 700;
  color: #5d8972;
}

.etapa-col {
  vertical-align: top !important;
}

.etapa-wrap {
  display: flex;
  align-items: center;
  gap: 5px;
}

.etapa-select {
  flex: 1;
  height: 34px;
  border-radius: 9px;
  border: 1px solid #dceee3;
  padding: 0 8px;
  font-size: 12px;
  font-family: inherit;
  background: white;
  min-width: 0;
}

.etapa-select:focus {
  outline: none;
  border-color: #118a43;
}

.btn-add-linha,
.btn-remove-linha {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 7px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-add-linha {
  background: #0d6632;
  color: white;
}

.btn-remove-linha {
  background: #ffecec;
  color: #d93b3b;
}

.tempo-toggle-wrap {
  margin-top: 5px;
}

.tempo-select {
  height: 22px;
  border-radius: 7px;
  border: 1px solid #d4e8dc;
  background: #f2faf5;
  color: #052e14;
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;
  padding: 0 6px;
  cursor: pointer;
  width: 100%;
  max-width: 100%;
  transition: border-color .15s;
}

.tempo-select:focus {
  outline: none;
  border-color: #0d6632;
}

/* célula de hora */
.hora-td {
  padding: 6px !important;
  text-align: center;
}

.hora-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.qtd-input-wrap {
  position: relative;
  display: inline-block;
}

.hora-input {
  width: 76px;
  height: 44px;
  border-radius: 10px;
  border: 2px solid #cfe5d7;
  background: #fff;
  text-align: center;
  font-size: 18px;
  font-weight: 800;
  font-family: inherit;
  color: #052e14;
  transition: .15s;
}

.hora-input::placeholder {
  color: #c3d4ca;
}

.hora-input:focus {
  outline: none;
  border-color: #118a43;
  box-shadow: 0 0 0 4px rgba(17, 138, 67, .12);
}

.hora-input.tem-producao {
  background: #f0faf4;
  border-color: #118a43;
}

.hora-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
  color: #8ca998;
}

.tempo-wrap {
  display: flex;
  align-items: center;
  gap: 2px;
}

.min-input {
  width: 34px;
  height: 20px;
  border-radius: 6px;
  border: 1px solid #ddebe3;
  text-align: center;
  font-size: 11px;
  background: #f8fcf9;
  color: #69907b;
}

.min-label {
  font-size: 10px;
  color: #8ca998;
}

.hora-tr {
  font-weight: 700;
  white-space: nowrap;
}

.hora-ef {
  min-width: 64px;
  height: 20px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
  line-height: 20px;
  color: #9aa5a1;
  background: #f4f4f4;
}

/* estados de eficiência (cores comunicam estado)
 *   alta  -> dentro/acima da referência (verde suave)
 *   baixa -> abaixo da referência (vermelho discreto + borda interna) */
.efic-alta {
  background: #d4f1df;
  color: #0c6b34;
}

.efic-media {
  background: #fff4cf;
  color: #8a6a00;
}

.efic-baixa {
  background: #ffe8e8;
  color: #b12626;
  box-shadow: inset 0 0 0 1px rgba(177, 38, 38, .28);
}

/*
  Bolinha de status de salvamento — pequena, discreta, sobreposta no
  canto superior direito do input de quantidade.
    cinza  -> alterado, ainda não salvo (pending)
    amarela -> salvando
    verde  -> salvo com sucesso
    vermelha -> erro ao salvar
*/
.save-dot {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1.5px solid white;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
  pointer-events: none;
  z-index: 2;
}

.save-dot--pending {
  background: #9aa5a1;
}

.save-dot--saving {
  background: #f0b400;
  animation: pulseFade 0.9s ease-in-out infinite;
}

.save-dot--saved {
  background: #1fae57;
}

.save-dot--error {
  background: #e13b3b;
}

.btn-salvar-celula {
  position: absolute;
  top: -2px;
  left: 0;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 7px;
  background: #fff4cf;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}

.hora-ausente-marker {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f4f4f4;
  border: 1px dashed #d5d5d5;
  color: #9a9a9a;
  font-size: 11px;
  font-weight: 700;
}

/* total e eficiência do dia */
.total-col {
  text-align: center;
  font-size: 15px;
  font-weight: 800;
  color: #052e14;
}

.efic-dia-col {
  text-align: left;
  vertical-align: middle !important;
}

.efic-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 70px;
  height: 32px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 800;
  padding: 0 12px;
}

.efic-dia-sub {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  font-weight: 600;
  color: #648673;
}

/* ── MÓDULOS DE OP ──────────────────────────────────── */
.ops-modulos-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.op-module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  background: linear-gradient(90deg, #e7f8ef, #f8fcf9);
  border: 1px solid #dceee3;
  border-radius: 14px;
  padding: 14px 20px;
  margin-top: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .02);
}

.op-module-header--single {
  background: #f8fcf9;
  border-color: #e3f0e7;
  box-shadow: none;
}

.op-module-header--empty {
  background: #fff8e1;
  border-color: #f0d97a;
}

.op-module-badge {
  font-size: 14px;
  font-weight: 800;
  color: #0d6632;
  letter-spacing: .02em;
}

.op-module-header--empty .op-module-badge {
  color: #8a6a00;
}

/* ── OP HISTÓRICA (fora da lista de OPs ativas) ────── */
.op-module-header--historico {
  background: linear-gradient(90deg, #f4f1e8, #faf8f2);
  border-color: #e6ddc0;
}

.op-module-header--historico .op-module-badge {
  color: #7a6a2e;
}

.op-module-badge-tag {
  display: inline-block;
  margin-left: 8px;
  font-size: 10px;
  font-weight: 700;
  color: #9a8a4a;
  background: #f0ead2;
  border-radius: 6px;
  padding: 2px 8px;
  letter-spacing: normal;
  text-transform: none;
}

.etapa-fixa {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  height: 34px;
  justify-content: center;
  border-radius: 9px;
  border: 1px dashed #dceee3;
  background: #f7faf8;
  padding: 2px 8px;
  min-width: 0;
}

.etapa-fixa-label {
  font-size: 12px;
  font-weight: 700;
  color: #4c6656;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.etapa-fixa-tag {
  font-size: 9px;
  font-weight: 700;
  color: #93a89c;
}

/* ── FUNCIONÁRIO AUSENTE ────────────────────────────── */
.linha-ausente {
  opacity: .55;
}

.btn-ausencia-toggle {
  align-self: flex-start;
  border: none;
  background: #f2f8f4;
  color: #5d8470;
  font-size: 10px;
  font-weight: 700;
  border-radius: 7px;
  padding: 3px 8px;
  cursor: pointer;
  font-family: inherit;
  transition: .2s;
}

.btn-ausencia-toggle:hover {
  background: #e7f0ea;
}

.ausencia-tag {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  width: fit-content;
  max-width: 170px;
  font-size: 9px;
  font-weight: 700;
  line-height: 1.35;
  border-radius: 5px;
  padding: 2px 6px;
  gap: 2px;
}

.ausencia-tag--dia_inteiro {
  background: #f3e6e6;
  color: #9a4b4b;
}

.ausencia-tag--parcial {
  background: #fff4d6;
  color: #8a6a00;
}

.ausencia-tag-minutos {
  font-size: 9px;
  font-weight: 600;
  opacity: 0.75;
  white-space: nowrap;
}

/* ── MODAL DE AUSÊNCIA ──────────────────────────────── */
.ausencia-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 46, 20, .35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.ausencia-modal {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, .2);
  overflow: hidden;
}

.ausencia-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.3rem;
  background: linear-gradient(135deg, #0d6632, #118a43);
  color: white;
}

.ausencia-modal-header h3 {
  margin: 0;
  font-size: 16px;
}

.ausencia-modal-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, .15);
  color: white;
  font-size: 16px;
  cursor: pointer;
  line-height: 1;
}

.ausencia-modal-body {
  padding: 1.2rem 1.3rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ausencia-tipo-switch {
  display: flex;
  gap: 6px;
  background: #edf7f1;
  padding: 5px;
  border-radius: 13px;
}

.ausencia-tipo-btn {
  flex: 1;
  height: 40px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #6d8c79;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: .2s;
  font-family: inherit;
}

.ausencia-tipo-btn.active {
  background: linear-gradient(135deg, #0d6632, #118a43);
  color: white;
  box-shadow: 0 4px 12px rgba(13, 102, 50, .2);
}

.ausencia-periodos {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ausencia-periodo-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ausencia-hora-select {
  flex: 1;
  height: 40px;
  border-radius: 10px;
  border: 1px solid #dceee3;
  padding: 0 10px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  color: #052e14;
}

.ausencia-periodo-ate {
  font-size: 12px;
  font-weight: 700;
  color: #648673;
}

.btn-remove-periodo {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: #ffecec;
  color: #d93b3b;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
}

.btn-add-periodo {
  align-self: flex-start;
  border: 2px dashed #b2d9c0;
  border-radius: 10px;
  background: transparent;
  color: #0d6632;
  height: 36px;
  padding: 0 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}

.ausencia-dia-inteiro-aviso {
  margin: 0;
  font-size: 13px;
  color: #648673;
  line-height: 1.5;
  background: #f7fcf9;
  border: 1px solid #dceee3;
  border-radius: 12px;
  padding: .8rem 1rem;
}

.ausencia-campo-observacao {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ausencia-campo-observacao label {
  font-size: 12px;
  font-weight: 700;
  color: #648673;
  padding-left: 2px;
}

.ausencia-observacao-input {
  border-radius: 12px;
  border: 1px solid #dceee3;
  background: white;
  padding: .6rem .8rem;
  font-family: inherit;
  font-size: 13px;
  color: #052e14;
  resize: vertical;
  min-height: 44px;
  transition: .2s;
}

.ausencia-observacao-input:focus {
  outline: none;
  border-color: #118a43;
  box-shadow: 0 0 0 4px rgba(17, 138, 67, .08);
}

.ausencia-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 1rem 1.3rem;
  border-top: 1px solid #edf6f1;
}

.ausencia-modal-footer-right {
  display: flex;
  gap: 8px;
}

.btn-ausencia-remover {
  border: none;
  background: transparent;
  color: #d93b3b;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}

.btn-ausencia-cancelar {
  height: 40px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1px solid #dceee3;
  background: white;
  color: #537664;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}

.btn-ausencia-salvar {
  height: 40px;
  padding: 0 18px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #0d6632, #118a43);
  color: white;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  box-shadow: 0 4px 12px rgba(13, 102, 50, .2);
}

/* ── DETALHAMENTO DO PROFISSIONAL (painel expansível na tabela) ── */
.btn-detalhar {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  max-width: 100%;
  text-align: left;
  border: 1px solid #dceee3;
  background: white;
  color: #0d6632;
  font-size: 10px;
  font-weight: 800;
  border-radius: 7px;
  padding: 4px 8px;
  cursor: pointer;
  font-family: inherit;
  transition: .15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-detalhar:hover {
  background: #e7f8ef;
  border-color: #118a43;
}

.func-resumo-tr {
  color: #0d6632 !important;
  font-weight: 800 !important;
}

.linha-detalhe-td {
  padding: 0 !important;
  background: #f7fcf9;
  border-bottom: 2px solid #dceee3;
}

.detalhe-panel {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detalhe-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.detalhe-titulo {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #0d6632;
}

.detalhe-contexto {
  font-size: 12px;
  font-weight: 600;
  color: #648673;
}

.detalhe-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

.detalhe-card {
  background: white;
  border: 1px solid #dceee3;
  border-radius: 12px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.detalhe-card-label {
  font-size: 9.5px;
  font-weight: 800;
  color: #648673;
  text-transform: uppercase;
  letter-spacing: .05em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.detalhe-card-valor {
  font-size: 16px;
  font-weight: 800;
  color: #052e14;
}

.detalhe-card--alta {
  border-color: #b7e4c7;
  background: linear-gradient(135deg, #ffffff, #f2fbf6);
}

.detalhe-card--alta .detalhe-card-valor {
  color: #0c6b34;
}

.detalhe-card--media {
  border-color: #f0df9a;
  background: linear-gradient(135deg, #ffffff, #fffdf2);
}

.detalhe-card--media .detalhe-card-valor {
  color: #8a6a00;
}

.detalhe-card--baixa {
  border-color: #f3c6c6;
  background: linear-gradient(135deg, #ffffff, #fff5f5);
}

.detalhe-card--baixa .detalhe-card-valor {
  color: #b12626;
}

.detalhe-colunas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 12px;
  align-items: start;
}

.detalhe-tabela-wrap {
  background: white;
  border: 1px solid #dceee3;
  border-radius: 12px;
  padding: 10px 12px;
  overflow: hidden;
}

.detalhe-secao-titulo {
  font-size: 10.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: #537664;
  margin-bottom: 6px;
}

.detalhe-tabela {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.detalhe-tabela th {
  background: #f2f8f4;
  color: #537664;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .04em;
  padding: 5px 8px;
  text-align: left;
  white-space: nowrap;
}

.detalhe-tabela td {
  padding: 5px 8px;
  border-top: 1px solid #eef6f1;
  color: #052e14;
  white-space: nowrap;
}

.detalhe-linha-ativa td {
  background: #f7fcf9;
  font-weight: 700;
}

.detalhe-ef-chip {
  display: inline-block;
  min-width: 38px;
  text-align: center;
  padding: 1px 6px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
}

.detalhe-etapa-extra {
  font-size: 10px;
  color: #93a89c;
  font-weight: 600;
}

/* ── EFICIÊNCIA DUPLA POR HORA (F = Ficha · TF = Tempo Fábrica) ── */
.hora-ef-par {
  display: flex;
  gap: 4px;
  justify-content: center;
}

.hora-ef-mini {
  min-width: 42px;
  height: 18px;
  padding: 0 5px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 800;
  line-height: 18px;
  text-align: center;
  color: #9aa5a1;
  background: #f4f4f4;
  white-space: nowrap;
}

.hora-ef-mini--vazio {
  color: #c3d4ca;
  background: #f8f8f8;
}

/* ── EFICIÊNCIA DO DIA: Ficha × Tempo Fábrica (alinhadas à esquerda) ── */
.efic-dia-par {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: stretch;
}

.efic-dia-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  color: #9aa5a1;
  background: #f4f4f4;
}

.efic-dia-item-label {
  white-space: nowrap;
}

.efic-dia-item-valor {
  font-weight: 800;
  font-size: 12.5px;
  white-space: nowrap;
}

.efic-item--primario .efic-dia-item-valor {
  font-size: 13.5px;
}

.efic-item--secundario {
  opacity: .78;
}

/* ── FAIXA DE EFICIÊNCIA DO PERÍODO na barra de horários ── */
.periodo-resumo {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 6px 10px;
  border-radius: 10px;
  background: #f7fcf9;
  border: 1px dashed #dceee3;
  font-size: 12px;
  color: #537664;
}

.periodo-resumo-label {
  font-weight: 700;
}

.periodo-chip {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 800;
  color: #9aa5a1;
  background: #f4f4f4;
}

.periodo-resumo-total {
  margin-left: auto;
  font-weight: 800;
  color: #0d6632;
}

/* ── RESPONSIVO ─────────────────────────────────────── */
@media (max-width: 1024px) {
  .content-wrapper {
    padding-left: 0;
  }

  .page-section {
    padding: 1rem;
  }

  .op-fields {
    grid-template-columns: 1fr;
  }

  /* Tablet: colunas fixas mais enxutas; campos de toque preservados */
  .table-wrapper {
    --w-func: 150px;
    --w-etapa: 190px;
    --w-hora: 116px;
    --w-efic: 112px;
  }

  .func-info img {
    display: none;
  }

  /* Coluna de eficiência mais estreita no tablet */
  .efic-dia-item {
    font-size: 10px;
    padding: 0 6px;
  }

  .efic-dia-item-valor {
    font-size: 11px;
  }

  .btn-detalhar {
    font-size: 9.5px;
    padding: 3px 6px;
  }

  .btn-salvar-celula {
    width: 28px;
    height: 28px;
  }

  .save-dot {
    width: 10px;
    height: 10px;
  }
}

@media (max-width: 768px) {
  .header {
    align-items: stretch;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .date-input {
    width: 100%;
  }

  .progress-footer {
    flex-direction: column;
    gap: 4px;
  }

  .ops-list {
    flex-direction: column;
  }

  .seg {
    width: 100%;
  }

  .seg-btn {
    flex: 1;
    padding: 0 8px;
  }
}
</style>