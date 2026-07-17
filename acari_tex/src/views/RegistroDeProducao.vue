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
                Sem <select> de troca de OP aqui, pois as opções listadas
                em pecasDisponiveis vêm só das OPs em_progresso — exibir
                esta OP num <select> sem a opção correspondente deixaria
                o campo em branco (mesma classe de bug já corrigida na
                etapa da tabela).
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

                <!-- BARRA DE PROGRESSO -->
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

          <!-- TOTAL GERAL (quando há mais de 1 OP no total, ativas + descobertas pelos registros) -->
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
                              <!--
                                × e + ficam completamente indisponíveis quando o
                                funcionário está ausente o dia inteiro — ele não
                                pode ter etapas adicionadas nem removidas naquele
                                dia, só visualizar o que já foi lançado antes da
                                ausência ser registrada.
                              -->
                              <button v-if="linha.tipo === 'extra' && !funcionarioAusenteDiaInteiro(funcionario)"
                                class="btn-remove-linha"
                                @click="removerLinhaExtra(funcionario, idxLinha)" title="Remover esta etapa">×</button>
                              <!--
                                + sempre na última linha DESTE MÓDULO (desta OP).
                                IMPORTANTE: usa funcionario.linhas.length (a lista já
                                filtrada por OP pelo agrupamento), NÃO o total geral de
                                linhas do funcionário. Antes, ao usar o total geral, o
                                botão "+" desaparecia sempre que o funcionário já tinha
                                uma linha em OUTRA OP — impedindo lançar uma segunda
                                etapa extra para ele dentro desta mesma OP.
                              -->
                              <button v-if="idxLinha === funcionario.linhas.length - 1 && !funcionarioAusenteDiaInteiro(funcionario)"
                                class="btn-add-linha" @click="adicionarLinhaExtra(funcionario)" title="Adicionar etapa">+</button>
                            </template>
                            <!--
                              Módulo "histórico": a OP não está mais na lista de OPs
                              ativas (finalizada, em coleta, ou removida do setup do
                              topo da tela), então não existem opções para popular o
                              <select> desta etapa. Mostramos a descrição já
                              registrada como somente leitura — assim o gestor
                              continua vendo o que foi lançado, sem o risco de a
                              etapa aparecer em branco por falta de opção
                              correspondente no <select>.
                            -->
                            <template v-else>
                              <div class="etapa-fixa">
                                <span class="etapa-fixa-label">{{ linha.descricao || 'Etapa' }}</span>
                                <span class="etapa-fixa-tag" title="OP fora da lista de OPs ativas">🔒 somente consulta</span>
                              </div>
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
                              <!-- Esquerda: campo de quantidade + minutos -->
                              <div class="hora-box-inputs">
                                <div class="hora-box-inputs">
  <input v-model.number="linha.registros[hora].quantidade" type="number" min="0"
    placeholder="0"
    :class="['hora-input', linha.registros[hora].quantidade > 0 ? 'tem-producao' : '']"
    @blur="onInputQuantidade(funcionario, linha, hora)" />
  <div class="tempo-wrap">
    <input v-model.number="linha.registros[hora].tempoProduzido" type="number" min="1"
      max="60" class="min-input" @input="onInputQuantidade(funcionario, linha, hora)" />
    <span class="min-label">min</span>
  </div>

  <!-- NOVO: status de salvamento -->
  <div v-if="linha.registros[hora].status === 'salvando'" class="registro-status registro-status--salvando">
    salvando…
  </div>
  <div v-else-if="linha.registros[hora].status === 'erro'" class="registro-status registro-status--erro">
    <span :title="linha.registros[hora].erro">⚠ não salvo</span>
    <button class="btn-retry-registro" @click="tentarNovamenteRegistro(funcionario, linha, hora)">
      tentar de novo
    </button>
  </div>
</div>
                                
                              </div>
                              <!-- Direita: FT e TR, só visíveis quando há produção -->
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
// de página, fechamento do navegador e queda de conexão. A sincronização
// com o backend continua acontecendo pelo mecanismo já existente
// (salvarMetaDia via socket, que o próprio socket.io já enfileira
// automaticamente enquanto a conexão está caída); este helper resolve
// especificamente o caso que o socket.io NÃO cobre: página recarregada
// ou navegador fechado antes da reconexão.
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
        console.warn('IndexedDB indisponível, usando localStorage como fallback para etapas offline.')
        resolve(null)
      }
    } catch (err) {
      console.warn('Erro ao abrir IndexedDB, usando localStorage como fallback.', err)
      resolve(null)
    }
  })

  return _offlineDbPromise
}

function lerFallbackLocalStorage() {
  try {
    const bruto = localStorage.getItem(OFFLINE_FALLBACK_KEY)
    return bruto ? JSON.parse(bruto) : {}
  } catch {
    return {}
  }
}

function escreverFallbackLocalStorage(mapa) {
  try {
    localStorage.setItem(OFFLINE_FALLBACK_KEY, JSON.stringify(mapa))
  } catch (err) {
    console.warn('Não foi possível gravar fallback de etapa offline no localStorage.', err)
  }
}

