<template>
  <div class="d-flex flex-column flex-xl-row">
    <SidebarNav />


    <main class="content-wrapper">
      <carregandoTela v-if="loading" />
      <div v-else class="page-body">

        <!-- ── Top Section ── -->
        <div class="top-section">
          <div class="top-left">
            <h1 class="page-title">Gerenciar Etapas</h1>
            <p class="page-desc">Defina e cronometrize as etapas de produção do seu estabelecimento</p>
          </div>
          <div class="top-right">
            <button class="btn-acao btn-acao--ghost" @click="cadastrarEtapasPorPlanilha">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Importar Planilha
            </button>
            <button class="btn-acao btn-acao--secondary" @click="abrirModalGrupo">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              Novo Grupo
            </button>
            <button class="btn-acao btn-acao--primary" @click="abrirModalNovaEtapa">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nova Etapa
            </button>
          </div>
        </div>

        <!-- ── Filtro ── -->
        <div class="filter-bar">
          <div class="filter-group">
            <svg class="filter-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <select v-model="filtroGrupo" class="filter-select">
              <option value="">Todos os grupos</option>
              <option v-for="grupo in gruposDisponiveis" :key="grupo" :value="grupo">{{ grupo }}</option>
            </select>
          </div>
          <span class="filter-result">{{ etapasFiltradasPorGrupo.length }} etapa{{ etapasFiltradasPorGrupo.length !== 1
            ? 's' : '' }}</span>
        </div>

        <!-- ── Grid de Etapas ── -->
        <div v-if="etapasFiltradasPorGrupo.length === 0" class="empty-state">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
            <circle cx="12" cy="12" r="1" />
            <path
              d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24" />
          </svg>
          <p>Nenhuma etapa encontrada neste grupo</p>
          <small>Crie uma nova etapa para começar</small>
        </div>

        <div v-else class="etapas-grid">
          <div v-for="etapa in etapasFiltradasPorGrupo" :key="etapa.id_da_funcao" class="etapa-card">
            <div class="card-header">
              <div class="card-title-wrap">
                <h3 class="card-title">{{ etapa.descricao }}</h3>
                <span v-if="etapa.grupoEtapa" class="card-badge">{{ etapa.grupoEtapa.nome }}</span>
              </div>
              <div class="card-actions">
                <button class="card-btn card-btn--time" title="Cronoanálise" @click="abrirModalCronoanalise(etapa)">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </button>
                <button class="card-btn card-btn--edit" title="Editar" @click="abrirModalEditar(etapa)">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button class="card-btn card-btn--delete" title="Excluir"
                  @click="confirmarExclusao(etapa.id_da_funcao)">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="card-body">

              <!-- TEMPO PADRÃO -->
              <div class="tempo-principal">
                <div class="tempo-label">
                  Tempo Padrão
                </div>

                <div class="tempo-display">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>

                  <span class="tempo-value">
                    {{ etapa.tempo_padrao || '—' }}
                  </span>

                  <span class="tempo-unit">min</span>
                </div>

                <small class="tempo-origem">
                  Referência da ficha
                </small>
              </div>

              <!-- CRONOANÁLISE -->
              <div v-if="etapa.tempo_referencia?.[0]?.tempo_por_peca" class="crono-box">
                <div class="crono-header">
                  <span>Cronoanálise</span>

                  <span class="crono-status" :class="{
                    melhor: etapa.tempo_referencia[0].tempo_por_peca < etapa.tempo_padrao,
                    pior: etapa.tempo_referencia[0].tempo_por_peca > etapa.tempo_padrao
                  }">
                    {{
                      etapa.tempo_referencia[0].tempo_por_peca < etapa.tempo_padrao ? 'Melhor' : 'Acima' }} </span>
                </div>

                <div class="crono-tempo">
                  {{ etapa.tempo_referencia[0].tempo_por_peca }} min
                </div>

                <small class="crono-info">
                  Tempo real medido na fábrica
                </small>
              </div>

            </div>
          </div>
        </div>

      </div>
    </main>

    <!-- ══════════════════════
         MODAL: NOVA ETAPA
    ══════════════════════ -->
    <transition name="modal-fade">
      <div v-if="showModalNova" class="modal-backdrop" @click.self="showModalNova = false">
        <div class="modal-box">
          <div class="modal-header">
            <div class="modal-header-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <div>
              <h3 class="modal-title">Nova Etapa</h3>
              <p class="modal-subtitle">Cadastre uma nova etapa de produção</p>
            </div>
            <button class="modal-close" @click="showModalNova = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="mfield">
              <label>Descrição da Etapa</label>
              <div class="minput-wrap">
                <svg class="minput-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <input v-model="novaEtapa.descricao" type="text" placeholder="Ex: Costura de bolso" />
              </div>
            </div>

            <div class="mfield">
              <label>Tempo Padrão (minutos)</label>
              <div class="minput-wrap">
                <svg class="minput-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <input v-model.number="novaEtapa.tempo_padrao" type="number" placeholder="Ex: 25" min="0" />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" @click="showModalNova = false">Cancelar</button>
            <button class="btn-save" @click="salvarNovaEtapa">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Criar Etapa
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══════════════════════
         MODAL: EDITAR ETAPA
    ══════════════════════ -->
    <transition name="modal-fade">
      <div v-if="showModalEditar" class="modal-backdrop" @click.self="showModalEditar = false">
        <div class="modal-box">
          <div class="modal-header">
            <div class="modal-header-icon modal-header-icon--edit">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <div>
              <h3 class="modal-title">Editar Etapa</h3>
              <p class="modal-subtitle">Atualize os dados da etapa</p>
            </div>
            <button class="modal-close" @click="showModalEditar = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="mfield">
              <label>Descrição</label>
              <div class="minput-wrap">
                <svg class="minput-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <input v-model="etapaEdicao.descricao" type="text" />
              </div>
            </div>

            <div class="mfield">
              <label>Tempo Padrão (minutos)</label>
              <div class="minput-wrap">
                <svg class="minput-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <input v-model.number="etapaEdicao.tempo_padrao" type="number" min="0" />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="abrirCronometro">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Cronometrar
            </button>
            <div class="modal-footer-right">
              <button class="btn-cancel" @click="showModalEditar = false">Cancelar</button>
              <button class="btn-save" @click="salvarEdicao">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Salvar
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══════════════════════
         MODAL: CRONOANÁLISE
    ══════════════════════ -->
    <transition name="modal-fade">
      <div v-if="showModalCronoanalise" class="modal-backdrop" @click.self="showModalCronoanalise = false">
        <div class="modal-box modal-box--large">
          <div class="modal-header">
            <div class="modal-header-icon modal-header-icon--crono">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <h3 class="modal-title">Cronoanálise: {{ etapaCronoanalise.descricao }}</h3>
              <p class="modal-subtitle">Calcule o tempo padrão da operação</p>
            </div>
            <button class="modal-close" @click="showModalCronoanalise = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div class="modal-body crono-body">

            <!-- Seleção de método -->
            <div class="crono-section">
              <h4 class="crono-section-title">Método de Medição</h4>
              <div class="metodo-buttons">
                <button v-for="metodo in metodos" :key="metodo.value" class="metodo-btn"
                  :class="{ 'metodo-btn--active': cronoanalise.tipo_medicao === metodo.value }"
                  @click="cronoanalise.tipo_medicao = metodo.value">
                  <span class="metodo-icon">{{ metodo.icon }}</span>
                  <span class="metodo-label">{{ metodo.label }}</span>
                </button>
              </div>
              <p class="metodo-desc">{{ descricaoMetodo }}</p>
            </div>

            <!-- Funcionário -->
            <div class="crono-section">
              <label class="section-label">Funcionário</label>
              <div class="mselect-wrap">
                <svg class="mselect-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                <select v-model="cronoanalise.id_funcionario">
                  <option value="">Selecione um funcionário</option>
                  <option v-for="f in funcionarios" :key="f.email" :value="f.email">{{ f.nome }}</option>
                </select>
              </div>
            </div>

            <!-- Conteúdo específico por método -->
            <div class="crono-content">

              <!-- CONTÍNUA -->
              <div v-if="cronoanalise.tipo_medicao === 'continua'" class="crono-method">
                <div class="method-grid">
                  <div class="mfield">
                    <label>Tempo Total do Lote (min)</label>
                    <div class="minput-wrap">
                      <input v-model.number="cronoanalise.tempo_total" type="number" step="0.01"
                        placeholder="Ex: 2.36" />
                    </div>
                  </div>
                  <div class="mfield">
                    <label>Nº de Operações</label>
                    <div class="minput-wrap">
                      <input v-model.number="cronoanalise.quantidade_ciclos" type="number" placeholder="Ex: 18" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- REPETITIVA -->
              <div v-if="cronoanalise.tipo_medicao === 'repetitiva'" class="crono-method">
                <div class="mfield">
                  <label>Tempos por Ciclo (min)</label>
                  <div class="ciclos-list">
                    <div v-for="(t, i) in cronoanalise.tempos_ciclos" :key="i" class="ciclo-badge">
                      <span>{{ Number(t).toFixed(2) }} min</span>
                      <button class="ciclo-remove" @click="removerCiclo(i)">×</button>
                    </div>
                  </div>
                  <div class="add-ciclo">
                    <div class="minput-wrap">
                      <input v-model.number="novoCiclo" type="number" step="0.01" placeholder="Ex: 0.14"
                        @keyup.enter="adicionarCiclo" />
                    </div>
                    <button class="btn-add-ciclo" @click="adicionarCiclo">Adicionar</button>
                  </div>
                </div>

                <div class="mfield">
                  <label>Limite de Variação (%)</label>
                  <div class="minput-wrap">
                    <input v-model.number="cronoanalise.limite_variacao_pct" type="number" min="1" max="50"
                      placeholder="10" />
                  </div>
                  <small class="mfield-hint">Ciclos fora de ±{{ cronoanalise.limite_variacao_pct || 10 }}% serão
                    descartados</small>
                </div>
              </div>

              <!-- UPH -->
              <div v-if="cronoanalise.tipo_medicao === 'uph'" class="crono-method">
                <div class="mfield">
                  <label>Peças Produzidas em 1 Hora</label>
                  <div class="minput-wrap">
                    <input v-model.number="cronoanalise.quantidade_hora" type="number" placeholder="Ex: 420" />
                  </div>
                </div>
              </div>

            </div>

            <!-- Fatores comuns -->
            <div class="crono-section">
              <h4 class="crono-section-title">Fatores de Ajuste</h4>
              <div class="method-grid">
                <div class="mfield">
                  <label>Fator de Ritmo (%)</label>
                  <div class="minput-wrap">
                    <input v-model.number="cronoanalise.fator_ritmo_pct" type="number" placeholder="100" min="1" />
                  </div>
                  <small class="mfield-hint">100% = ritmo normal. 110% = 10% acima</small>
                </div>
                <div class="mfield">
                  <label>Tolerância (%)</label>
                  <div class="minput-wrap">
                    <input v-model.number="cronoanalise.percentual_tolerancia_pct" type="number" placeholder="10"
                      min="0" />
                  </div>
                  <small class="mfield-hint">Pessoal + Fadiga. Padrão: 10%</small>
                </div>
              </div>
            </div>

            <!-- Dados operacionais -->
            <div class="crono-section">
              <h4 class="crono-section-title">Dados Operacionais</h4>
              <div class="method-grid">
                <div class="mfield">
                  <label>Máquina</label>
                  <div class="minput-wrap">
                    <input v-model="cronoanalise.maquina" type="text" placeholder="Ex: Reta 03" />
                  </div>
                </div>
                <div class="mfield">
                  <label>Tipo de Operação</label>
                  <div class="minput-wrap">
                    <input v-model="cronoanalise.tipo_operacao" type="text" placeholder="Ex: costura" />
                  </div>
                </div>
                <div class="mfield">
                  <label>Data</label>
                  <div class="minput-wrap">
                    <input v-model="cronoanalise.data_medicao" type="date" />
                  </div>
                </div>
                <div class="mfield">
                  <label>OP (opcional)</label>
                  <div class="minput-wrap">
                    <input v-model.number="cronoanalise.opId" type="number" placeholder="ID da OP" />
                  </div>
                </div>
              </div>
              <div class="mfield">
                <label>Observações</label>
                <textarea v-model="cronoanalise.observacoes" placeholder="Condições da medição, turno, etc."
                  rows="2"></textarea>
              </div>
            </div>

            <!-- Preview -->
            <div v-if="previewCronoanalise" class="crono-preview">
              <h4 class="preview-title">Resultado Calculado</h4>
              <div class="preview-grid">
                <div class="preview-item">
                  <span class="preview-label">TC (Cronometrado)</span>
                  <span class="preview-value">{{ previewCronoanalise.TC }}</span>
                  <span class="preview-unit">min</span>
                </div>
                <div class="preview-item">
                  <span class="preview-label">TN (Normal)</span>
                  <span class="preview-value">{{ previewCronoanalise.TN }}</span>
                  <span class="preview-unit">min</span>
                </div>
                <div class="preview-item preview-item--highlight">
                  <span class="preview-label">TP (Padrão)</span>
                  <span class="preview-value preview-value--large">{{ previewCronoanalise.TP }}</span>
                  <span class="preview-unit">min</span>
                </div>
              </div>
            </div>

          </div>

          <div class="modal-footer">
            <button class="btn-cancel" @click="showModalCronoanalise = false">Cancelar</button>
            <button class="btn-save" @click="salvarCronoanalise" :disabled="salvandoCrono">
              <div v-if="salvandoCrono" class="btn-spinner"></div>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {{ salvandoCrono ? 'Salvando...' : 'Salvar Cronoanálise' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══════════════════════
         MODAL: NOVO GRUPO
    ══════════════════════ -->
    <transition name="modal-fade">
      <div v-if="showModalGrupo" class="modal-backdrop" @click.self="showModalGrupo = false">
        <div class="modal-box">
          <div class="modal-header">
            <div class="modal-header-icon modal-header-icon--grupo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </div>
            <div>
              <h3 class="modal-title">Novo Grupo</h3>
              <p class="modal-subtitle">Agrupe etapas semelhantes</p>
            </div>
            <button class="modal-close" @click="showModalGrupo = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="mfield">
              <label>Nome do Grupo</label>
              <div class="minput-wrap">
                <svg class="minput-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                </svg>
                <input v-model="novoGrupo.nome" type="text" placeholder="Ex: Pregar Bolso" />
              </div>
            </div>

            <div class="mfield">
              <label>Descrição (opcional)</label>
              <textarea v-model="novoGrupo.descricao" placeholder="Descreva as etapas deste grupo..."
                rows="2"></textarea>
            </div>

            <div class="mfield">
              <label>Etapas do Grupo</label>
              <div class="etapas-check-list">
                <div v-for="etapa in etapas" :key="etapa.id_da_funcao" class="check-item">
                  <input type="checkbox" :id="`etapa-check-${etapa.id_da_funcao}`"
                    :checked="novoGrupo.etapasSelecionadas.includes(etapa.id_da_funcao)"
                    @change="toggleEtapa(etapa.id_da_funcao)" />
                  <label :for="`etapa-check-${etapa.id_da_funcao}`">{{ etapa.descricao }}</label>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" @click="showModalGrupo = false">Cancelar</button>
            <button class="btn-save" @click="salvarGrupoEtapas">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Criar Grupo
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══════════════════════
         MODAL: CRONÔMETRO
    ══════════════════════ -->
    <transition name="modal-fade">
      <div v-if="showModalCronometro" class="modal-backdrop" @click.self="showModalCronometro = false">
        <div class="modal-box modal-box--cronometro">
          <div class="modal-header">
            <h3 class="modal-title">Cronômetro</h3>
            <button class="modal-close" @click="showModalCronometro = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div class="modal-body cronometro-body">
            <div class="tempo-display-large">{{ formatarTempo(tempo) }}</div>
            <div class="cronometro-buttons">
              <button class="btn-crono btn-crono--primary" @click="iniciarCronometro" v-if="!rodando">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Iniciar
              </button>
              <button class="btn-crono btn-crono--danger" @click="pararCronometro" v-if="rodando">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                Parar
              </button>
              <button class="btn-crono btn-crono--success" @click="usarTempo" v-if="!rodando && tempo > 0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Usar Tempo
              </button>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" @click="showModalCronometro = false">Fechar</button>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<script>
import SidebarNav from "@/components/Sidebar.vue"
import carregandoTela from "@/components/carregandoTela.vue"
import { useAuthStore } from "@/store/store"
import api from "@/Axios"
import Swal from "sweetalert2"

export default {
  name: "EtapasView",
  components: { SidebarNav, carregandoTela },

  setup() {
    const store = useAuthStore()
    return { store }
  },

  data() {
    return {
      loading: true,
      etapas: [],
      funcionarios: [],
      filtroGrupo: "",

      // Modais
      showModalNova: false,
      showModalEditar: false,
      showModalCronoanalise: false,
      showModalGrupo: false,
      showModalCronometro: false,

      // Etapa
      novaEtapa: { descricao: "", tempo_padrao: null },
      etapaEdicao: { id_da_funcao: null, descricao: "", tempo_padrao: null },
      etapaCronoanalise: { id_da_funcao: null, descricao: "" },

      // Grupo
      novoGrupo: { nome: "", descricao: "", etapasSelecionadas: [] },

      // Cronoanálise
      salvandoCrono: false,
      novoCiclo: null,
      cronoanalise: this.cronoanaliseInicial(),
      metodos: [
        { value: "continua", label: "Contínua", icon: "⏱️" },
        { value: "repetitiva", label: "Repetitiva", icon: "🔄" },
        { value: "uph", label: "UPH", icon: "📦" },
      ],

      // Cronômetro
      tempo: 0,
      rodando: false,
      intervalo: null,
    }
  },

  computed: {
    gruposDisponiveis() {
      const grupos = this.etapas.map(e => e.grupoEtapa?.nome).filter(Boolean)
      return [...new Set(grupos)]
    },

    etapasFiltradasPorGrupo() {
      if (!this.filtroGrupo) return this.etapas
      return this.etapas.filter(e => e.grupoEtapa?.nome === this.filtroGrupo)
    },

    descricaoMetodo() {
      const map = {
        continua: "Cronometre o lote inteiro e informe o tempo total e a quantidade de peças.",
        repetitiva: "Informe o tempo de cada ciclo individualmente. Anomalias serão descartadas automaticamente.",
        uph: "Conte quantas peças o operador produz em 1 hora no ritmo normal.",
      }
      return map[this.cronoanalise.tipo_medicao] || ""
    },

    previewCronoanalise() {
      try {
        const v = (this.cronoanalise.fator_ritmo_pct || 100) / 100
        const E = (this.cronoanalise.percentual_tolerancia_pct || 10) / 100
        let TC = null

        if (this.cronoanalise.tipo_medicao === "continua") {
          const total = this.cronoanalise.tempo_total
          const ciclos = this.cronoanalise.quantidade_ciclos
          if (total > 0 && ciclos > 0) TC = total / ciclos
        } else if (this.cronoanalise.tipo_medicao === "repetitiva") {
          const ciclos = this.cronoanalise.tempos_ciclos.filter(t => t > 0)
          if (ciclos.length > 0) {
            const mediaProv = ciclos.reduce((a, b) => a + b, 0) / ciclos.length
            const lim = (this.cronoanalise.limite_variacao_pct || 10) / 100
            const validos = ciclos.filter(t => t >= mediaProv * (1 - lim) && t <= mediaProv * (1 + lim))
            if (validos.length > 0) TC = validos.reduce((a, b) => a + b, 0) / validos.length
          }
        } else if (this.cronoanalise.tipo_medicao === "uph") {
          const qh = this.cronoanalise.quantidade_hora
          if (qh > 0) TC = 60 / qh
        }

        if (!TC) return null
        const TN = TC * v
        const TP = TN * (1 + E)
        return {
          TC: TC.toFixed(4),
          TN: TN.toFixed(4),
          TP: TP.toFixed(4),
        }
      } catch {
        return null
      }
    },
  },

  methods: {
    cronoanaliseInicial() {
      return {
        id_funcionario: "",
        tipo_medicao: "continua",
        tempo_total: null,
        quantidade_ciclos: null,
        tempos_ciclos: [],
        limite_variacao_pct: 10,
        quantidade_hora: null,
        fator_ritmo_pct: 100,
        percentual_tolerancia_pct: 10,
        maquina: "",
        tipo_operacao: "",
        data_medicao: new Date().toISOString().split("T")[0],
        opId: null,
        observacoes: "",
      }
    },

    // ── Etapas ──
    async buscarEtapas() {
      try {
        const { data } = await api.get("/etapas/estabelecimento", {
          headers: { Authorization: this.store.pegar_token },
        })
        this.etapas = data.etapa || []
        console.log("Etapas carregadas:", this.etapas)
      } catch (error) {
        console.error("Erro ao buscar etapas:", error)
      } finally {
        this.loading = false
      }
    },

    abrirModalNovaEtapa() {
      this.novaEtapa = { descricao: "", tempo_padrao: null }
      this.showModalNova = true
    },

    async salvarNovaEtapa() {
      if (!this.novaEtapa.descricao) {
        return Swal.fire("Aviso", "A descrição é obrigatória.", "warning")
      }
      try {
        await api.post("/adicionar/etapa", this.novaEtapa, {
          headers: { Authorization: this.store.pegar_token },
        })
        Swal.fire({ icon: "success", title: "Etapa criada!", timer: 1500, showConfirmButton: false })
        this.showModalNova = false
        this.buscarEtapas()
      } catch {
        Swal.fire("Erro", "Não foi possível criar a etapa.", "error")
      }
    },

    abrirModalEditar(etapa) {
      this.etapaEdicao = { ...etapa }
      this.showModalEditar = true
    },

    async salvarEdicao() {
      try {
        await api.put(`/etapas/${this.etapaEdicao.id_da_funcao}`, this.etapaEdicao, {
          headers: { Authorization: this.store.pegar_token },
        })
        Swal.fire({ icon: "success", title: "Etapa atualizada!", timer: 1500, showConfirmButton: false })
        this.showModalEditar = false
        this.buscarEtapas()
      } catch {
        Swal.fire("Erro", "Não foi possível salvar a etapa.", "error")
      }
    },

    async confirmarExclusao(id) {
      const { isConfirmed } = await Swal.fire({
        title: "Excluir Etapa?",
        text: "Esta ação não pode ser desfeita.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sim, excluir",
        cancelButtonText: "Cancelar",
      })
      if (isConfirmed) {
        try {
          await api.delete(`/etapa/${id}`, {
            headers: { Authorization: this.store.pegar_token },
          })
          Swal.fire({ icon: "success", title: "Excluída!", timer: 1500, showConfirmButton: false })
          this.buscarEtapas()
        } catch {
          Swal.fire("Erro", "Não foi possível excluir a etapa.", "error")
        }
      }
    },

    // ── Cronômetro ──
    abrirCronometro() {
      this.tempo = 0
      this.rodando = false
      this.showModalCronometro = true
    },

    iniciarCronometro() {
      this.rodando = true
      this.intervalo = setInterval(() => {
        this.tempo++
      }, 1000)
    },

    pararCronometro() {
      this.rodando = false
      clearInterval(this.intervalo)
    },

    usarTempo() {
      const minutos = Math.round(this.tempo / 60)
      this.etapaEdicao.tempo_padrao = minutos
      this.showModalCronometro = false
      Swal.fire({
        icon: "success",
        title: "Tempo adicionado!",
        text: `${minutos} min`,
        timer: 1500,
        showConfirmButton: false,
      })
    },

    formatarTempo(segundos) {
      const m = Math.floor(segundos / 60)
      const s = segundos % 60
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    },

    // ── Cronoanálise ──
    async buscarFuncionarios() {
      try {
        const { data } = await api.get("/Funcionarios", {
          headers: { Authorization: this.store.pegar_token },
        })
        this.funcionarios = data.funcionarios || []
      } catch (error) {
        console.error("Erro ao buscar funcionários:", error)
      }
    },

    abrirModalCronoanalise(etapa) {
      this.etapaCronoanalise = { ...etapa }
      this.cronoanalise = this.cronoanaliseInicial()
      this.showModalCronoanalise = true
      this.buscarFuncionarios()
    },

    adicionarCiclo() {
      if (this.novoCiclo && this.novoCiclo > 0) {
        this.cronoanalise.tempos_ciclos.push(this.novoCiclo)
        this.novoCiclo = null
      }
    },

    removerCiclo(index) {
      this.cronoanalise.tempos_ciclos.splice(index, 1)
    },

    async salvarCronoanalise() {
      if (!this.cronoanalise.id_funcionario) {
        return Swal.fire("Aviso", "Selecione um funcionário.", "warning")
      }

      const payload = {
        id_da_funcao: this.etapaCronoanalise.id_da_funcao,
        id_funcionario: this.cronoanalise.id_funcionario,
        tipo_medicao: this.cronoanalise.tipo_medicao,
        fator_ritmo: (this.cronoanalise.fator_ritmo_pct || 100) / 100,
        percentual_tolerancia: (this.cronoanalise.percentual_tolerancia_pct || 10) / 100,
        maquina: this.cronoanalise.maquina || null,
        tipo_operacao: this.cronoanalise.tipo_operacao || null,
        data_medicao: this.cronoanalise.data_medicao || null,
        opId: this.cronoanalise.opId || null,
        observacoes: this.cronoanalise.observacoes || null,
        ...(this.cronoanalise.tipo_medicao === "continua" && {
          tempo_total: this.cronoanalise.tempo_total,
          quantidade_ciclos: this.cronoanalise.quantidade_ciclos,
        }),
        ...(this.cronoanalise.tipo_medicao === "repetitiva" && {
          tempos_ciclos: this.cronoanalise.tempos_ciclos,
          limite_variacao: (this.cronoanalise.limite_variacao_pct || 10) / 100,
        }),
        ...(this.cronoanalise.tipo_medicao === "uph" && {
          quantidade_hora: this.cronoanalise.quantidade_hora,
        }),
      }

      if (payload.tipo_medicao === "continua" && (!payload.tempo_total || !payload.quantidade_ciclos)) {
        return Swal.fire("Aviso", "Informe o tempo total e a quantidade de operações.", "warning")
      }
      if (payload.tipo_medicao === "repetitiva" && payload.tempos_ciclos.length === 0) {
        return Swal.fire("Aviso", "Adicione ao menos um tempo de ciclo.", "warning")
      }
      if (payload.tipo_medicao === "uph" && !payload.quantidade_hora) {
        return Swal.fire("Aviso", "Informe a quantidade de peças produzidas em 1 hora.", "warning")
      }

      try {
        this.salvandoCrono = true
        const { data } = await api.post("/cronoanalise", payload, {
          headers: { Authorization: this.store.pegar_token },
        })
        const tp = data.cronanalise?.tempo_padrao_TP
        this.showModalCronoanalise = false
        Swal.fire({
          icon: "success",
          title: "Cronoanálise salva!",
          html: `<strong>${tp} min</strong>`,
          timer: 2000,
          showConfirmButton: false,
        })
        this.buscarEtapas()
      } catch {
        Swal.fire("Erro", "Não foi possível salvar a cronoanálise.", "error")
      } finally {
        this.salvandoCrono = false
      }
    },

    // ── Grupo ──
    abrirModalGrupo() {
      this.novoGrupo = { nome: "", descricao: "", etapasSelecionadas: [] }
      this.showModalGrupo = true
    },

    toggleEtapa(id) {
      const idx = this.novoGrupo.etapasSelecionadas.indexOf(id)
      idx === -1
        ? this.novoGrupo.etapasSelecionadas.push(id)
        : this.novoGrupo.etapasSelecionadas.splice(idx, 1)
    },

    async salvarGrupoEtapas() {
      if (!this.novoGrupo.nome) {
        return Swal.fire("Aviso", "O nome do grupo é obrigatório.", "warning")
      }
      try {
        await api.post("/adicionar/etapa/grupo", this.novoGrupo, {
          headers: { Authorization: this.store.pegar_token },
        })
        Swal.fire({ icon: "success", title: "Grupo criado!", timer: 1500, showConfirmButton: false })
        this.showModalGrupo = false
        this.buscarEtapas()
      } catch {
        Swal.fire("Erro", "Não foi possível criar o grupo.", "error")
      }
    },

    async cadastrarEtapasPorPlanilha() {
      const { value: file } = await Swal.fire({
        title: "Importar Planilha",
        text: "Selecione um arquivo Excel (.xlsx)",
        input: "file",
        inputAttributes: { accept: ".xlsx" },
        showCancelButton: true,
        confirmButtonText: "Enviar",
      })
      if (file) {
        const formData = new FormData()
        formData.append("arquivo", file)
        try {
          Swal.fire({
            title: "Importando...",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
          })
          await api.post("/etapas/upload", formData, {
            headers: { Authorization: this.store.pegar_token, "Content-Type": "multipart/form-data" },
          })
          Swal.close()
          Swal.fire({ icon: "success", title: "Importado!", timer: 1500, showConfirmButton: false })
          this.buscarEtapas()
        } catch {
          Swal.close()
          Swal.fire("Erro", "Não foi possível importar a planilha.", "error")
        }
      }
    },
  },

  mounted() {
    this.buscarEtapas()
    this.buscarFuncionarios()
  },
}
</script>

<style scoped>
/* ── Root ── */
.page-root {
  display: flex;
  min-height: 100vh;
}

.content-wrapper {
  flex: 1;
  padding-left: 220px;
  min-height: 100vh;
}

.page-body {
  padding: 2.5rem 2rem 3rem;
}

/* ── Top Section ── */
.top-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  margin-bottom: 2rem;
}

.top-left {
  flex: 1;
  text-align: left;
}

.page-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #a8d8b8;
  color: #0a3d20;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 5px 14px;
  border-radius: 100px;
  margin-bottom: 8px;
}

