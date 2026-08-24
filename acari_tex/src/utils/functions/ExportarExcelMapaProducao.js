import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

/**
 * Exporta a produção no formato de mapa horizontal:
 *
 *   HORÁRIO | FUNCIONÁRIO 1 | FUNCIONÁRIO 2 | ...
 *   07:00   | etapa/qtd/efic| etapa/qtd/efic| ...
 *   ...
 *   TOTAL   | soma          | soma          | ...
 *   EFIC.   | eficiência    | eficiência    | ...
 *
 * @param {Object} opts
 * @param {Array}  opts.funcionariosDia  — lista de funcionários (com .linhas[].registros)
 * @param {Array}  opts.horas            — array de strings "07:00", "08:00", ...
 * @param {Function} opts.calcularTotalLinha      — (linha, funcionario) => number
 * @param {Function} opts.calcularEficienciaLinhaRef — (funcionario, linha) => number (%)
 * @param {Function} opts.resolverTempoEfetivoReferencia — (funcionario, linha) => number (SAM)
 * @param {Function} opts.calcularMinutosDisponiveisFuncionario — (funcionario) => number
 * @param {Function} opts.calcularEficiencia — ({ producaoPonderada, funcionarios, tempoTrabalhado }) => number
 * @param {Function} opts.horaBloqueadaPorAusencia — (funcionario, hora) => boolean
 * @param {string}   opts.dataProducao    — data selecionada (YYYY-MM-DD)
 * @param {string}   opts.turno           — 'Manhã' | 'Tarde'
 * @param {string}   opts.empresa         — nome/cnpj da empresa
 */