/**
 * API de armazenamento offline de etapas selecionadas. Cada registro
 * contém no mínimo: funcionarioId, opId, etapaId, data, tipoLinha e
 * horarioSelecao (timestamp de quando a seleção foi feita). Usa
 * IndexedDB quando disponível; cai para localStorage automaticamente
 * caso contrário — a troca é transparente para quem consome este objeto.
 */
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
    const mapa = lerFallbackLocalStorage()
    mapa[registro.chave] = registro
    escreverFallbackLocalStorage(mapa)
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
    const mapa = lerFallbackLocalStorage()
    delete mapa[chave]
    escreverFallbackLocalStorage(mapa)
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
    const mapa = lerFallbackLocalStorage()
    return Object.values(mapa).filter(r => r.data === data)
  },
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
      configHorarios: this.carregarConfigHorarios(),
      ultimaBuscaId: 0,
      carregandoMeta: false,
      gerandoPdf: false,
      modalAusencia: {
        aberto: false,
        funcionario: null,
        form: { tipo: 'dia_inteiro', periodos: [], observacao: '' },
      },

      // Chaves ("email::linhaId::hora") de registros com salvamento em
      // voo ou com erro — usado para não deixar um reload (buscarMetaDia)
      // sobrescrever um valor ainda não confirmado como persistido.
      registrosPendentes: new Set(),
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

    /**
     * Lista GLOBAL e ACHATADA de todas as combinações (OP, etapa)
     * disponíveis nas OPs ativas no momento. Cada <select> de etapa usa o
     * ÍNDICE desta lista como value — nunca uma string montada por
     * concatenação. Isso elimina de vez a classe de bug em que o valor
     * reconstruído (via parsing de "opId::etapaId") deixava de bater
     * exatamente com o opId usado no agrupamento das tabelas: aqui não há
     * conversão de tipo nem parsing nenhum, o índice aponta direto para o
     * objeto com os valores originais (mesma referência de op.pecaId e
     * etapa.id_da_funcao usados em todo o resto do componente).
     */
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

      /**
       * IMPORTANTE: antes desta correção, qualquer linha com um opId que
       * não estivesse entre as OPs ativas (por exemplo, uma OP que já foi
       * finalizada, foi para coleta, ou foi removida do setup do topo da
       * tela) caía silenciosamente no grupo "Funcionários sem OP" via
       * `gruposMap.get(opId) || gruposMap.get(null)` — o gestor perdia a
       * identificação de QUAL OP gerou aquele lançamento. Aqui varremos
       * antecipadamente todas as linhas de todos os funcionários e
       * criamos um grupo "histórico" (ativa: false) para cada opId
       * encontrado que não esteja mais na lista ativa, preservando a
       * OP correta mesmo depois que ela sai do topo da tela.
       */
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

    /**
     * ÚNICA fonte de verdade para "quais funcionários/linhas pertencem a
     * esta OP" — um Map(opId → grupo) construído a partir do MESMO
     * agrupamento (`funcionariosAgrupadosPorOp`) que monta a tabela.
     *
     * Antes desta correção, os cards do topo (Produção Atual, e por
     * tabela os cálculos de eficiência/capacidade) recalculavam varrendo
     * `funcionariosDia` de forma TOTALMENTE INDEPENDENTE da tabela. Como
     * eram dois caminhos de cálculo separados sobre a mesma base, uma
     * pequena divergência na resolução do opId de algum registro (ex.:
     * quando `id_da_op` não vinha preenchido e o sistema tentava inferir
     * a OP pela etapa) podia fazer um dos dois caminhos "perder" a
     * associação enquanto o outro continuava enxergando os dados — daí o
     * card mostrar produção e a tabela aparecer zerada.
     *
     * Ao fazer TODOS os cálculos por OP (card e tabela) lerem deste
     * mesmo mapa, essa divergência deixa de ser possível por construção:
     * não existe mais "um jeito de calcular para o card" e "outro jeito
     * para a tabela" — existe um único agrupamento, usado por tudo.
     */
    mapaProducaoPorOp() {
      const mapa = new Map()
      for (const grupo of this.funcionariosAgrupadosPorOp) {
        if (grupo.opId) mapa.set(grupo.opId, grupo)
      }
      return mapa
    },

    /**
     * Decide se a tabela de módulos deve aparecer. Não pode depender só
     * de `opsAtivasComPeca.length > 0` (bug anterior): num dia em que
     * TODAS as OPs já mudaram de status (finalizado/coleta) e nenhuma
     * ficou em_progresso, isso escondia a tabela inteira mesmo havendo
     * produção histórica real para mostrar. Por outro lado, não basta
     * checar só `funcionariosAgrupadosPorOp.length`, pois o grupo "sem
     * OP" sempre existe (todo funcionário nasce com uma linha vazia) —
     * sem essa distinção, um dia genuinamente sem nenhuma produção
     * mostraria uma tabela cheia de linhas em branco.
     * Mostra a tabela quando: existe OP ativa configurada no topo, OU
     * existe pelo menos um grupo com opId (produção real, ativa ou
     * histórica).
     */
    temConteudoParaTabela() {
      return this.opsAtivasComPeca.length > 0
        || this.funcionariosAgrupadosPorOp.some(g => g.opId !== null)
    }
  },

  watch: {
    dataSelecionada() {
      // Garante o envio de qualquer edição já digitada na data anterior
      // antes de trocar de dia e recarregar tudo — sem isso, uma edição
      // ainda dentro da janela do debounce seria descartada.
      this.flushSalvamentosPendentes()
      this.buscarMetaDia()
    },
  },

  async mounted() {
    if (!this.store.pegar_token) router.push('/')
    this.iniciarSocket()
    await this.aguardarConexaoSocket()
    await this.carregarDados()
    await this.buscarMetaDia()
    // getFaltas NÃO é mais chamado aqui separadamente: buscarMetaDia() já
    // dispara getFaltas() internamente, sempre no momento certo (depois
    // que funcionariosDia já foi reconstruído a partir da meta do dia),
    // e isso se repete automaticamente toda vez que a data é trocada
    // (ver watch: dataSelecionada).
  },

  beforeUnmount() {
    // Envia qualquer edição pendente antes de desmontar a tela / desconectar.
    this.flushSalvamentosPendentes()
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
                status: 'idle',
                erro: null,
                _ultimoValorSalvo: null,
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
        // NOVO: numa RECONEXÃO (não na primeira conexão — essa já é
        // tratada pelo fluxo normal de mounted()), refaz o carregamento
        // da meta do dia. Isso já dispara restaurarEtapasOffline() e
        // getFaltas() internamente, então qualquer seleção de etapa
        // feita enquanto a tela esteve offline é reavaliada e uma nova
        // tentativa de sincronização é feita automaticamente.
        if (this._jaConectouUmaVez) {
          this.buscarMetaDia()
        }
        this._jaConectouUmaVez = true
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

        // A API retorna as OPs agrupadas por status (em_progresso,
        // finalizado, coleta, não_iniciado, etc — as chaves exatas podem
        // variar, então pegamos TODAS dinamicamente em vez de fixar uma
        // lista de nomes). `this.pecas` continua restrito a em_progresso
        // porque é o que alimenta o setup do topo da tela (só faz
        // sentido escolher uma OP em andamento para lançar produção
        // nova). `this.pecasTodas` reúne todas as OPs, independente do
        // status, e passa a alimentar `nomeDaOp` e `this.etapas` — é o
        // que garante que uma OP finalizada/em coleta, mesmo fora da
        // lista ativa, continue mostrando o nome real e os dados de
        // etapa (tempo padrão, tempo de referência) para quem já tem
        // produção lançada nela.
        const pecasPorStatus = resPecas.data.peca || {}
        const todasAsPecas = Array.isArray(pecasPorStatus)
          ? pecasPorStatus
          : Object.values(pecasPorStatus).flat()

        this.pecas = pecasPorStatus.em_progresso || []
        this.pecasTodas = todasAsPecas
        this.etapas = this.pecasTodas.map(p => p.etapas || [])

        this.etapasMap = {}
        for (const listaEtapas of this.etapas) {
          for (const e of listaEtapas) {
            const idFuncao = e.id_da_funcao || e.etapa?.id_da_funcao
            const idOp = e.id_da_op
            if (idFuncao) this.etapasMap[`${idOp}::${idFuncao}`] = e
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

    /**
     * Deriva `opsExtras` a partir da MESMA fonte usada para montar a
     * tabela inferior (opId presente nas linhas de produção dos
     * funcionários) — garante que a seção "Configuração do Dia" fique
     * consistente com a tabela, sem depender só das OPs configuradas
     * manualmente no topo.
     *
     * Dedup: qualquer pecaId já presente em `opsAtivas` (mesmo sem
     * "peca válida" selecionada) nunca é adicionado aqui, evitando
     * cards duplicados para a mesma OP.
     */
    sincronizarOpsExtras() {
      const idsAtivos = new Set(this.opsAtivas.map(op => op.pecaId).filter(Boolean))

      const idsComRegistro = new Set()
      for (const func of this.funcionariosDia) {
        for (const linha of func.linhas || []) {
          if (linha.opId) idsComRegistro.add(linha.opId)
        }
      }

      // remove extras que deixaram de ter registro OU que passaram a
      // estar configuradas normalmente no topo (evita duplicidade)
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
      // Busca em TODAS as OPs (qualquer status), não só nas em
      // andamento — é o que permite exibir o nome real de uma OP
      // finalizada/em coleta que já tenha produção lançada, em vez de
      // cair no fallback de mostrar o id bruto.
      const peca = this.pecasTodas.find(p => p.id_da_op === pecaId)
      return peca?.descricao || pecaId
    },

    etapasDaOp(pecaId) {
      return this.etapas.flat().filter(e => e.id_da_op === pecaId)
    },

    /**
     * Subconjunto de opcoesEtapaTodas pertencente a uma OP específica,
     * já com o índice GLOBAL anexado (idx) — é esse índice que vai no
     * value do <option>, nunca o id da etapa isolado.
     */
    opcoesParaOp(pecaId) {
      const resultado = []
      this.opcoesEtapaTodas.forEach((opcao, idx) => {
        if (opcao.opId === pecaId) resultado.push({ idx, label: opcao.label })
      })
      return resultado
    },

    /**
     * Índice (em opcoesEtapaTodas) correspondente à etapa/OP já
     * selecionados nesta linha — usado para marcar a opção atual do
     * <select> sem depender de nenhuma string composta.
     */
    indiceOpcaoEtapa(linha) {
      if (!linha?.etapaId) return ''
      const idx = this.opcoesEtapaTodas.findIndex(
        o => o.etapaId === linha.etapaId && o.opId === linha.opId
      )
      return idx === -1 ? '' : idx
    },

    /**
     * Handler do <select> de etapa. Recebe o ÍNDICE (string, vindo do
     * DOM) dentro de opcoesEtapaTodas e usa o objeto encontrado para
     * atribuir etapaId/opId à linha — sem parsing de texto, sem
     * concatenação, sem qualquer conversão de tipo. Isso resolve
     * definitivamente o problema de linhas da segunda OP "sumirem" do
     * agrupamento: opId é atribuído com a MESMA referência de valor usada
     * para construir os grupos (op.pecaId), garantindo igualdade estrita.
     */
    onAlterarEtapaPorIndice(funcionario, linha, valorIndice) {
      if (valorIndice === '' || valorIndice === null || valorIndice === undefined) {
        // Limpando a seleção: remove o registro offline da etapa antiga
        // (se havia uma), já que este slot deixa de representar aquela
        // escolha.
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

      // Trocando de uma etapa para outra na mesma linha: descarta o
      // registro offline antigo antes de gravar o novo, para não deixar
      // um registro órfão de uma etapa que não está mais selecionada.
      if (linha.etapaId && (linha.etapaId !== opcao.etapaId || linha.opId !== opcao.opId)) {
        this.removerEtapaOfflineSeExistir(funcionario, linha.opId, linha.etapaId, linha.tipo)
      }

      linha.etapaId = opcao.etapaId
      linha.opId = opcao.opId

      this.onAlterarEtapa(funcionario, linha)

      // NOVO: persiste a seleção IMEDIATAMENTE, independente de haver
      // produção lançada — sobrevive a reload, fechamento do navegador
      // e queda de conexão.
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
          // Estado do salvamento desta célula: 'idle' (nada digitado
          // ainda / sem alteração pendente), 'salvando' (aguardando
          // confirmação do servidor), 'salvo' (confirmado pelo backend)
          // ou 'erro' (o backend não confirmou; ver `erro` para detalhe).
          status: 'idle',
          erro: null,
          // Último valor que já teve confirmação de persistência — usado
          // apenas para os logs de diagnóstico (valor anterior x novo).
          _ultimoValorSalvo: null,
        }
      }
      return registros
    },

    adicionarLinhaExtra(funcionario) {
      const real = funcionario._funcRef || funcionario
      if (!Array.isArray(real.linhas)) real.linhas = []

      const linhaExtra = this.novaLinha('extra')

      if (funcionario._grupoOpId) {
        linhaExtra.opId = funcionario._grupoOpId
      }

      real.linhas.push(linhaExtra)
      this.salvarMetaDia()
    },

    removerLinhaExtra(funcionario, idxLinha) {
      const real = funcionario._funcRef || funcionario

      const linhaAlvo = funcionario.linhas?.[idxLinha]
      if (!linhaAlvo) return

      // NOVO: remove também o registro offline correspondente, se
      // existir — a linha deixa de existir, então a seleção offline
      // dela também deve deixar de existir.
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
      const etapasOp = this.etapas.flat().filter(e => e.id_da_op === opId)

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
      const etapa = this.buscarEtapa(linha?.etapaId, linha?.opId)
      return Number(
        etapa?.tempo_padrao
        ?? etapa?.etapa?.tempo_padrao
        ?? linha?.tempoPadrao
        ?? 0
      )
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

    /**
     * Tempo efetivo (SAM) para o painel "Tempo de Referência": respeita a
     * escolha do usuário no toggle da linha (referência específica ou
     * tempo padrão). Delegado a `resolverSam` para não duplicar a regra
     * "referência quando existir, senão padrão" em mais de um lugar.
     */
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

    /**
     * Minutos disponíveis de UM funcionário no DIA COMPLETO (manhã + tarde
     * configuradas), independentemente de qual turno está selecionado na
     * tela no momento. Usado para "Tempo Disponível" e para a estimativa
     * de capacidade quando ainda não há produção lançada — usar apenas o
     * turno ativo (horasVisiveis) subestimava o dia inteiro.
     */
    minutosDisponiveisDia() {
      const horasManha = this.gerarSequenciaHoras(this.configHorarios.manha.inicio, this.configHorarios.manha.fim)
      const horasTarde = this.gerarSequenciaHoras(this.configHorarios.tarde.inicio, this.configHorarios.tarde.fim)
      return (horasManha.length + horasTarde.length) * 60
    },

    // ── AUSÊNCIA ──────────────────────────────────────────
    /**
     * Minutos de ausência de UM funcionário que efetivamente caem dentro
     * da jornada configurada (manhã + tarde). Ausência de dia inteiro
     * consome a jornada completa. Ausência parcial soma apenas a
     * intersecção real (em minutos) entre cada período informado e as
     * janelas de trabalho configuradas, evitando contar tempo fora do
     * expediente ou duplicar minutos que caiam simultaneamente nas duas
     * janelas.
     */
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

    /**
     * Minutos REALMENTE disponíveis de UM funcionário no dia, já
     * descontando qualquer ausência (total ou parcial). Deve substituir
     * `minutosDisponiveisDia()` em todo cálculo de capacidade/tempo
     * disponível que precise ser individualizado por funcionário — caso
     * contrário um funcionário ausente seguiria sendo contado como se
     * tivesse a jornada inteira livre.
     *
     * Tempo disponível = Tempo total do turno/dia − Tempo de ausência
     */
    calcularMinutosDisponiveisFuncionario(funcionario) {
      const totalPadrao = this.minutosDisponiveisDia()
      const ausente = this.calcularMinutosAusenciaFuncionario(funcionario)
      return Math.max(totalPadrao - ausente, 0)
    },

    /** Um funcionário ausente o dia inteiro não pode ter nenhum lançamento. */
    funcionarioAusenteDiaInteiro(funcionario) {
      const real = funcionario?._funcRef || funcionario
      return real?.ausencia?.tipo === 'dia_inteiro'
    },

    /**
     * Indica se determinada coluna de hora está coberta por uma ausência
     * (total ou parcial) do funcionário — usado para bloquear o
     * lançamento de produção naquele horário específico. Cada coluna
     * representa um bloco de ~60min a partir do horário exibido (mesmo
     * padrão usado na montagem de horasVisiveis via gerarSequenciaHoras);
     * basta checar sobreposição desse bloco com os períodos de ausência.
     */
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

    /**
     * Persiste a ausência no backend via POST /registrar-faltas — esta é
     * a fonte de verdade "oficial" da ausência (fica também replicada em
     * `funcionario.ausencia` dentro do payload de salvar-meta-dia, para
     * não quebrar o fluxo de carregamento por socket já existente, mas o
     * registro formal em banco passa a acontecer por aqui).
     *
     * Ausência parcial com múltiplos períodos gera UM POST por período
     * (o endpoint documentado trabalha com um horário inicial/final por
     * registro). Remoção é sinalizada explicitamente com `removida: true`
     * e `tipo: null`, já que não há um verbo DELETE especificado.
     *
     * Falha de rede aqui NÃO desfaz a alteração já aplicada na tela —
     * apenas avisa o gestor que a confirmação do servidor não chegou,
     * para evitar perder o trabalho de quem já configurou a ausência.
     */
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

    /**
     * Busca os registros de ausência do dia selecionado e os aplica
     * automaticamente em `funcionariosDia` — é a integração automática
     * entre o módulo de Registro de Faltas e esta tela: nenhuma ação
     * manual do gestor é necessária, o `watch: dataSelecionada` já
     * garante que isso roda de novo sempre que a data muda (via
     * buscarMetaDia, que chama este método no momento certo).
     *
     * Formato esperado de cada registro (retornado por GET
     * /buscar-faltas):
     *   { id, funcionarioId, data, tipo, horarioInicial, horarioFinal, observacao }
     */
    async getFaltas() {
      const dataRequisitada = this.dataSelecionada
      try {
        const token = this.store.pegar_token
        const response = await api.get('/buscar-faltas', {
          params: { data: dataRequisitada },
          headers: { Authorization: token }
        })

        // Se a data selecionada já mudou enquanto esta requisição estava
        // em voo, descarta a resposta — evita aplicar ausências de um
        // dia que não é mais o exibido na tela.
        if (dataRequisitada !== this.dataSelecionada) return

        const faltas = Array.isArray(response.data)
          ? response.data
          : (response.data?.faltas || [])

        this.aplicarFaltasAosFuncionarios(faltas)
      } catch (err) {
        console.error('Erro ao buscar faltas do backend', err)
      }
    },

    /**
     * Normaliza um horário vindo do backend para o formato "HH:MM" já
     * usado internamente por toda a tela. Aceita tanto "HH:MM" direto
     * quanto uma data/hora ISO completa (ex.: "2026-07-16T09:00:00.000Z"),
     * extraindo hora e minuto em UTC neste segundo caso.
     */
    normalizarHora(valor) {
      if (!valor) return null
      if (/^\d{2}:\d{2}$/.test(valor)) return valor
      const d = new Date(valor)
      if (isNaN(d.getTime())) return null
      const h = String(d.getUTCHours()).padStart(2, '0')
      const m = String(d.getUTCMinutes()).padStart(2, '0')
      return `${h}:${m}`
    },

    /**
     * Converte os registros de falta de UM funcionário (podem ser vários,
     * no caso de múltiplos períodos parciais no mesmo dia) para o formato
     * interno já usado por toda a tela: { tipo, periodos, observacao }.
     *
     * Se existir QUALQUER registro "dia_inteiro" para o funcionário, ele
     * sempre prevalece sobre eventuais registros parciais do mesmo dia —
     * ausência total é mais restritiva e não faz sentido conviver com
     * bloqueios parciais simultâneos.
     */
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
      console
      if (!parciais.length) return null

      return {
        tipo: 'parcial',
        periodos: parciais,
        observacao: registros.map(r => r.observacao).filter(Boolean).join(' | '),
      }
    },

    /**
     * Aplica os registros de /buscar-faltas a `funcionariosDia`,
     * agrupando por funcionarioId, e reordena a lista para que quem está
     * ausente o dia inteiro vá para o final. É chamado automaticamente
     * (via getFaltas) toda vez que a data muda ou que a meta do dia é
     * recarregada — nenhuma configuração manual é necessária.
     */
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

    /**
     * Move funcionários ausentes o dia inteiro para o final da lista,
     * preservando a ordem relativa original entre os demais (sort
     * estável). Como `funcionariosAgrupadosPorOp` itera sobre
     * `this.funcionariosDia` nesta mesma ordem, a tabela reflete a
     * ordenação automaticamente — nenhuma mudança extra é necessária
     * no template para isso.
     */
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

      const candidatas = this.etapas.flat().filter(e => {
        const id = e.id_da_funcao || e.etapa?.id_da_funcao
        return id === etapaId
      })

      if (opId != null && opId !== '') {
        const match = candidatas.find(e => e.id_da_op === opId)
        if (match) return match
      }

      return candidatas[0] || null
    },

    // ── PERSISTÊNCIA OFFLINE DE ETAPA SELECIONADA ────────
    /**
     * Chave determinística que identifica um "slot" de seleção de etapa
     * (funcionário + OP + etapa + data + tipo de linha). Não usa
     * `linha.id` porque esse id é regenerado a cada reload da tela
     * (Date.now() + Math.random()) e por isso não sobreviveria a um
     * refresh de página — a chave composta abaixo é estável e permite
     * localizar/atualizar/remover o mesmo registro em qualquer sessão.
     */
    chaveEtapaOffline(funcionarioId, opId, etapaId, data, tipo) {
      return `${funcionarioId}::${data}::${opId || 'sem-op'}::${etapaId}::${tipo}`
    },

    /**
     * Persiste IMEDIATAMENTE a seleção de etapa desta linha no
     * armazenamento offline, independentemente de já existir produção
     * lançada. Chamado a cada seleção/troca de etapa (ver
     * onAlterarEtapaPorIndice) — nenhuma etapa escolhida fica só em
     * memória.
     */
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

    /** Remove um registro offline específico, se existir (ex.: etapa trocada ou linha removida). */
    async removerEtapaOfflineSeExistir(funcionario, opId, etapaId, tipo) {
      if (!etapaId) return
      const real = funcionario?._funcRef || funcionario
      const chave = this.chaveEtapaOffline(real.email, opId, etapaId, this.dataSelecionada, tipo)
      await etapaOfflineStore.remover(chave)
    },

    /**
     * Lê os registros offline do dia selecionado e os reaplica em
     * funcionariosDia. Deve ser chamado DEPOIS que a tela já reconstruiu
     * o estado a partir do servidor (buscarMetaDia) — assim é possível
     * distinguir entre:
     *   (a) uma etapa que o servidor JÁ confirmou (o registro offline
     *       correspondente é descartado, pois não é mais necessário);
     *   (b) uma etapa que o operador selecionou mas que nunca chegou a
     *       ser confirmada pelo servidor (é restaurada na tela e uma
     *       nova tentativa de sincronização é disparada).
     */
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

      // Se alguma etapa ainda não confirmada foi restaurada, tenta
      // sincronizar de novo agora. Se a conexão estiver de volta, o
      // socket.io envia normalmente; se ainda estiver offline, o próprio
      // socket.io enfileira o evento e o envia assim que reconectar.
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
    /**
     * Soma a quantidade produzida numa linha. Se `funcionario` for
     * informado, horas cobertas por uma ausência (total ou parcial) são
     * descontadas mesmo que já tenham um valor lançado antes da ausência
     * ser registrada — a ausência precisa "apagar" o efeito nos
     * indicadores, não só esconder o campo na tela.
     */
    calcularTotalLinha(linha, funcionario = null) {
      if (!linha?.registros) return 0
      return Object.entries(linha.registros).reduce((s, [hora, r]) => {
        if (funcionario && this.horaBloqueadaPorAusencia(funcionario, hora)) return s
        return s + Number(r?.quantidade || 0)
      }, 0)
    },

    /**
     * Soma dos minutos efetivamente utilizados em uma linha (apenas
     * registros com produção > 0, e fora de qualquer período de
     * ausência). Extraído como método reutilizável para não duplicar
     * este padrão de soma nas eficiências e no PDF.
     */
    calcularTempoUtilizadoLinha(linha, funcionario = null) {
      if (!linha?.registros) return 0
      return Object.entries(linha.registros).reduce((soma, [hora, reg]) => {
        if (funcionario && this.horaBloqueadaPorAusencia(funcionario, hora)) return soma
        if (reg && reg.quantidade > 0) return soma + (reg.tempoProduzido || 60)
        return soma
      }, 0)
    },

    /**
     * Eficiência (Ficha Técnica) de UMA linha isolada — usado no PDF para
     * detalhar por etapa/funcionário sem misturar com as demais linhas do
     * mesmo funcionário. Aplica a fórmula oficial:
     *   (Peças × SAM × 100) / (Funcionários × Tempo Trabalhado)
     * Aqui Funcionários = 1 (uma linha pertence sempre a um funcionário) e
     * "Peças × SAM" é somado registro a registro pois o SAM (tempo padrão
     * da etapa) é constante para a linha inteira. Horas cobertas por
     * ausência são excluídas do cálculo.
     */
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

    /**
     * Eficiência (Tempo de Referência) de uma linha isolada — mesma
     * fórmula oficial acima, usando o SAM efetivo de referência. Horas
     * cobertas por ausência são excluídas do cálculo.
     */
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

    /**
     * Eficiência da OP (Ficha Técnica) — fórmula oficial aplicada sobre os
     * totais agregados de todas as linhas/funcionários da OP.
     * Funcionários = 1 aqui porque `tempoTrabalhado` já é a SOMA dos
     * minutos de TODOS os funcionários envolvidos (Σ pessoa-minutos) —
     * multiplicar por funcionários de novo contaria a mesma coisa duas
     * vezes.
     */
    calcularEficienciaOpPadrao(opId) {
      if (!opId) return 0
      const grupo = this.mapaProducaoPorOp.get(opId)
      if (!grupo) return 0
      let producaoPonderada = 0
      let tempoTrabalhado = 0

      for (const func of grupo.funcionarios) {
        for (const linha of func.linhas || []) {
          const sam = this.resolverTempoPadrao(linha)
          for (const [hora, reg] of Object.entries(linha.registros || {})) {
            if (this.horaBloqueadaPorAusencia(func, hora)) continue
            if (reg && reg.quantidade > 0) {
              producaoPonderada += reg.quantidade * sam
              tempoTrabalhado += reg.tempoProduzido || 60
            }
          }
        }
      }

      return calcularEficiencia({ producaoPonderada, funcionarios: 1, tempoTrabalhado })
    },

    /**
     * Capacidade da OP pela Ficha Técnica:
     *   Capacidade = (Funcionários × Tempo Trabalhado) / SAM
     * Com produção já lançada, soma a capacidade real linha a linha
     * (funcionário=1, tempo=minutos registrados, sam=tempo padrão),
     * excluindo qualquer hora coberta por ausência. Sem nenhum registro
     * ainda, estima usando o tempo disponível do funcionário já
     * descontado de ausência (não o dia cheio).
     */
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
            // Usa o tempo disponível já descontado de eventuais ausências
            // (total ou parcial) deste funcionário específico, em vez do
            // dia cheio — evita superestimar a capacidade de quem está
            // ausente.
            const minutosDisponiveis = this.calcularMinutosDisponiveisFuncionario(real)
            capacidade += calcularCapacidade({ funcionarios: 1, tempoTrabalhado: minutosDisponiveis, sam })
          }
        }
      }

      return capacidade
    },

    /**
     * Eficiência do funcionário (Ficha Técnica), somando todas as linhas
     * dele — mesma lógica de calcularEficienciaOpPadrao, mas restrita a
     * um único funcionário. Horas cobertas por ausência (total ou
     * parcial) são excluídas: mesmo que já exista um lançamento antigo
     * naquele horário, ele deixa de contar assim que a ausência é
     * registrada — não basta esconder o campo, o indicador precisa
     * refletir só o período em que o funcionário esteve disponível.
     */
    calcularEficienciaFuncionarioPadrao(funcionario) {
      if (!funcionario?.linhas?.length) return 0
      let producaoPonderada = 0
      let tempoTrabalhado = 0

      for (const linha of funcionario.linhas) {
        if (!linha?.registros) continue
        const sam = this.resolverTempoPadrao(linha)
        for (const [hora, reg] of Object.entries(linha.registros)) {
          if (this.horaBloqueadaPorAusencia(funcionario, hora)) continue
          if (reg && reg.quantidade > 0) {
            producaoPonderada += reg.quantidade * sam
            tempoTrabalhado += reg.tempoProduzido || 60
          }
        }
      }

      return calcularEficiencia({ producaoPonderada, funcionarios: 1, tempoTrabalhado })
    },

    /** Eficiência (Ficha) de um único registro/hora isolado. */
    calcularEficienciaRegistroPadrao(quantidade, tempoProduzido, linha) {
      const sam = this.resolverTempoPadrao(linha)
      if (!quantidade || !tempoProduzido || !sam) return 0
      return calcularEficiencia({
        producaoPonderada: quantidade * sam,
        funcionarios: 1,
        tempoTrabalhado: tempoProduzido,
      })
    },

    /** Eficiência da OP pelo Tempo de Referência — mesma fórmula oficial. */
    calcularEficienciaOpReferencia(opId) {
      if (!opId) return 0
      const grupo = this.mapaProducaoPorOp.get(opId)
      if (!grupo) return 0
      let producaoPonderada = 0
      let tempoTrabalhado = 0

      for (const func of grupo.funcionarios) {
        for (const linha of func.linhas || []) {
          const sam = this.resolverTempoEfetivoReferencia(func, linha)
          for (const [hora, reg] of Object.entries(linha.registros || {})) {
            if (this.horaBloqueadaPorAusencia(func, hora)) continue
            if (reg && reg.quantidade > 0) {
              producaoPonderada += reg.quantidade * sam
              tempoTrabalhado += reg.tempoProduzido || 60
            }
          }
        }
      }

      return calcularEficiencia({ producaoPonderada, funcionarios: 1, tempoTrabalhado })
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
            // Mesmo raciocínio da capacidade "Ficha": desconta ausência
            // individual antes de estimar a capacidade sem produção ainda
            // lançada.
            const minutosDisponiveis = this.calcularMinutosDisponiveisFuncionario(real)
            capacidade += calcularCapacidade({ funcionarios: 1, tempoTrabalhado: minutosDisponiveis, sam })
          }
        }
      }

      return capacidade
    },

    /**
     * Eficiência do funcionário pelo Tempo de Referência — fórmula
     * oficial, excluindo horas cobertas por ausência.
     */
    calcularEficienciaFuncionarioReferencia(funcionario) {
      if (!funcionario?.linhas?.length) return 0
      let producaoPonderada = 0
      let tempoTrabalhado = 0

      for (const linha of funcionario.linhas) {
        if (!linha?.registros) continue
        const sam = this.resolverTempoEfetivoReferencia(funcionario, linha)
        for (const [hora, reg] of Object.entries(linha.registros)) {
          if (this.horaBloqueadaPorAusencia(funcionario, hora)) continue
          if (reg && reg.quantidade > 0) {
            producaoPonderada += reg.quantidade * sam
            tempoTrabalhado += reg.tempoProduzido || 60
          }
        }
      }

      return calcularEficiencia({ producaoPonderada, funcionarios: 1, tempoTrabalhado })
    },

    /** Eficiência (Referência) de um único registro/hora isolado. */
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

    // ── SALVAMENTO DE PRODUÇÃO ────────────────────────────
    /**
     * Chave única por funcionário + linha + hora. Usar `linha.id` (e não
     * etapaId/opId, que podem mudar enquanto o usuário ainda está
     * configurando a linha) garante que a chave de debounce/estado desta
     * célula não muda por baixo dela mesma.
     */
    chaveRegistro(funcionario, linha, hora) {
      return `${funcionario.email}::${linha.id}::${hora}`
    },

    /**
     * Handler chamado pelo template (@blur na quantidade, @input nos
     * minutos). Cria — de forma lazy — UM debounce independente por
     * célula (funcionário+linha+hora). Isto substitui o debounce único
     * e compartilhado por toda a tela que existia antes: naquele modelo,
     * editar duas células diferentes dentro da janela de 1.5s cancelava
     * o salvamento da primeira, que nunca chegava a ser enviado ao
     * servidor. Com um debounce por célula, edições em células
     * diferentes nunca mais se cancelam entre si.
     */
    onInputQuantidade(funcionario, linha, hora) {
      if (!this._debouncersPorCelula) this._debouncersPorCelula = new Map()

      const chave = this.chaveRegistro(funcionario, linha, hora)

      if (!this._debouncersPorCelula.has(chave)) {
        this._debouncersPorCelula.set(
          chave,
          debounce((f, l, h) => this.executarSalvamento(f, l, h), 1500)
        )
      }

      this._debouncersPorCelula.get(chave)(funcionario, linha, hora)
    },

    /**
     * Envia o registro ao servidor e AGUARDA confirmação (ack) real antes
     * de considerar o valor salvo. Atualiza `registro.status` para dar
     * feedback visual (salvando/salvo/erro) e permitir nova tentativa.
     * Nada aqui é "fire-and-forget": toda falha vira erro visível.
     *
     * Desde que o backend passou a confirmar o evento 'salvar-producao'
     * chamando o callback recebido, o ack é a fonte de verdade real —
     * não há mais necessidade de tratar timeout como "provavelmente
     * salvo mesmo sem confirmação".
     */
    async executarSalvamento(funcionario, linha, hora) {
      if (!funcionario?.email || !linha?.etapaId) return
      const registro = linha.registros[hora]
      if (!registro) return

      const chave = this.chaveRegistro(funcionario, linha, hora)
      const valorAnterior = registro._ultimoValorSalvo
      const payload = {
        funcionarioId: funcionario.email,
        etapaId: linha.etapaId,
        opId: linha.opId || null,
        quantidade: registro.quantidade || 0,
        hora,
        data: this.dataSelecionada,
        estabelecimento: this.store.pegar_usuario.cnpj,
        tipoRegistro: linha.tipo,
        tempoProduzido: registro.tempoProduzido || 60,
      }

      // LOG TEMPORÁRIO — usado apenas para localizar a causa do problema
      // de perda intermitente de registros; remover após confirmar a
      // correção em produção.
      console.log(`[apontamento] ${new Date().toISOString()} alterando registro`, {
        chave, valorAnterior, novoValor: payload.quantidade, payload,
      })

      registro.status = 'salvando'
      registro.erro = null
      this.registrosPendentes.add(chave)

      try {
        if (!socket.connected) {
          throw new Error('Sem conexão com o servidor no momento do envio.')
        }

        const resposta = await this.emitirComAck('salvar-producao', payload, 8000)

        // LOG TEMPORÁRIO
        console.log(`[apontamento] ${new Date().toISOString()} resposta da API`, { chave, resposta })

        if (!resposta || resposta.sucesso === false) {
          throw new Error(resposta?.mensagem || 'Servidor recusou o registro.')
        }

        registro.status = 'salvo'
        registro._ultimoValorSalvo = payload.quantidade
        registro.erro = null
      } catch (err) {
        // LOG TEMPORÁRIO
        console.error(`[apontamento] ${new Date().toISOString()} erro ao salvar registro`, { chave, err })

        registro.status = 'erro'
        registro.erro = err?.message || 'Falha ao salvar. Verifique a conexão e tente novamente.'
      } finally {
        this.registrosPendentes.delete(chave)
      }
    },

    /**
     * Envolve o socket.emit em uma Promise com callback de confirmação
     * (ack) e timeout. O backend confirma o evento 'salvar-producao'
     * chamando o callback recebido, ex.:
     *   socket.on('salvar-producao', async (payload, callback) => {
     *     try {
     *       await salvarNoBanco(payload)
     *       callback({ sucesso: true })
     *     } catch (err) {
     *       callback({ sucesso: false, mensagem: err.message })
     *     }
     *   })
     * O timeout aqui é só uma rede de segurança contra travamentos de
     * rede/servidor (ex.: conexão caiu bem no meio do envio) — em
     * operação normal, quem resolve a Promise é sempre o callback real.
     */
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

    /** Chamado pelo botão "tentar novamente" exibido quando status === 'erro'. */
    async tentarNovamenteRegistro(funcionario, linha, hora) {
      await this.executarSalvamento(funcionario, linha, hora)
    },

    /**
     * Dá flush imediato em todos os debounces de célula pendentes —
     * chamado antes de trocar de data ou desmontar a tela, para não
     * perder uma edição recém-digitada que ainda não completou os
     * 1500ms de espera do debounce.
     */
    flushSalvamentosPendentes() {
      if (!this._debouncersPorCelula) return
      for (const deb of this._debouncersPorCelula.values()) {
        if (typeof deb.flush === 'function') deb.flush()
      }
      // NOVO: também força o envio imediato de salvarMetaDia (que inclui
      // a seleção de etapa de cada linha) — sem isso, uma seleção feita
      // nos últimos 500ms antes de trocar de data ou fechar a tela
      // poderia ficar presa na janela do debounce e nunca ser emitida
      // nesta sessão (a cópia em IndexedDB/localStorage garante que ela
      // não se perde de qualquer forma, mas emitir agora evita depender
      // só da restauração no próximo carregamento).
      if (typeof this.salvarMetaDia.flush === 'function') {
        this.salvarMetaDia.flush()
      }
    },

    /**
     * Antes de qualquer reload de dados vindos do servidor
     * (buscarMetaDia), captura os registros que ainda não têm
     * confirmação de persistência (status 'salvando' ou 'erro'). Sem
     * isso, um reload disparado por troca de data ou por um evento de
     * socket remoto (`nova_atualizacao_*`, que pode vir de QUALQUER
     * alteração feita por qualquer usuário da conta) reconstruía
     * `funcionariosDia` inteiro a partir do servidor e apagava da tela
     * um valor que o usuário tinha acabado de digitar mas que ainda não
     * havia sido confirmado como salvo.
     */
    capturarRegistrosPendentes() {
      const mapa = new Map()
      for (const func of this.funcionariosDia) {
        for (const linha of func.linhas || []) {
          for (const [hora, reg] of Object.entries(linha.registros || {})) {
            if (reg && (reg.status === 'salvando' || reg.status === 'erro')) {
              const chave = `${func.email}::${linha.etapaId}::${linha.opId || ''}::${hora}`
              mapa.set(chave, {
                quantidade: reg.quantidade,
                tempoProduzido: reg.tempoProduzido,
                status: reg.status,
                erro: reg.erro,
              })
            }
          }
        }
      }
      return mapa
    },

    /**
     * Reaplica por cima da estrutura recém-carregada do servidor os
     * valores capturados por `capturarRegistrosPendentes`. Deve ser
     * chamado DEPOIS de `funcionariosDia` já estar populado com os dados
     * vindos do backend (senão não há onde sobrescrever).
     */
    reaplicarRegistrosPendentes(mapa) {
      if (!mapa || !mapa.size) return
      for (const func of this.funcionariosDia) {
        for (const linha of func.linhas || []) {
          for (const hora of Object.keys(linha.registros || {})) {
            const chave = `${func.email}::${linha.etapaId}::${linha.opId || ''}::${hora}`
            const pendente = mapa.get(chave)
            if (pendente) {
              linha.registros[hora] = { ...linha.registros[hora], ...pendente }

              // LOG TEMPORÁRIO
              console.log(`[apontamento] ${new Date().toISOString()} reaplicando valor pendente pós-reload`, {
                funcionario: func.email, hora, pendente,
              })
            }
          }
        }
      }
    },

    // ── META ──────────────────────────────────────────────
    salvarMetaDia: debounce(function () {
      const pecasAtivas = this.opsAtivasComPeca
      const pecasExtras = this.opsExtras.filter(op => op.pecaId)
      // Ausência é uma informação do funcionário, independente de haver
      // OP configurada no topo da tela — sem esta condição extra, marcar
      // ausência antes de configurar qualquer OP no dia seria descartado
      // silenciosamente.
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

          // LOG TEMPORÁRIO — marca o momento exato em que um reload
          // (troca de data, resposta do buscar-meta-dia, ou disparado por
          // `nova_atualizacao_*`) vai reconstruir funcionariosDia.
          console.log(`[apontamento] ${new Date().toISOString()} recarregando dados do servidor`, {
            data: dataDaRequisicao,
          })

          // Captura ANTES de qualquer alteração em funcionariosDia —
          // preserva quantidades ainda não confirmadas como salvas.
          const registrosPendentesAntesDoReload = this.capturarRegistrosPendentes()

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
            this.reaplicarRegistrosPendentes(registrosPendentesAntesDoReload)
            this.sincronizarOpsExtras()
            this.dataCarregada = dataDaRequisicao
            // NOVO: restaura qualquer etapa selecionada offline antes de
            // haver meta salva para o dia (ex.: operador escolheu etapa,
            // ficou sem internet, e a meta nunca chegou a ser criada no
            // servidor) — precisa rodar ANTES de getFaltas só por
            // organização; a ordem entre os dois não afeta o resultado.
            this.restaurarEtapasOffline()
            // NOVO: aplica a ausência automática também quando não há
            // nenhuma meta salva ainda para o dia — sem isso, um dia
            // "em branco" nunca consultaria as faltas.
            this.getFaltas()
            return
          }

          if (meta.pecas?.length) {
            // Uma OP salva anteriormente pode ter mudado de status desde
            // então (ex.: era em_progresso e virou finalizado/coleta).
            // Só reconstruímos o <select> editável do topo para OPs que
            // CONTINUAM em_progresso (this.pecas); as demais viram cards
            // "históricos" (opsExtras), com a OP fixa em texto — do
            // contrário o <select> ficaria em branco por não ter a opção
            // correspondente disponível.
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

              // Estes valores já vieram persistidos do backend, então o
              // status inicial é 'salvo' (não 'idle') — evita que a UI
              // mostre como "não salvo" algo que já está confirmado no
              // banco.
              linha.registros[hora] = {
                quantidade: producao.quantidade_pecas || 0,
                tempoProduzido: producao.tempo_produzido || 60,
                status: 'salvo',
                erro: null,
                _ultimoValorSalvo: producao.quantidade_pecas || 0,
              }
            }

            funcionario.linhas = linhas.length ? linhas : [this.novaLinha('principal')]

            for (const linha of funcionario.linhas) {
              if (linha.etapaId) this.aplicarDadosDaEtapa(funcionario, linha)
            }
          }

          this.reaplicarAlocacoesPendentes(alocacoesPendentes)
          this.reaplicarRegistrosPendentes(registrosPendentesAntesDoReload)

          // Complementa opsExtras com qualquer OP que tenha registro de
          // produção mas não tenha vindo em meta.pecas (ex.: linha extra
          // lançada para uma OP que nunca foi configurada no topo) —
          // mesma lista consolidada usada para montar a tabela.
          this.sincronizarOpsExtras()
          this.dataCarregada = dataDaRequisicao

          // NOVO: restaura qualquer etapa selecionada offline que ainda
          // não foi confirmada pelo servidor — precisa rodar DEPOIS que
          // funcionariosDia já reflete o que veio da meta (para poder
          // comparar e descartar registros offline já confirmados).
          this.restaurarEtapasOffline()

          // NOVO: consulta e aplica automaticamente os registros de
          // ausência do dia — SEMPRE por último, depois que
          // funcionariosDia já está totalmente reconstruído a partir da
          // meta. Se rodasse antes, a reconstrução acima sobrescreveria
          // (com `funcionario.ausencia = metaFunc.ausencia || null`) a
          // ausência recém aplicada. Como getFaltas() é assíncrono e não
          // é aguardado aqui, ele roda logo em seguida sem bloquear o
          // restante do carregamento da tela.
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
      // OPs que já saíram da lista ativa (finalizadas, em coleta, ou
      // removidas do setup) mas têm produção lançada no dia — sintetiza
      // um objeto de OP mínimo (sem meta, pois não sabemos mais a meta
      // configurada) para reaproveitar montarDadosDaOpParaPdf.
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

      // Tempo disponível somado individualmente por funcionário alocado
      // nesta OP (mesmo grupo usado pela tabela), já descontando
      // ausências (total ou parcial) de cada um. Antes usávamos um valor
      // médio fixo (funcionários × minutos padrão do dia inteiro), o que
      // ignorava por completo quem estava ausente parte (ou todo) o
      // expediente.
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

      // Só entra no relatório se o campo realmente existir no cadastro da
      // peça — nunca inventamos "Cliente" ou "Observações" fictícios.
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

