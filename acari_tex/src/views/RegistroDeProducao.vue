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
          </div>
        </div>

        <!-- SETUP CARD -->
        <div class="setup-card">

          <!-- LINHA SUPERIOR: título + turno -->
          <div class="setup-topbar">
            <div class="setup-title">
              <div class="setup-icon">⚙️</div>
              <div>
                <h3>Configuração do Dia</h3>
                <span>{{ funcionariosDia.length }} funcionários ativos</span>
              </div>
            </div>
            <div class="turno-config-group">
              <div class="turno-switch">
                <button :class="['turno-btn', turnoAtivo === 'manha' ? 'active' : '']" @click="turnoAtivo = 'manha'">
                  ☀️ Manhã
                </button>
                <button :class="['turno-btn', turnoAtivo === 'tarde' ? 'active' : '']" @click="turnoAtivo = 'tarde'">
                  🌙 Tarde
                </button>
              </div>

              <div class="horarios-config-inline">
                <select v-model="configTurnoAtivo.inicio" class="horario-select-sm" @change="onAlterarConfigHorario">
                  <option v-for="h in opcoesHoraInicio" :key="h" :value="h">{{ h }}</option>
                </select>
                <span class="horario-ate">até</span>
                <select v-model="configTurnoAtivo.fim" class="horario-select-sm" @change="onAlterarConfigHorario">
                  <option v-for="h in opcoesHoraFim" :key="h" :value="h">{{ h }}</option>
                </select>
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
                <table class="apontamento-table">
                  <colgroup>
                    <col class="col-func" />
                    <col class="col-etapa" />
                    <col v-for="hora in horasVisiveis" :key="'col-' + hora" class="col-hora" />
                    <col class="col-total" />
                    <col class="col-efic" />
                    <col class="col-efic-ref" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th class="func-col">Funcionário</th>
                      <th class="etapa-col">Etapa</th>
                      <th v-for="hora in horasVisiveis" :key="hora" class="hora-th">{{ hora }}h</th>
                      <th class="total-col">Total</th>
                      <th class="efic-col">Efic. Ficha</th>
                      <th class="efic-col efic-col--ref">Efic. Ref.</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="funcionario in grupo.funcionarios"
                      :key="funcionario.email + '_' + (grupo.opId || 'sem')">
                      <tr v-for="(linha, idxLinha) in funcionario.linhas" :key="linha.id"
                        :class="{ 'linha-extra': linha.tipo === 'extra', 'linha-ausente': funcionarioAusenteDiaInteiro(funcionario) }">

                        <!-- FUNCIONÁRIO -->
                        <td class="func-col">
                          <div v-if="idxLinha === 0" class="func-info">
                            <img :src="funcionario.foto || '/default-avatar.png'" />
                            <div class="func-info-text">
                              <span class="func-nome">{{ funcionario.nome }}</span>
                              <button class="btn-ausencia-toggle" @click="abrirModalAusencia(funcionario)">
                                {{ funcionario.ausencia ? '✏️ Ausência' : '🚫 Ausência' }}
                              </button>
                              <span v-if="funcionario.ausencia" class="ausencia-tag"
                                :class="'ausencia-tag--' + funcionario.ausencia.tipo"
                                :title="funcionario.ausencia.observacao || ''">
                                <template v-if="funcionario.ausencia.tipo === 'dia_inteiro'">🌑 Ausente (dia inteiro)</template>
                                <template v-else>
                                  🕒 Ausente: <strong>{{ formatarPeriodosAusencia(funcionario.ausencia.periodos) }}</strong>
                                  <span class="ausencia-tag-minutos">({{ calcularMinutosAusenciaFuncionario(funcionario) }}min)</span>
                                </template>
                              </span>
                            </div>
                          </div>
                          <div v-else class="extra-tag">↳ Extra</div>
                        </td>

                        <!-- ETAPA + indicadores de tempo (somente leitura) -->
                        <td class="etapa-col">
                          <div class="etapa-wrap">
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
                                class="btn-remove-linha"
                                @click="removerLinhaExtra(funcionario, idxLinha)" title="Remover esta etapa">×</button>
                              <button v-if="idxLinha === funcionario.linhas.length - 1 && !funcionarioAusenteDiaInteiro(funcionario)"
                                class="btn-add-linha" @click="adicionarLinhaExtra(funcionario, true)" title="Adicionar etapa">+</button>
                            </template>
                            <template v-else>
                              <div class="etapa-fixa">
                                <span class="etapa-fixa-label">{{ linha.descricao || 'Etapa' }}</span>
                                <span class="etapa-fixa-tag" title="OP fora da lista de OPs ativas">🔒 somente consulta</span>
                              </div>
                              <button v-if="idxLinha === funcionario.linhas.length - 1 && !funcionarioAusenteDiaInteiro(funcionario)"
                                class="btn-add-linha" @click="adicionarLinhaExtra(funcionario, false)"
                                title="Adicionar etapa de uma OP ativa">+</button>
                              <button v-if="linha.tipo === 'extra' && !funcionarioAusenteDiaInteiro(funcionario)"
                                class="btn-remove-linha"
                                @click="removerLinhaExtra(funcionario, idxLinha)" title="Remover esta linha">×</button>
                            </template>
                          </div>

                          <!-- SELETOR DE TEMPO: padrão ou uma das referências da etapa -->
                          <div v-if="linha.etapaId && grupo.ativa" class="tempo-toggle-wrap">
                            <select class="tempo-select"
                              :value="linha.modoTempo === 'referencia' ? linha.referenciaSelecionadaId : '__padrao__'"
                              :disabled="funcionarioAusenteDiaInteiro(funcionario)"
                              @change="onSelecionarTempo(linha, $event.target.value)">
                              <option value="__padrao__">⏱ Ficha: {{ linha.tempoPadrao }}min</option>
                              <option v-for="ref in listarRefsDaEtapa(buscarEtapa(linha.etapaId, linha.opId))"
                                :key="ref.id" :value="ref.id">
                                👤 {{ ref.nomeFunc }}: {{ ref.tempo }}min
                              </option>
                            </select>
                          </div>
                        </td>

                        <!-- HORAS -->
                        <td v-for="hora in horasVisiveis" :key="hora" class="hora-td">
                          <div class="hora-box-outer">
                            <!-- Ausência (total ou parcial) bloqueia o lançamento nesta hora -->
                            <div v-if="horaBloqueadaPorAusencia(funcionario, hora)" class="hora-ausente-marker">
                              🚫 Ausente
                            </div>
                            <template v-else>
                              <div class="hora-box-inputs">
                                <!--
                                  Container position:relative — a bolinha de status
                                  fica sobreposta (position:absolute) no canto
                                  superior direito, apenas sobre o input de
                                  QUANTIDADE, conforme pedido.
                                -->
                                <div class="qtd-input-wrap">
                                  <span
                                    v-if="statusCelula(funcionario, linha, hora) !== 'idle'"
                                    class="save-dot"
                                    :class="'save-dot--' + statusCelula(funcionario, linha, hora)"
                                    :title="tituloStatusCelula(funcionario, linha, hora)">
                                  </span>
                                  <input v-model.number="linha.registros[hora].quantidade" type="number" min="0"
                                    placeholder="0"
                                    :class="['hora-input', linha.registros[hora].quantidade > 0 ? 'tem-producao' : '']"
                                    @input="onDigitarCelula(funcionario, linha, hora)" />
                                </div>

                                <div class="tempo-wrap">
                                  <input v-model.number="linha.registros[hora].tempoProduzido" type="number" min="1"
                                    max="60" class="min-input"
                                    @input="onDigitarCelula(funcionario, linha, hora)" />
                                  <span class="min-label">min</span>
                                </div>

                                <!-- Botão de salvamento manual da célula -->
                                <button type="button" class="btn-salvar-celula"
                                  :disabled="!celulaTemAlteracaoPendente(funcionario, linha, hora)"
                                  :title="celulaTemAlteracaoPendente(funcionario, linha, hora) ? 'Salvar agora' : 'Nada pendente para salvar'"
                                  @click="salvarCelulaManual(funcionario, linha, hora)">
                                  💾
                                </button>
                              </div>
                              <div v-if="linha.registros[hora].quantidade > 0" class="efic-inline-col">
                                <span
                                  :class="['efic-inline', getEficClass(calcularEficienciaRegistroPadrao(linha.registros[hora].quantidade, linha.registros[hora].tempoProduzido, linha))]">
                                  <span class="efic-inline-label">FT</span>
                                  {{ calcularEficienciaRegistroPadrao(linha.registros[hora].quantidade,
                                    linha.registros[hora].tempoProduzido, linha) }}%
                                </span>
                                <span
                                  :class="['efic-inline efic-inline--ref', getEficClass(calcularEficienciaRegistroReferencia(linha.registros[hora].quantidade, linha.registros[hora].tempoProduzido, linha, funcionario))]">
                                  <span class="efic-inline-label">TR</span>
                                  {{ calcularEficienciaRegistroReferencia(linha.registros[hora].quantidade,
                                    linha.registros[hora].tempoProduzido, linha, funcionario) }}%
                                </span>
                              </div>
                            </template>
                          </div>
                        </td>

                        <!-- TOTAL -->
                        <td class="total-col">{{ calcularTotalLinha(linha, funcionario) }}</td>

                        <!-- EFICIÊNCIA FICHA (por funcionário) -->
                        <td class="efic-col">
                          <div v-if="idxLinha === 0">
                            <span v-if="funcionarioAusenteDiaInteiro(funcionario)"
                              class="efic-badge ausencia-tag--dia_inteiro">
                              Ausente
                            </span>
                            <span v-else
                              :class="['efic-badge', getEficClass(calcularEficienciaFuncionarioPadrao(funcionario))]">
                              {{ calcularEficienciaFuncionarioPadrao(funcionario)
                                ? calcularEficienciaFuncionarioPadrao(funcionario) + '%'
                                : '—' }}
                            </span>
                          </div>
                        </td>

                        <!-- EFICIÊNCIA REFERÊNCIA (por funcionário) -->
                        <td class="efic-col efic-col--ref">
                          <div v-if="idxLinha === 0">
                            <span v-if="funcionarioAusenteDiaInteiro(funcionario)"
                              class="efic-badge ausencia-tag--dia_inteiro">
                              Ausente
                            </span>
                            <span v-else
                              :class="['efic-badge efic-badge--ref', getEficClass(calcularEficienciaFuncionarioReferencia(funcionario))]">
                              {{ calcularEficienciaFuncionarioReferencia(funcionario)
                                ? calcularEficienciaFuncionarioReferencia(funcionario) + '%'
                                : '—' }}
                            </span>
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
              <div v-for="(periodo, idx) in modalAusencia.form.periodos" :key="periodo._uid" class="ausencia-periodo-row">
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
              @click="removerAusencia">Remover ausência</button>
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
import { calcularEficiencia, calcularCapacidade, resolverSam } from '@/utils/calculosProducao'