export async function exportarMapaProducaoExcel({
  funcionariosDia,
  horas,
  resolverTempoEfetivoReferencia,
  calcularEficiencia,
  horaBloqueadaPorAusencia,
  dataProducao,
  turno,
  empresa,
}) {
  if (!funcionariosDia?.length || !horas?.length) return

  // ── Cores ────────────────────────────────────────────────
  const VERDE_ESCURO = '0D3927'
  const VERDE_MEDIO  = '164B33'
  const VERDE_CLARO  = 'E7F8EF'
  const BRANCO       = 'FFFFFFFF'
  const CINZA_CLARO  = 'F5F5F5'
  const CINZA_TEXTO  = '666666'

  // ── Workbook ─────────────────────────────────────────────
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Linha Tex'
  wb.created = new Date()

  const ws = wb.addWorksheet('Mapa de Produção', {
    views: [{ state: 'frozen', ySplit: 5 }],
  })

  // ── Cabeçalho do relatório ───────────────────────────────
  const rowEmpresa = ws.addRow(['LINHA TEX'])
  rowEmpresa.font = { bold: true, size: 14, color: { argb: VERDE_ESCURO } }

  const rowTitulo = ws.addRow(['RELATÓRIO DE PRODUÇÃO — MAPA HORIZONTAL'])
  rowTitulo.font = { bold: true, size: 12, color: { argb: VERDE_MEDIO } }

  const dataFormatada = dataProducao
    ? new Date(dataProducao + 'T12:00:00').toLocaleDateString('pt-BR')
    : '-'
  ws.addRow([
    `Período: ${dataFormatada}${turno ? ` | Turno: ${turno}` : ''}${empresa ? ` | ${empresa}` : ''}`,
  ])
  ws.addRow([]) // linha em branco

  // ── Construir mapa de dados ──────────────────────────────
  // Mapa[hora][email] = [{ etapa, quantidade, tempoReferencia, eficiencia }]
  const mapa = {}
  const horasSet = new Set(horas)

  // Filtrar funcionários com pelo menos uma linha com etapa
  const funcsComProducao = funcionariosDia.filter(f =>
    (f.linhas || []).some(l => l.etapaId)
  )

  for (const func of funcsComProducao) {
    for (const linha of func.linhas || []) {
      if (!linha?.registros || !linha.etapaId) continue

      const sam = resolverTempoEfetivoReferencia(func, linha)
      const etapaLabel = linha.descricao || 'Etapa'

      for (const [hora, reg] of Object.entries(linha.registros)) {
        if (!horasSet.has(hora)) continue
        if (!reg || !reg.quantidade || reg.quantidade <= 0) continue
        if (horaBloqueadaPorAusencia(func, hora)) continue

        if (!mapa[hora]) mapa[hora] = {}
        if (!mapa[hora][func.email]) mapa[hora][func.email] = []

        // Eficiência por registro (mesma lógica da tela)
        const tempoProduzido = reg.tempoProduzido || 60
        const producaoPonderada = reg.quantidade * sam
        const efic = calcularEficiencia({
          producaoPonderada,
          funcionarios: 1,
          tempoTrabalhado: tempoProduzido,
        })

        mapa[hora][func.email].push({
          etapa: etapaLabel,
          quantidade: reg.quantidade,
          tempoReferencia: sam,
          eficiencia: efic,
        })
      }
    }
  }

  // ── Linha de cabeçalho da tabela ─────────────────────────
  const headerRow = ['HORÁRIO']
  for (const func of funcsComProducao) {
    headerRow.push(func.nome || func.email)
  }
  const headerExcelRow = ws.addRow(headerRow)
  headerExcelRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colNumber === 1 ? VERDE_ESCURO : VERDE_MEDIO },
    }
    cell.font = { bold: true, color: { argb: BRANCO }, size: 11 }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    }
  })

  // ── Linhas de dados (uma por hora) ───────────────────────
  let totalProduzidoPorFunc = {} // email -> total

  for (const func of funcsComProducao) {
    totalProduzidoPorFunc[func.email] = 0
  }

  for (const hora of horas) {
    const row = [hora]

    for (const func of funcsComProducao) {
      const registros = mapa[hora]?.[func.email] || []

      if (registros.length === 0) {
        row.push('')
        continue
      }

      // Montar texto da célula (uma linha por registro)
      const partes = []
      for (const reg of registros) {
        partes.push(`${reg.etapa}`)
        partes.push(`${reg.quantidade} peças`)
        partes.push(`${reg.eficiencia}%`)
      }
      row.push(partes.join('\n'))
    }

    // Adicionar linha na planilha
    const dataRow = ws.addRow(row)
    dataRow.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: 'middle', wrapText: true }
      cell.border = {
        top: { style: 'hair', color: { argb: 'DDDDDD' } },
        left: { style: 'thin' },
        bottom: { style: 'hair', color: { argb: 'DDDDDD' } },
        right: { style: 'thin' },
      }
      if (colNumber === 1) {
        cell.font = { bold: true, color: { argb: CINZA_TEXTO } }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: CINZA_CLARO },
        }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      }
    })
  }

  // ── Recalcular totais corretamente ───────────────────────
  // Refazer acumulação com acesso aos registros reais
  const producaoPonderadaPorFunc = {}
  const tempoTrabalhadoPorFunc = {}

  for (const func of funcsComProducao) {
    totalProduzidoPorFunc[func.email] = 0
    producaoPonderadaPorFunc[func.email] = 0
    tempoTrabalhadoPorFunc[func.email] = 0

    for (const linha of func.linhas || []) {
      if (!linha?.registros || !linha.etapaId) continue
      const sam = resolverTempoEfetivoReferencia(func, linha)

      for (const [hora, reg] of Object.entries(linha.registros)) {
        if (!horasSet.has(hora)) continue
        if (!reg || !reg.quantidade || reg.quantidade <= 0) continue
        if (horaBloqueadaPorAusencia(func, hora)) continue

        totalProduzidoPorFunc[func.email] += reg.quantidade
        producaoPonderadaPorFunc[func.email] += reg.quantidade * sam
        tempoTrabalhadoPorFunc[func.email] += reg.tempoProduzido || 60
      }
    }
  }

  // ── Linha separatoria ────────────────────────────────────
  const sepRow = ws.addRow([])
  sepRow.eachCell(cell => {
    cell.border = {
      top: { style: 'medium', color: { argb: VERDE_MEDIO } },
      bottom: { style: 'medium', color: { argb: VERDE_MEDIO } },
    }
  })

  // ── Linha: TOTAL PRODUZIDO ───────────────────────────────
  const totalRow = ['TOTAL PRODUZIDO']
  for (const func of funcsComProducao) {
    const total = totalProduzidoPorFunc[func.email] || 0
    totalRow.push(total > 0 ? total : '')
  }
  const totalExcelRow = ws.addRow(totalRow)
  totalExcelRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: VERDE_CLARO },
    }
    cell.font = { bold: true, size: 11, color: { argb: VERDE_ESCURO } }
    cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'left' : 'center' }
    cell.border = {
      top: { style: 'medium' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' },
    }
  })

  // ── Linha: EFICIÊNCIA FINAL ──────────────────────────────
  const eficRow = ['EFICIÊNCIA FINAL']
  for (const func of funcsComProducao) {
    const pp = producaoPonderadaPorFunc[func.email] || 0
    const tt = tempoTrabalhadoPorFunc[func.email] || 0
    const efic = calcularEficiencia({
      producaoPonderada: pp,
      funcionarios: 1,
      tempoTrabalhado: tt,
    })
    eficRow.push(efic > 0 ? `${efic}%` : '')
  }
  const eficExcelRow = ws.addRow(eficRow)
  eficExcelRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: VERDE_ESCURO },
    }
    cell.font = { bold: true, size: 11, color: { argb: BRANCO } }
    cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'left' : 'center' }
    cell.border = {
      top: { style: 'medium' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' },
    }
  })

  // ── Ajustar largura das colunas ──────────────────────────
  ws.getColumn(1).width = 16 // HORÁRIO
  for (let i = 2; i <= funcsComProducao.length + 1; i++) {
    ws.getColumn(i).width = 24
  }

  // ── Ajustar altura das linhas de dados ───────────────────
  for (let r = 6; r <= 5 + horas.length; r++) {
    const row = ws.getRow(r)
    let maxLines = 1
    row.eachCell(cell => {
      if (cell.value && typeof cell.value === 'string') {
        const lines = cell.value.split('\n').length
        if (lines > maxLines) maxLines = lines
      }
    })
    row.height = Math.max(maxLines * 15, 20)
  }

  // ── Congelar cabeçalho ───────────────────────────────────
  ws.views = [{ state: 'frozen', ySplit: 5, xSplit: 1 }]

  // ── Gerar arquivo ────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const nomeArquivo = `Mapa_Producao_${dataFormatada.replace(/\//g, '-')}_${turno || 'todos'}.xlsx`
  saveAs(new Blob([buffer]), nomeArquivo)
}