.header-actions { display: flex; align-items: center; gap: 10px; }

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

.date-input {
  height: 38px;
  border-radius: 12px;
  border: 1px solid #dceee3;
  padding: 0 14px;
  font-family: inherit;
  background: white;
}
.registro-status {
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
}
.registro-status--salvando { color: #8a6a00; }
.registro-status--erro { color: #b12626; }
.btn-retry-registro {
  border: none;
  background: #ffecec;
  color: #b12626;
  border-radius: 6px;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  cursor: pointer;
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

.col-func     { width: 180px; }
.col-etapa    { width: 230px; }
.col-hora     { width: 170px; }
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

.hora-th { width: 170px; min-width: 170px; text-align: center !important; box-sizing: border-box; }
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

.hora-input {
  width: 52px; height: 32px; border-radius: 8px;
  border: 1px solid #dceee3; text-align: center;
  font-size: 14px; font-weight: 700; font-family: inherit; transition: .15s;
}

.hora-input:focus { outline: none; border-color: #0d6632; }

.hora-input.tem-producao {
  background: #e9f2ff; border-color: #2b77d9; color: #1454ad;
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

/* Mais respiro entre "Efic. Ficha" e "Efic. Ref.": coluna mais larga,
   borda separadora sutil e fundo diferenciado para reforçar que são
   dois indicadores distintos, sem alterar o restante do padrão visual. */
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

.func-info-text { display: flex; flex-direction: column; gap: 4px; }
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
  width: fit-content;
  font-size: 10px;
  font-weight: 700;
  border-radius: 7px;
  padding: 3px 8px;
}

.ausencia-tag--dia_inteiro { background: #f3e6e6; color: #9a4b4b; }
.ausencia-tag--parcial { background: #fff4d6; color: #8a6a00; }

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