.page-title {
  font-family: "Syne", sans-serif;
  font-size: 32px;
  font-weight: 700;
  color: #052e14;
  margin: 0 0 4px;
  line-height: 1.1;
}

.page-desc {
  font-size: 14px;
  color: #7aaa8c;
  margin: 0;
}

.top-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-acao {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 18px;
  border-radius: 10px;
  font-family: "DM Sans", sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-acao--primary {
  background: #0e6632;
  color: #fff;
  box-shadow: 0 4px 12px rgba(14, 102, 50, 0.3);
}

.btn-acao--primary:hover {
  background: #0a4d26;
  transform: translateY(-1px);
}

.btn-acao--secondary {
  background: #d0edda;
  color: #0a3d20;
  border: 1.5px solid rgba(14, 102, 50, 0.25);
}

.btn-acao--secondary:hover {
  background: #b8dfc8;
  border-color: #0e6632;
}

.btn-acao--ghost {
  background: transparent;
  color: #2d6644;
  border: 1.5px solid rgba(14, 102, 50, 0.3);
}

.btn-acao--ghost:hover {
  background: #eef6f1;
  border-color: #0e6632;
}

/* ── Filter Bar ── */
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border: 1px solid rgba(10, 80, 40, 0.12);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(10, 80, 40, 0.05);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
}