const socket = io('https://acari-tex.onrender.com', { transports: ['websocket'] })

const LOCAL_STORAGE_KEY = 'apontamento-horarios-turno'

const CONFIG_PADRAO = {
  manha: { inicio: '08:00', fim: '12:30' },
  tarde: { inicio: '13:30', fim: '18:00' },
}

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

export default {
  name: 'ApontamentoDia',
  components: { SidebarNav, carregandoTela },
  setup() {
    return { store: useAuthStore() }
  },

  data() {
    return {
      loading: true,
      socketConectado: false,
      dataSelecionada: this.formatarDataLocal(),
      dataCarregada: null,
      turnoAtivo: 'manha',
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
      modalAusencia: {
        aberto: false,
        funcionario: null,
        form: { tipo: 'dia_inteiro', periodos: [], observacao: '' },
      },

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
    configTurnoAtivo() {
      return this.configHorarios[this.turnoAtivo]
    },

    opcoesHoraInicio() {
      return this.gerarOpcoesHorario(6, 22)
    },

    opcoesHoraAusencia() {
      return this.gerarOpcoesHorario(6, 22)
    },

    opcoesHoraFim() {
      const todas = this.gerarOpcoesHorario(6, 23)
      const inicioMin = this.horaParaMinutos(this.configTurnoAtivo.inicio)
      return todas.filter(h => this.horaParaMinutos(h) > inicioMin)
    },

    horasVisiveis() {
      const { inicio, fim } = this.configTurnoAtivo
      return this.gerarSequenciaHoras(inicio, fim)
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

    onAlterarConfigHorario() {
      const inicioMin = this.horaParaMinutos(this.configTurnoAtivo.inicio)
      const fimMin = this.horaParaMinutos(this.configTurnoAtivo.fim)

      if (fimMin <= inicioMin) {
        this.configTurnoAtivo.fim = this.opcoesHoraFim[0] || this.configTurnoAtivo.inicio
      }

      this.salvarConfigHorarios()
      this.ajustarRegistrosParaNovasHoras()
    },

    ajustarRegistrosParaNovasHoras() {
      const horasAtuais = this.horasVisiveis

      for (const funcionario of this.funcionariosDia) {
        for (const linha of funcionario.linhas || []) {
          if (!linha.registros) linha.registros = {}

          for (const hora of horasAtuais) {
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
          return {
            id: r.id_funcionario,
            nomeFunc: func?.nome || r.id_funcionario,
            tempo: t,
          }
        })
        .filter(r => r.tempo > 0)
    },

    onSelecionarTempo(linha, valor) {
      if (valor === '__padrao__') {
        linha.modoTempo = 'padrao'
        linha.referenciaSelecionadaId = null
      } else {
        linha.modoTempo = 'referencia'
        linha.referenciaSelecionadaId = valor
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

          const ref = refs.find(r => r && r.id_funcionario === func.email)
          if (!ref) continue

          const t = Number(ref.tempo_minutos ?? ref.tempo_por_peca ?? 0)
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
        const ref = Array.isArray(refs)
          ? refs.find(r => r && r.id_funcionario === linha.referenciaSelecionadaId)
          : null
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

      const tRef = this.resolverTempoReferencia(funcionarioReal, linha)
      if (tRef && tRef > 0) {
        linha.modoTempo = 'referencia'
        linha.referenciaSelecionadaId = funcionarioReal?.email || null
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
    getEficClass(pct) {
      if (pct >= 100) return 'efic-alta'
      if (pct >= 75) return 'efic-media'
      if (pct > 0) return 'efic-baixa'
      return ''
    },

    // ══════════════════════════════════════════════════════════════
    // SISTEMA DE SALVAMENTO POR CÉLULA (autosave + botão manual +
    // localStorage anti-perda + indicador visual)
    // ══════════════════════════════════════════════════════════════

    /** Chave única por funcionário + OP + etapa + hora — identifica "esta célula". */
    chaveCelula(funcionarioId, opId, etapaId, hora) {
      return `${funcionarioId}::${opId || 'sem-op'}::${etapaId}::${hora}`
    },

    /** Lê o status atual da célula (para o :class da bolinha e o :disabled do botão). */
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

        const resposta = await this.emitirComAck('salvar-producao', payload, 8000)
        if (!resposta || resposta.sucesso === false) {
          throw new Error(resposta?.mensagem || 'Servidor recusou o registro.')
        }

        this.definirStatusCelula(chave, 'saved', { lastSavedAt: Date.now() })

        const chaveLS = chaveLocalStorageProducao(
          this.store.pegar_usuario?.cnpj || '', this.dataSelecionada,
          real.email, linha.opId, linha.etapaId, hora
        )
        removerPendenteLocalStorage(chaveLS)

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
        turno: this.turnoAtivo === 'manha' ? 'Manhã' : 'Tarde',
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
  },
}
</script>
<style scoped>
* { box-sizing: border-box; }

.content-wrapper {
  flex-grow: 1;
  padding-left: 200px;
  width: 100%;
  min-height: 100vh;
}

.page-section { padding: 1.2rem; }

/* ── HEADER ─────────────────────────────────────────── */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

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

.btn-gerar-pdf:hover:not(:disabled) { filter: brightness(1.05); }
.btn-gerar-pdf:disabled { opacity: .6; cursor: not-allowed; }

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

.socket-status.online { background: #e7f8ef; color: #0d7a3f; }

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
  0%, 100% { opacity: .5; }
  50% { opacity: 1; }
}

/* ── SETUP CARD ─────────────────────────────────────── */
.setup-card {
  background: linear-gradient(135deg, #ffffff, #f8fcf9);
  border-radius: 24px;
  border: 1px solid #dceee3;
  padding: 1.4rem;
  margin-bottom: 1rem;
  box-shadow: 0 4px 18px rgba(0,0,0,.03);
}

.setup-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.4rem;
  flex-wrap: wrap;
}

.setup-title { display: flex; align-items: center; gap: 14px; }

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
  box-shadow: 0 8px 20px rgba(13,102,50,.2);
}

.setup-title h3 { margin: 0; font-size: 23px; color: #052e14; }
.setup-title span { font-size: 14px; color: #72907e; }

.turno-switch {
  display: flex;
  gap: 6px;
  background: #edf7f1;
  padding: 5px;
  border-radius: 16px;
}

.turno-btn {
  height: 42px;
  padding: 0 18px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #6d8c79;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s;
  font-size: 14px;
}

.turno-btn:hover { background: rgba(13,102,50,.08); }

.turno-btn.active {
  background: linear-gradient(135deg, #0d6632, #118a43);
  color: white;
  box-shadow: 0 4px 14px rgba(13,102,50,.25);
}

.turno-config-group { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.horarios-config-inline { display: flex; align-items: center; gap: 6px; }

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
  box-shadow: 0 0 0 4px rgba(17,138,67,.08);
  outline: none;
}

.horario-ate { font-size: 13px; font-weight: 700; color: #648673; }

/* ── OPs SECTION ────────────────────────────────────── */
.ops-section { display: flex; flex-direction: column; gap: 1rem; }
.ops-list { display: flex; flex-wrap: wrap; gap: 1rem; }

.op-card {
  flex: 1 1 340px;
  background: white;
  border: 1px solid #dceee3;
  border-radius: 18px;
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: .75rem;
  box-shadow: 0 2px 10px rgba(0,0,0,.03);
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

.op-card-header { display: flex; align-items: center; justify-content: space-between; }

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
  width: 26px; height: 26px;
  border: none; border-radius: 8px;
  background: #ffecec; color: #d93b3b;
  font-size: 16px; font-weight: 700; cursor: pointer; line-height: 1;
}

.op-fields {
  display: grid;
  grid-template-columns: 1fr 180px 120px;
  gap: .75rem;
  align-items: end;
}

.field { display: flex; flex-direction: column; gap: 6px; }

.field label { font-size: 12px; font-weight: 700; color: #648673; padding-left: 2px; }

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
  box-shadow: 0 0 0 4px rgba(17,138,67,.08);
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
  box-shadow: 0 0 0 4px rgba(17,138,67,.08);
}

.meta-input {
  flex: 1; height: 100%; border: none; background: transparent;
  padding: 0 12px; font-size: 17px; font-weight: 700; color: #052e14;
}

.meta-input:focus { outline: none; }

.meta-suffix {
  height: 100%; padding: 0 12px;
  display: flex; align-items: center;
  background: #f2f8f4; border-left: 1px solid #e2eee7;
  color: #5d8470; font-size: 12px; font-weight: 700;
}

.total-box {
  height: 46px; border-radius: 13px;
  background: linear-gradient(135deg, #0d6632, #118a43);
  color: white; display: flex; align-items: center; justify-content: center;
  font-size: 23px; font-weight: 800;
  box-shadow: 0 6px 16px rgba(13,102,50,.2);
}

.meta-progress {
  margin-top: .25rem; padding: .85rem 1rem;
  border-radius: 14px;
  background: linear-gradient(135deg, #f7fcf9, #edf7f1);
  border: 1px solid #dceee3;
}

.meta-progress-top {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 8px; font-size: 13px; color: #537664;
}

.meta-progress-top strong { color: #052e14; font-size: 14px; }

.progress-bar {
  width: 100%; height: 12px; border-radius: 999px;
  background: #dceee3; overflow: hidden;
}

.progress-fill {
  height: 100%; border-radius: inherit;
  background: linear-gradient(90deg, #0d6632, #20b15a);
  transition: width .3s ease;
}

.progress-footer {
  margin-top: 8px; display: flex; justify-content: space-between;
  font-size: 12px; color: #648673;
}

.btn-add-op {
  align-self: flex-start;
  display: flex; align-items: center; gap: 6px;
  height: 40px; padding: 0 18px;
  border: 2px dashed #b2d9c0; border-radius: 13px;
  background: transparent; color: #0d6632;
  font-size: 14px; font-weight: 700; cursor: pointer;
  transition: .2s; font-family: inherit;
}

.btn-add-op:hover { background: #edf7f1; border-color: #0d6632; }
.btn-add-op span { font-size: 18px; line-height: 1; }

.total-geral-row {
  display: flex; align-items: center; justify-content: flex-end;
  gap: 12px; margin-top: 1rem; padding-top: 1rem;
  border-top: 1px solid #e6f2ea;
  font-size: 14px; font-weight: 700; color: #537664;
}

.total-box-sm {
  min-width: 80px; height: 40px; border-radius: 12px;
  background: linear-gradient(135deg, #0d6632, #118a43);
  color: white; display: flex; align-items: center; justify-content: center;
  font-size: 19px; font-weight: 800;
  box-shadow: 0 4px 12px rgba(13,102,50,.2);
  padding: 0 16px;
}

/* ── TABLE ──────────────────────────────────────────── */
.table-wrapper {
  background: white; border-radius: 20px;
  border: 1px solid #e3f0e7; overflow: hidden;
}

.table-scroll { overflow-x: auto; }

.apontamento-table {
  width: 100%; border-collapse: collapse; min-width: 1556px;
  table-layout: fixed;
}
.apontamento-table tbody tr {
  min-height: 56px;
}

.col-func     { width: 180px; }
.col-etapa    { width: 230px; }
.col-hora     { width: 190px; }
.col-total    { width: 80px; }
.col-efic     { width: 128px; }
.col-efic-ref { width: 128px; }

.apontamento-table thead {
  background: linear-gradient(90deg, #0d6632, #084d24);
}

.apontamento-table th {
  height: 48px; color: white; font-size: 13px; font-weight: 700;
  align-content: center;
  padding: 0 8px; text-align: left; white-space: nowrap; box-sizing: border-box;
}

.apontamento-table td {
  border-bottom: 1px solid #edf6f1;
  padding: 8px 8px;
  vertical-align: middle;
  box-sizing: border-box;
}

.func-col { width: 180px; min-width: 180px; box-sizing: border-box; }

.func-info { display: flex; align-items: center; gap: 10px; }

.func-info img {
  width: 36px; height: 36px; border-radius: 9px;
  object-fit: cover; flex-shrink: 0;
}

.func-info span { font-size: 13px; font-weight: 700; color: #052e14; }

.extra-tag {
  padding-left: 8px;
  font-size: 12px; font-weight: 700; color: #5d8972;
}

.etapa-col { width: 230px; min-width: 230px; vertical-align: top; padding-top: 10px; box-sizing: border-box; }

.etapa-wrap { display: flex; align-items: center; gap: 5px; }

.etapa-select {
  flex: 1; height: 34px; border-radius: 9px;
  border: 1px solid #dceee3; padding: 0 8px;
  font-size: 12px; font-family: inherit; background: white;
  min-width: 0;
}

.etapa-select:focus { outline: none; border-color: #118a43; }

.btn-add-linha, .btn-remove-linha {
  width: 26px; height: 26px; border: none; border-radius: 7px;
  font-size: 16px; font-weight: 700; cursor: pointer;
  flex-shrink: 0; line-height: 1; display: flex;
  align-items: center; justify-content: center;
}

.btn-add-linha { background: #0d6632; color: white; }
.btn-remove-linha { background: #ffecec; color: #d93b3b; }
.linha-extra { background: #f9fcfa; }

.tempo-toggle-wrap { margin-top: 5px; }

.tempo-select {
  height: 22px; border-radius: 7px;
  border: 1px solid #d4e8dc; background: #f2faf5;
  color: #052e14; font-size: 11px; font-weight: 600;
  font-family: inherit; padding: 0 6px; cursor: pointer;
  width: 100%; max-width: 240px; transition: border-color .15s;
}

.tempo-select:focus { outline: none; border-color: #0d6632; }

.sem-referencia { font-size: 10px; color: #b0c5b8; font-style: italic; }

.hora-th { width: 190px; min-width: 190px; text-align: center !important; box-sizing: border-box; }
.hora-td { padding: 6px 6px; vertical-align: middle; box-sizing: border-box; position: relative; }

.hora-box-outer {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.hora-box-inputs {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

/*
  Container position:relative da bolinha de status. Fica só ao redor do
  input de QUANTIDADE (não do de minutos), conforme pedido.
*/
.qtd-input-wrap {
  position: relative;
  display: inline-block;
}

.hora-input {
  width: 52px; height: 32px; border-radius: 8px;
  border: 1px solid #dceee3; text-align: center;
  font-size: 14px; font-weight: 700; font-family: inherit; transition: .15s;
}

.hora-input:focus { outline: none; border-color: #0d6632; }

.hora-input.tem-producao {
  background: #e9f2ff; border-color: #2b77d9; color: #1454ad;
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

.save-dot--pending { background: #9aa5a1; }
.save-dot--saving  { background: #f0b400; animation: pulseFade 0.9s ease-in-out infinite; }
.save-dot--saved   { background: #1fae57; }
.save-dot--error   { background: #e13b3b; }

.btn-salvar-celula {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 6px;
  background: #eef6f1;
  color: #0d6632;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: .15s;
}

.btn-salvar-celula:hover:not(:disabled) { background: #dcefe3; }

.btn-salvar-celula:disabled {
  opacity: .3;
  cursor: default;
}

.tempo-wrap { display: flex; align-items: center; gap: 2px; }

.min-input {
  width: 36px; height: 20px; border-radius: 6px;
  border: 1px solid #ddebe3; text-align: center;
  font-size: 10px; background: #f8fcf9; color: #69907b;
}

.min-label { font-size: 10px; color: #8ca998; }

.efic-inline-col {
  position: absolute;
  right: 6px;
  top: 6px;
  bottom: 6px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  align-items: flex-end;
  pointer-events: auto;
}

.efic-inline {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    height: 18px;
    border-radius: 4px;
    padding: 0 6px;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
    line-height: 1;
    margin: 0;
}

.efic-inline-label {
  font-size: 9px;
  font-weight: 800;
  opacity: 0.65;
  letter-spacing: .02em;
}

.efic-inline--ref {
  background: transparent !important;
  border: 1px dashed currentColor;
}

.efic-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 64px; height: 28px; border-radius: 20px;
  font-size: 12px; font-weight: 700; padding: 0 12px;
}

.efic-badge--ref {
  background: transparent !important;
  border: 1.5px dashed currentColor;
}

.efic-alta { background: #d4f1df; color: #0c6b34; }
.efic-media { background: #fff4cf; color: #8a6a00; }
.efic-baixa { background: #ffe8e8; color: #b12626; }

.total-col { width: 80px; min-width: 80px; text-align: center; font-size: 13px; font-weight: 700; color: #052e14; box-sizing: border-box; }
.efic-col  { width: 128px; min-width: 128px; text-align: center; box-sizing: border-box; padding-left: 10px; padding-right: 10px; }

.efic-col--ref {
  background: rgba(109, 72, 201, 0.05);
  border-left: 1px solid #e3f0e7;
}

.ops-modulos-wrapper { display: flex; flex-direction: column; gap: 0.5rem; }

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
  box-shadow: 0 2px 8px rgba(0,0,0,.02);
}

.op-module-header--single { background: #f8fcf9; border-color: #e3f0e7; box-shadow: none; }
.op-module-header--empty { background: #fff8e1; border-color: #f0d97a; }

.op-module-badge { font-size: 14px; font-weight: 800; color: #0d6632; letter-spacing: .02em; }
.op-module-header--empty .op-module-badge { color: #8a6a00; }

.op-module-stats {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  font-size: 12px; color: #537664; font-weight: 700;
}

.op-module-stats .stat { display: inline-flex; align-items: center; gap: 4px; }
.op-module-stats .stat strong { color: #052e14; font-weight: 800; font-size: 13px; }

/* ── OP HISTÓRICA (fora da lista de OPs ativas) ────── */
.op-module-header--historico {
  background: linear-gradient(90deg, #f4f1e8, #faf8f2);
  border-color: #e6ddc0;
}

.op-module-header--historico .op-module-badge { color: #7a6a2e; }

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

.etapa-fixa-tag { font-size: 9px; font-weight: 700; color: #93a89c; }

.hora-ausente-marker {
  width: 100%;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #f4f4f4;
  border: 1px dashed #d5d5d5;
  color: #9a9a9a;
  font-size: 11px;
  font-weight: 700;
}

/* ── FUNCIONÁRIO AUSENTE ────────────────────────────── */
.linha-ausente { opacity: .55; }

.func-info-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  justify-content: center;
}
.func-nome { font-size: 13px; font-weight: 700; color: #052e14; }

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

.btn-ausencia-toggle:hover { background: #e7f0ea; }

.ausencia-tag {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  width: fit-content;
  max-width: 150px;
  font-size: 9px;
  font-weight: 700;
  line-height: 1.35;
  border-radius: 5px;
  padding: 2px 6px;
  gap: 2px;
}

.ausencia-tag--dia_inteiro { background: #f3e6e6; color: #9a4b4b; }
.ausencia-tag--parcial { background: #fff4d6; color: #8a6a00; }

.ausencia-tag-minutos {
  font-size: 9px;
  font-weight: 600;
  opacity: 0.75;
  white-space: nowrap;
}

/* ── MODAL DE AUSÊNCIA ──────────────────────────────── */
.ausencia-overlay {
  position: fixed; inset: 0;
  background: rgba(5, 46, 20, .35);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.ausencia-modal {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 50px rgba(0,0,0,.2);
  overflow: hidden;
}

.ausencia-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1.1rem 1.3rem;
  background: linear-gradient(135deg, #0d6632, #118a43);
  color: white;
}

.ausencia-modal-header h3 { margin: 0; font-size: 16px; }

.ausencia-modal-close {
  width: 28px; height: 28px; border: none; border-radius: 8px;
  background: rgba(255,255,255,.15); color: white;
  font-size: 16px; cursor: pointer; line-height: 1;
}

.ausencia-modal-body { padding: 1.2rem 1.3rem; display: flex; flex-direction: column; gap: 1rem; }

.ausencia-tipo-switch { display: flex; gap: 6px; background: #edf7f1; padding: 5px; border-radius: 13px; }

.ausencia-tipo-btn {
  flex: 1; height: 40px; border: none; border-radius: 10px;
  background: transparent; color: #6d8c79; font-weight: 700; font-size: 13px;
  cursor: pointer; transition: .2s; font-family: inherit;
}

.ausencia-tipo-btn.active {
  background: linear-gradient(135deg, #0d6632, #118a43);
  color: white; box-shadow: 0 4px 12px rgba(13,102,50,.2);
}

.ausencia-periodos { display: flex; flex-direction: column; gap: 8px; }

.ausencia-periodo-row { display: flex; align-items: center; gap: 8px; }

.ausencia-hora-select {
  flex: 1; height: 40px; border-radius: 10px;
  border: 1px solid #dceee3; padding: 0 10px;
  font-family: inherit; font-size: 13px; font-weight: 700; color: #052e14;
}

.ausencia-periodo-ate { font-size: 12px; font-weight: 700; color: #648673; }

.btn-remove-periodo {
  width: 30px; height: 30px; border: none; border-radius: 8px;
  background: #ffecec; color: #d93b3b; font-size: 16px; font-weight: 700; cursor: pointer;
  flex-shrink: 0;
}

.btn-add-periodo {
  align-self: flex-start;
  border: 2px dashed #b2d9c0; border-radius: 10px;
  background: transparent; color: #0d6632;
  height: 36px; padding: 0 14px; font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: inherit;
}

.ausencia-dia-inteiro-aviso {
  margin: 0; font-size: 13px; color: #648673; line-height: 1.5;
  background: #f7fcf9; border: 1px solid #dceee3; border-radius: 12px; padding: .8rem 1rem;
}

.ausencia-campo-observacao { display: flex; flex-direction: column; gap: 6px; }

.ausencia-campo-observacao label {
  font-size: 12px; font-weight: 700; color: #648673; padding-left: 2px;
}

.ausencia-observacao-input {
  border-radius: 12px; border: 1px solid #dceee3; background: white;
  padding: .6rem .8rem; font-family: inherit; font-size: 13px; color: #052e14;
  resize: vertical; min-height: 44px; transition: .2s;
}

.ausencia-observacao-input:focus {
  outline: none; border-color: #118a43; box-shadow: 0 0 0 4px rgba(17,138,67,.08);
}

.ausencia-modal-footer {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 1rem 1.3rem; border-top: 1px solid #edf6f1;
}

.ausencia-modal-footer-right { display: flex; gap: 8px; }

.btn-ausencia-remover {
  border: none; background: transparent; color: #d93b3b;
  font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit;
}

.btn-ausencia-cancelar {
  height: 40px; padding: 0 16px; border-radius: 10px;
  border: 1px solid #dceee3; background: white; color: #537664;
  font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit;
}

.btn-ausencia-salvar {
  height: 40px; padding: 0 18px; border-radius: 10px;
  border: none; background: linear-gradient(135deg, #0d6632, #118a43);
  color: white; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit;
  box-shadow: 0 4px 12px rgba(13,102,50,.2);
}

/* ── RESPONSIVO ─────────────────────────────────────── */
@media (max-width: 1024px) {
  .content-wrapper { padding-left: 0; }
  .page-section { padding: 1rem; }
  .op-fields { grid-template-columns: 1fr; }
}

/* Tablets: mantém a tabela com scroll horizontal (já previsto acima),
   mas dá mais espaço de toque para o botão de salvar e a bolinha de
   status, que em telas touch precisam de alvo maior. */
@media (max-width: 1024px) and (min-width: 769px) {
  .btn-salvar-celula { width: 26px; height: 26px; font-size: 12px; }
  .save-dot { width: 10px; height: 10px; }
}

@media (max-width: 768px) {
  .header { align-items: stretch; }
  .header-actions { width: 100%; flex-wrap: wrap; }
  .date-input { width: 100%; }
  .turno-switch { width: 100%; }
  .turno-btn { flex: 1; }
  .progress-footer { flex-direction: column; gap: 4px; }
  .ops-list { flex-direction: column; }
  .turno-config-group { width: 100%; flex-direction: column; align-items: stretch; }
  .horarios-config-inline { width: 100%; }
  .horario-select-sm { flex: 1; }
}
</style>