import Swal from 'sweetalert2'
import api from '@/Axios'

// Estado module-level (não reativo — não alimenta nenhum template),
// sobrevive entre lançamentos dentro da mesma sessão de página.
const estadoPorChave = new Map() // chave -> { travado: bool, ultimoAlertaEm: number|null }

function chaveMonitor(funcionarioId, opId, etapaId) {
  return `${funcionarioId}::${opId || 'sem-op'}::${etapaId}`
}

export function useMonitorProdutividade(opts = {}) {
  const limiarEficiencia = opts.limiarEficiencia ?? 80
  const intervaloMs = (opts.intervaloMinutos ?? 30) * 60 * 1000

  async function registrarAlertaNoBackend(payload, token) {
    try {
      // ⚠️ Endpoint provisório — ver observação sobre o backend abaixo.
      await api.post('/alertas/produtividade', payload, {
        headers: { Authorization: token },
      })
    } catch (err) {
      console.error('Não foi possível registrar o alerta de produtividade no backend.', err)
    }
  }

  function exibirAlerta({
      nome,
      opNome,
      etapaNome,
      eficiencia,
      esperadoPorHora,
      registradoPorHora,
    }) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: `${nome} está abaixo da meta, verifique o que está acontecendo.`,
        html: `
          <div style="font-size:12px; text-align:left;">
            <div><strong>OP:</strong> ${opNome}</div>
            <div><strong>Etapa:</strong> ${etapaNome}</div>
            <div><strong>Eficiência:</strong> ${eficiencia}%</div>
            <div>${registradoPorHora} / ${esperadoPorHora} peças/h</div>
          </div>
        `,
        showConfirmButton: false,
        timer: 15000,
        timerProgressBar: true,
        width: '360px',
        padding: '0.8rem',
        customClass: {
          popup: 'swal-produtividade-toast',
        },
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer)
          toast.addEventListener('mouseleave', Swal.resumeTimer)
        },
      })
    }

  /**
   * Chamar após CADA lançamento confirmado pelo backend. Recalcula com
   * a regra já decidida pelo chamador (Ficha ou Referência) e decide se
   * dispara alerta, respeitando a trava por período configurável.
   */
  function verificar({ funcionario, linha, eficiencia, esperadoPorHora, registradoPorHora, quantidade, tempoTrabalhado, opNome, empresaId, tempoPadrao, tempoReferencia, token }) {
    if (!linha?.etapaId) return
    // Sem volume suficiente pra avaliar ainda — não julga com dado incompleto.
    if (!tempoTrabalhado || !quantidade) return

    const chave = chaveMonitor(funcionario.email, linha.opId, linha.etapaId)
    const estado = estadoPorChave.get(chave) || { travado: false, ultimoAlertaEm: null }

    if (eficiencia >= limiarEficiencia) {
      // Voltou ao normal — destrava para permitir novo alerta se cair de novo.
      if (estado.travado) estadoPorChave.set(chave, { travado: false, ultimoAlertaEm: estado.ultimoAlertaEm })
      return
    }

    const dentroDoIntervalo = estado.travado && estado.ultimoAlertaEm && (Date.now() - estado.ultimoAlertaEm) < intervaloMs
    if (dentroDoIntervalo) return

    estadoPorChave.set(chave, { travado: true, ultimoAlertaEm: Date.now() })

    exibirAlerta({
      nome: funcionario.nome || funcionario.email,
      opNome: opNome || linha.opId || '—',
      etapaNome: linha.descricao || linha.etapaId,
      eficiencia,
      esperadoPorHora,
      registradoPorHora,
    })

    registrarAlertaNoBackend({
      estabelecimento: empresaId,
      funcionarioId: funcionario.nome || funcionario.email,
      opId: linha.opId,
      etapaId: linha.etapaId,
      eficiencia,
      tempoUtilizado: tempoTrabalhado,
      tempoPadrao,
      tempoReferencia,
      quantidadeProduzida: quantidade,
      horario: new Date().toISOString(),
      tipo: 'baixa_produtividade',
    }, token)
  }

  function resetar() {
    estadoPorChave.clear()
  }

  return { verificar, resetar }
}