.filter-icon {
  color: #1a8a46;
  flex-shrink: 0;
}

.filter-select {
  background: #eef6f1;
  border: 1.5px solid rgba(10, 80, 40, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  font-family: "DM Sans", sans-serif;
  font-size: 13px;
  color: #0f1f16;
  outline: none;
  appearance: none;
  cursor: pointer;
  min-width: 180px;
  transition: border-color 0.2s;
}

.filter-select:focus {
  border-color: #1a8a46;
  box-shadow: 0 0 0 3px rgba(26, 138, 70, 0.12);
}

.filter-result {
  font-size: 12px;
  color: #7aaa8c;
  font-weight: 500;
}

/* ── Grid de Etapas ── */
.etapas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
}

.etapa-card {
  background: #fff;
  border: 1px solid rgba(10, 80, 40, 0.1);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(10, 80, 40, 0.06);
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
}

.etapa-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 24px rgba(10, 80, 40, 0.12);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 1.25rem;
  border-bottom: 1px solid #eef6f1;
}

.card-title-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-title {
  font-size: 16px;
  display: flex;
  font-weight: 700;
  color: #052e14;
  margin: 0;
  line-height: 1.3;
  word-break: break-word;
}

.card-badge {
  display: inline-flex;
  background: #d0edda;
  color: #0a3d20;
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 500;
  width: fit-content;
}

