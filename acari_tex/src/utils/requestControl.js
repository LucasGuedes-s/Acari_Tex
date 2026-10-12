/**
 * Controle de concorrência das requisições do Linha Tex.
 *
 * Problema que resolve: a mesma tela dispara várias chamadas idênticas ao mesmo
 * tempo (mounted + eventos Socket.IO + intervalos + atualizações reativas), o
 * que gera respostas duplicadas e corrida entre respostas antigas e novas.
 *
 * Uso:
 *   - compartilhar(chave, executor): se já existe uma requisição idêntica em
 *     andamento, devolve a MESMA Promise (dedupe). Caso contrário executa.
 *   - invalidar(chave): marca a requisição em andamento como obsoleta; a próxima
 *     chamada inicia uma nova requisição. Usado após mutações (POST) e em
 *     eventos Socket.IO, para nunca reaproveitar dados anteriores ao evento.
 *   - chaveGet(url, params): chave estável (URL + parâmetros ordenados), para
 *     que filtros diferentes gerem consultas diferentes.
 *   - agrupar(fn, espera): debounce que transforma uma rajada de eventos
 *     (Socket.IO) em uma única execução.
 *   - isCancelado(err): identifica abortos feitos por nós (respostas obsoletas).
 */

const emAndamento = new Map()

/**
 * Compartilha a Promise de uma requisição idêntica que já está em andamento.
 * @param {string} chave identificação da consulta (URL + parâmetros)
 * @param {Function} executor função que dispara a requisição (retorna Promise)
 */
export function compartilhar(chave, executor) {
  const atual = emAndamento.get(chave)
  if (atual && !atual.obsoleta) return atual.promessa

  const entrada = { obsoleta: false }
  entrada.promessa = Promise.resolve()
    .then(executor)
    .finally(() => {
      // só remove a própria entrada (nunca a de uma chamada mais nova)
      if (emAndamento.get(chave) === entrada) emAndamento.delete(chave)
    })
  emAndamento.set(chave, entrada)
  return entrada.promessa
}

/**
 * Marca a requisição em andamento como obsoleta: quem chamar daqui em diante
 * faz uma NOVA requisição em vez de reaproveitar a resposta antiga.
 */
export function invalidar(chave) {
  const entrada = emAndamento.get(chave)
  if (entrada) entrada.obsoleta = true
}

/** Chave estável para GET: URL + parâmetros em ordem determinística. */
export function chaveGet(url, params) {
  if (!params) return `GET|${url}`
  const query = Object.keys(params)
    .sort()
    .filter((k) => params[k] !== undefined && params[k] !== null)
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  return query ? `GET|${url}|${query}` : `GET|${url}`
}

/**
 * Agrupa uma rajada de chamadas em UMA execução (trailing debounce).
 * Ideal para eventos Socket.IO próximos: 10 eventos viram 1 atualização.
 */
export function agrupar(fn, espera = 700) {
  let timer = null
  return function agrupado(...args) {
    const contexto = this
    clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn.apply(contexto, args)
    }, espera)
  }
}

/** true quando o erro é um cancelamento que nós mesmo pedimos (AbortController). */
export function isCancelado(erro) {
  return (
    erro?.code === 'ERR_CANCELED' ||
    erro?.name === 'CanceledError' ||
    erro?.name === 'AbortError'
  )
}

/** Teste/debug: quantas requisições estão em andamento por chave. */
export function emAndamentoAgora() {
  return [...emAndamento.keys()]
}