.card-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.card-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  background: #f5f7f6;
  color: #4a7a5c;
}

.card-btn:hover {
  background: #eef6f1;
  transform: scale(1.08);
}

.card-btn--time:hover {
  background: #d0edda;
  color: #0e6632;
}

.card-btn--edit:hover {
  background: #cfe2ff;
  color: #1d4ed8;
}

.card-btn--delete:hover {
  background: #ffe8e8;
  color: #dc3545;
}

.card-body {
  padding: 1.25rem;
  flex: 1;
}

.tempo-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tempo-principal {
  background: #f8fafc;
  border-radius: 14px;
  padding: 14px;
}

.tempo-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: .5px;
}

.tempo-display {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tempo-value {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.tempo-unit {
  font-size: 13px;
  color: #64748b;
}

.tempo-origem {
  display: block;
  margin-top: 6px;
  color: #94a3b8;
  font-size: 11px;
}

.crono-box {
  border: 1px solid #dbeafe;
  background: #f8fbff;
  border-radius: 12px;
  padding: 12px;
}

.crono-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.crono-header span:first-child {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.crono-status {
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.crono-status.melhor {
  background: #dcfce7;
  color: #166534;
}

.crono-status.pior {
  background: #fee2e2;
  color: #991b1b;
}

.crono-tempo {
  font-size: 18px;
  font-weight: 700;
  color: #2563eb;
}

.crono-info {
  color: #64748b;
  font-size: 11px;
}

.tempo-display {
  display: flex;
  align-items: baseline;
  gap: 8px;
  background: #f0faf4;
  border: 1.5px solid #d0edda;
  border-radius: 10px;
  padding: 12px 14px;
}

.tempo-display svg {
  color: #0e6632;
  flex-shrink: 0;
}

.tempo-value {
  font-family: "Syne", sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: #052e14;
}

.tempo-unit {
  font-size: 13px;
  color: #7aaa8c;
  font-weight: 500;
}

/* ── Empty State ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 3.5rem 2rem;
  color: #90bb9e;
  text-align: center;
}

.empty-state svg {
  color: #d0edda;
}

.empty-state p {
  font-size: 15px;
  color: #4a7a5c;
  margin: 0;
  font-weight: 500;
}

.empty-state small {
  font-size: 13px;
  color: #90bb9e;
}

/* ══════════════════════
   MODAIS — COMPARTILHADO
══════════════════════ */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 1rem;
}

.modal-box {
  background: #fff;
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 24px 64px rgba(5, 46, 20, 0.28);
  overflow: hidden;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-box--large {
  max-width: 680px;
}

.modal-box--cronometro {
  max-width: 320px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #eef6f1;
  flex-shrink: 0;
}

.modal-header-icon {
  width: 42px;
  height: 42px;
  background: #d0edda;
  border: 1px solid rgba(14, 102, 50, 0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0e6632;
  flex-shrink: 0;
}

.modal-header-icon--edit {
  background: #cfe2ff;
  border-color: rgba(29, 78, 216, 0.2);
  color: #1d4ed8;
}

.modal-header-icon--crono {
  background: #ffeaa7;
  border-color: rgba(255, 193, 7, 0.2);
  color: #f39c12;
}

.modal-header-icon--grupo {
  background: #e1d5ff;
  border-color: rgba(109, 40, 217, 0.2);
  color: #6d28d9;
}

.modal-title {
  font-family: "Syne", sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #052e14;
  margin: 0;
}

.modal-subtitle {
  font-size: 12px;
  color: #7aaa8c;
  margin: 3px 0 0;
}

.modal-close {
  background: #eef6f1;
  border: none;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4a7a5c;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s, color 0.2s;
}

.modal-close:hover {
  background: #d0edda;
  color: #0e6632;
}

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  overflow-y: auto;
}

/* ── Modal Fields ── */
.mfield {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mfield label {
  display: flex;
  font-size: 12px;
  font-weight: 600;
  color: #2d6644;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.minput-wrap,
.mselect-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.minput-icon,
.mselect-icon {
  position: absolute;
  left: 12px;
  color: #1a8a46;
  pointer-events: none;
  flex-shrink: 0;
}

textarea {
  width: 100%;
  padding: 10px 14px 10px 38px;
  background: #eef6f1;
  border: 1.5px solid rgba(10, 80, 40, 0.18);
  border-radius: 10px;
  font-family: "DM Sans", sans-serif;
  font-size: 13px;
  color: #0f1f16;
  outline: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  resize: vertical;
}

.minput-wrap input,
.minput-wrap textarea,
.mselect-wrap select {
  width: 100%;
  padding: 10px 14px 10px 38px;
  background: #eef6f1;
  border: 1.5px solid rgba(10, 80, 40, 0.18);
  border-radius: 10px;
  font-family: "DM Sans", sans-serif;
  font-size: 13px;
  color: #0f1f16;
  outline: none;
  appearance: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  resize: vertical;
}

.minput-wrap input:focus,
.minput-wrap textarea:focus,
.mselect-wrap select:focus {
  border-color: #1a8a46;
  box-shadow: 0 0 0 3px rgba(26, 138, 70, 0.12);
  background: #fff;
}

.minput-wrap input::placeholder,
.minput-wrap textarea::placeholder {
  color: #90bb9e;
}

.mfield-hint {
  font-size: 11px;
  color: #7aaa8c;
  margin-top: 2px;
}

.method-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

/* ── Cronoanálise ── */
.crono-body {
  gap: 0;
  padding: 0;
}

.crono-section {
  padding: 1.5rem;
  border-bottom: 1px solid #eef6f1;
}

.crono-section:last-child {
  border-bottom: none;
}

.crono-section-title {
  font-family: "Syne", sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #052e14;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 1rem;
}

.metodo-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.metodo-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 120px;
  padding: 10px 14px;
  background: #f5f7f6;
  border: 1.5px solid rgba(10, 80, 40, 0.15);
  border-radius: 10px;
  font-family: "DM Sans", sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #4a7a5c;
  cursor: pointer;
  transition: all 0.2s;
}

.metodo-btn:hover {
  background: #eef6f1;
  border-color: #0e6632;
}

.metodo-btn--active {
  background: #0e6632;
  border-color: #0e6632;
  color: #fff;
}

.metodo-icon {
  font-size: 16px;
}

.metodo-label {
  flex: 1;
  text-align: left;
}

.metodo-desc {
  font-size: 12px;
  color: #7aaa8c;
  margin-top: 8px;
  margin-bottom: 0;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: #2d6644;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
}

.crono-content {
  padding: 1.5rem;
  border-bottom: 1px solid #eef6f1;
  background: #f9fcfa;
}

.crono-method {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ciclos-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.ciclo-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #d0edda;
  color: #0a3d20;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
}

.ciclo-remove {
  background: none;
  border: none;
  color: #0e6632;
  font-size: 18px;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  transition: transform 0.2s;
}

.ciclo-remove:hover {
  transform: scale(1.2);
}

.add-ciclo {
  display: flex;
  gap: 8px;
}

.btn-add-ciclo {
  padding: 10px 14px;
  background: #0e6632;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-family: "DM Sans", sans-serif;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.btn-add-ciclo:hover {
  background: #0a4d26;
}

.crono-preview {
  padding: 1.5rem;
  background: linear-gradient(135deg, #eef6f1, #f0faf4);
  border: 1px solid #a8d8b8;
  border-radius: 14px;
  border-left: 4px solid #0e6632;
}

.preview-title {
  font-family: "Syne", sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: #052e14;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 1rem;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.preview-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 10px;
}

.preview-item--highlight {
  background: #fff;
  padding: 12px;
}

.preview-label {
  font-size: 10px;
  font-weight: 600;
  color: #4a7a5c;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.preview-value {
  font-family: "Syne", sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #052e14;
}

.preview-value--large {
  font-size: 24px;
  color: #0e6632;
}

.preview-unit {
  font-size: 11px;
  color: #7aaa8c;
  font-weight: 500;
}

/* ── Footer ── */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid #eef6f1;
  background: #f9fcfa;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.modal-footer-right {
  display: flex;
  gap: 8px;
}

.btn-cancel {
  padding: 9px 18px;
  border: 1.5px solid rgba(10, 80, 40, 0.2);
  background: transparent;
  border-radius: 8px;
  font-family: "DM Sans", sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #4a7a5c;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #eef6f1;
  border-color: #0e6632;
}

.btn-save {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 20px;
  background: #0e6632;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-family: "DM Sans", sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(14, 102, 50, 0.3);
  transition: all 0.2s;
}

.btn-save:hover {
  background: #0a4d26;
  transform: translateY(-1px);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  background: transparent;
  color: #0e6632;
  border: 1.5px solid rgba(14, 102, 50, 0.3);
  border-radius: 8px;
  font-family: "DM Sans", sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #eef6f1;
  border-color: #0e6632;
}

.btn-spinner {
  width: 13px;
  height: 13px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Cronômetro ── */
.cronometro-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 2rem 1.5rem;
}

.tempo-display-large {
  font-family: "Syne", sans-serif;
  font-size: 52px;
  font-weight: 700;
  color: #0e6632;
  font-variant-numeric: tabular-nums;
}

.cronometro-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-crono {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-family: "DM Sans", sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-crono--primary {
  background: #0e6632;
  color: #fff;
  box-shadow: 0 4px 12px rgba(14, 102, 50, 0.3);
}

.btn-crono--primary:hover {
  background: #0a4d26;
  transform: translateY(-1px);
}

.btn-crono--danger {
  background: #dc3545;
  color: #fff;
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
}

.btn-crono--danger:hover {
  background: #c82333;
}

.btn-crono--success {
  background: #198754;
  color: #fff;
  box-shadow: 0 4px 12px rgba(25, 135, 84, 0.3);
}

.btn-crono--success:hover {
  background: #157347;
}

/* ── Transição modal ── */
.modal-fade-enter-active {
  transition: all 0.25s ease;
}

.modal-fade-leave-active {
  transition: all 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-box,
.modal-fade-leave-to .modal-box {
  transform: scale(0.95) translateY(12px);
}

/* ── Responsivo ── */
@media (max-width: 768px) {
  .content-wrapper {
    padding-left: 0;
  }

  .page-body {
    padding: 1.5rem 1rem;
  }

  .top-section {
    flex-direction: column;
    gap: 1rem;
  }

  .top-right {
    width: 100%;
  }

  .btn-acao {
    flex: 1;
    justify-content: center;
  }

  .etapas-grid {
    grid-template-columns: 1fr;
  }

  .method-grid {
    grid-template-columns: 1fr;
  }

  .preview-grid {
    grid-template-columns: 1fr;
  }

  .modal-box {
    max-width: 90%;
  }
}
</style>