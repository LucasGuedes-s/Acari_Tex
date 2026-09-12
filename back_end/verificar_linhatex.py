"""
Verificador do lado do Linha Tex — contrato HTTP do CycleCount.

Este script testa se o endpoint do Linha Tex está preparado para receber
eventos enviados pelo CycleCount.

Testa:

1. Evento de ciclo aceito
2. Evento de resumo aceito
3. Idempotência por event_id
4. Tolerância a campos desconhecidos
5. Recusa de evento inválido
6. Rajada de eventos
7. Autenticação por API Key
8. API Key inválida
9. Diagnóstico detalhado das respostas

Uso:

    python verificar_linhatex.py \\
        --url http://localhost:3333/cyclecount/webhook \\
        --api-key "SUA_API_KEY"

Também é possível alterar o tamanho da rajada:

    python verificar_linhatex.py \\
        --url http://localhost:3333/cyclecount/webhook \\
        --api-key "SUA_API_KEY" \\
        --rajada 50

IMPORTANTE:

Este script não acessa o banco de dados do Linha Tex.

Ele verifica o contrato HTTP.

A idempotência pode ser parcialmente verificada pelo comportamento HTTP.
A confirmação definitiva de que uma duplicata não gerou uma segunda produção
depende da implementação do backend/banco.
"""
from __future__ import annotations

import argparse
import json
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone


# ============================================================
# CORES
# ============================================================

VERDE = "\033[32m"
VERMELHO = "\033[31m"
AMARELO = "\033[33m"
AZUL = "\033[36m"
CINZA = "\033[90m"
NEGRITO = "\033[1m"
FIM = "\033[0m"


# ============================================================
# UTILITÁRIOS
# ============================================================

def agora(desloc_s: float = 0.0) -> str:
    """
    Retorna timestamp UTC ISO 8601.
    """
    return (
        datetime.now(timezone.utc)
        + timedelta(seconds=desloc_s)
    ).isoformat()


def novo_event_id() -> str:
    """
    Gera um event_id único.
    """
    return str(uuid.uuid4())


# ============================================================
# EVENTOS
# ============================================================

def evento_ciclo(
    event_id: str,
    session_id: str,
    cycle_id: int = 1,
    **extra
) -> dict:
    """
    Evento individual de ciclo/peça.
    """

    corpo = {
        "type": "cycle",

        # Identificadores
        "event_id": event_id,
        "cycle_id": cycle_id,
        "session_id": session_id,

        # Contexto da produção
        "station_id": "07",
        "operator_id": "maria",
        "op_id": "123",
        "operation": "revisão (0.46 min)",

        "estabelecimento_cnpj": "12345678",

        # Estado
        "state": "CONFIRMED",
        "cycle_completed": True,

        # Tempo
        "started_at": agora(-32.5),
        "ended_at": agora(),
        "duration_s": 32.5,
        "sewing_time_s": 28.0,

        # IA / visão computacional
        "confidence": 0.87,

        # Origem
        "source": "cyclecount",

        # Informações opcionais
        "video_offset_s": None,
    }

    # Permite adicionar campos extras para testes
    corpo.update(extra)

    return corpo


def evento_resumo(
    event_id: str,
    session_id: str,
    ids: list[str]
) -> dict:
    """
    Evento de resumo de uma janela de produção.
    """

    return {
        "type": "summary",

        # Identificação
        "event_id": event_id,

        # Estação
        "station_id": "07",
        "estabelecimento_cnpj": "12345678",

        # Janela analisada
        "window_start": agora(-900),
        "window_end": agora(),

        # Quantidade
        "pieces": len(ids),
        "event_ids": ids,

        # Contexto
        "session_id": session_id,
        "operator_id": "maria",
        "op_id": "123",
        "operation": "corte",

        # Estado da câmera
        "camera_online": True,

        # Origem
        "source": "cyclecount",
    }


# ============================================================
# ENVIO HTTP
# ============================================================

def enviar(
    url: str,
    corpo: dict,
    api_key: str | None,
    timeout: float = 15.0,
):
    """
    Envia um evento para o webhook.

    Autenticação:
        x-api-key

    NÃO utiliza JWT.

    O CycleCount é tratado como serviço externo e utiliza uma
    API Key própria para comunicação serviço → serviço.
    """

    dados = json.dumps(
        corpo, ensure_ascii=False
    ).encode("utf-8")

    event_id = corpo.get("event_id", "")

    cabecalhos = {
        "Content-Type": "application/json",

        # Header adicional para facilitar rastreamento.
        "X-Cyclecount-Event-Id": str(event_id),

        # Identificação do cliente.
        "User-Agent": "CycleCount-Verificador/1.0",
    }

    # ========================================================
    # AUTENTICAÇÃO
    # ========================================================

    if api_key:
        cabecalhos["x-api-key"] = api_key

    req = urllib.request.Request(
        url,
        data=dados,
        headers=cabecalhos,
        method="POST",
    )

    try:
        with urllib.request.urlopen(
            req, timeout=timeout
        ) as resposta:

            corpo_resposta = (
                resposta
                .read(1000)
                .decode("utf-8", "replace")
            )

            return (
                resposta.status,
                corpo_resposta
            )

    except urllib.error.HTTPError as erro:

        corpo_resposta = (
            erro
            .read(1000)
            .decode("utf-8", "replace")
        )

        return (
            erro.code,
            corpo_resposta
        )

    except Exception as erro:

        return (
            None,
            f"{type(erro).__name__}: {erro}"
        )


# ============================================================
# SUCESSO HTTP
# ============================================================

def sucesso(status) -> bool:
    """
    Retorna True para HTTP 2xx.
    """

    return (
        status is not None
        and 200 <= status < 300
    )


def cliente_error(status) -> bool:
    """
    Retorna True para HTTP 4xx.
    """

    return (
        status is not None
        and 400 <= status < 500
    )


# ============================================================
# CRIAÇÃO DE SESSÃO
# ============================================================

def criar_sessao(
    url_base: str,
    api_key: str | None,
    cnpj: str = "12345678",
    station_id: str = "07",
    operator_id: str = "maria",
    op_id: str = "123",
    operation: str = "revisão (0.46 min)",
    timeout: float = 15.0,
) -> str | None:
    """
    Cria uma sessão via API externa e retorna o session_id.
    Retorna None se falhar.
    """

    # A URL base termina com /cyclecount/webhook
    # A rota de sessão externa é /cyclecount/sessions/external
    url_sessions = url_base.replace(
        "/cyclecount/webhook",
        "/cyclecount/sessions/external"
    )

    corpo = {
        "estabelecimento_cnpj": cnpj,
        "station_id": station_id,
        "operator_id": operator_id,
        "op_id": op_id,
        "operation": operation,
    }

    dados = json.dumps(
        corpo, ensure_ascii=False
    ).encode("utf-8")

    cabecalhos = {
        "Content-Type": "application/json",
        "User-Agent": "CycleCount-Verificador/1.0",
    }

    if api_key:
        cabecalhos["x-api-key"] = api_key

    req = urllib.request.Request(
        url_sessions,
        data=dados,
        headers=cabecalhos,
        method="POST",
    )

    try:
        with urllib.request.urlopen(
            req, timeout=timeout
        ) as resposta:

            corpo_resposta = json.loads(
                resposta.read(1000).decode("utf-8", "replace")
            )

            session_id = corpo_resposta.get("session_id")

            if session_id:
                return session_id

            print(
                f"  {AMARELO}AVISO {FIM}"
                f"Sessão criada mas session_id não retornado."
            )
            return None

    except Exception as erro:
        print(
            f"  {AMARELO}AVISO {FIM}"
            f"Falha ao criar sessão: {erro}"
        )
        return None


# ============================================================
# RELATÓRIO
# ============================================================

class Relatorio:

    def __init__(self) -> None:
        self.itens: list[
            tuple[str, str, str]
        ] = []

    def ok(
        self, titulo: str, detalhe: str = ""
    ) -> None:

        self.itens.append(
            ("ok", titulo, detalhe)
        )

        print(
            f"  {VERDE}OK    {FIM}"
            f"{titulo}"
            + (
                f"  {CINZA}{detalhe}{FIM}"
                if detalhe
                else ""
            )
        )

    def falha(
        self, titulo: str, detalhe: str
    ) -> None:

        self.itens.append(
            ("falha", titulo, detalhe)
        )

        print(
            f"  {VERMELHO}FALHA {FIM}"
            f"{titulo}\n"
            f"         "
            f"{VERMELHO}{detalhe}{FIM}"
        )

    def aviso(
        self, titulo: str, detalhe: str
    ) -> None:

        self.itens.append(
            ("aviso", titulo, detalhe)
        )

        print(
            f"  {AMARELO}AVISO {FIM}"
            f"{titulo}\n"
            f"         "
            f"{AMARELO}{detalhe}{FIM}"
        )

    @property
    def falhas(self) -> int:

        return sum(
            1
            for tipo, _, _
            in self.itens
            if tipo == "falha"
        )

    @property
    def avisos(self) -> int:

        return sum(
            1
            for tipo, _, _
            in self.itens
            if tipo == "aviso"
        )


# ============================================================
# MAIN
# ============================================================

def main() -> int:

    parser = argparse.ArgumentParser(
        description=(
            "Verifica o endpoint HTTP do CycleCount "
            "no Linha Tex"
        )
    )

    parser.add_argument(
        "--url",
        required=True,
        help=(
            "URL completa do webhook. "
            "Ex: http://localhost:3333/cyclecount/webhook"
        ),
    )

    parser.add_argument(
        "--api-key",
        default=None,
        help=(
            "API Key utilizada pelo CycleCount. "
            "Será enviada no header x-api-key."
        ),
    )

    parser.add_argument(
        "--rajada",
        type=int,
        default=20,
        help=(
            "Quantidade de eventos enviados "
            "no teste de rajada. Padrão: 20."
        ),
    )

    parser.add_argument(
        "--timeout",
        type=float,
        default=15.0,
        help=(
            "Timeout de cada requisição em segundos. "
            "Padrão: 15."
        ),
    )

    args = parser.parse_args()

    relatorio = Relatorio()

    print()
    print(
        f"{NEGRITO}{AZUL}"
        "============================================================"
        f"{FIM}"
    )

    print(
        f"{NEGRITO}"
        "VERIFICADOR DO WEBHOOK CYCLECOUNT — LINHA TEX"
        f"{FIM}"
    )

    print(
        f"{NEGRITO}{AZUL}"
        "============================================================"
        f"{FIM}"
    )

    print()
    print(f"URL: {args.url}")

    if args.api_key:
        print(
            f"Autenticação: "
            f"{VERDE}x-api-key configurada{FIM}"
        )
    else:
        print(
            f"Autenticação: "
            f"{AMARELO}nenhuma API Key fornecida{FIM}"
        )

    print()

    # ========================================================
    # 0. CRIAR SESSÃO DINAMICAMENTE
    # ========================================================

    print(
        f"{NEGRITO}0. Preparação{FIM}"
    )

    session_id = criar_sessao(
        args.url,
        args.api_key,
        timeout=args.timeout,
    )

    if not session_id:
        print(
            f"\n{VERMELHO}{NEGRITO}"
            "Não foi possível criar sessão. "
            "Abortando verificações."
            f"{FIM}"
        )
        return 1

    print(
        f"  {VERDE}OK    {FIM}"
        f"Sessão criada: {session_id}"
    )

    # ========================================================
    # 1. CAMINHO FELIZ
    # ========================================================

    print()
    print(
        f"{NEGRITO}1. O básico{FIM}"
    )

    id_um = novo_event_id()

    st, corpo = enviar(
        args.url,
        evento_ciclo(id_um, session_id),
        args.api_key,
        args.timeout,
    )

    if st is None:

        relatorio.falha(
            "evento de peça aceito",
            (
                "não foi possível chegar ao endpoint — "
                f"{corpo}"
            ),
        )

    elif sucesso(st):

        relatorio.ok(
            "evento de peça aceito",
            f"HTTP {st}",
        )

    else:

        relatorio.falha(
            "evento de peça aceito",
            (
                f"esperava 2xx e veio HTTP {st}: "
                f"{corpo[:300]}"
            ),
        )

    # --------------------------------------------------------
    # RESUMO
    # --------------------------------------------------------

    id_resumo = novo_event_id()

    st, corpo = enviar(
        args.url,
        evento_resumo(
            id_resumo,
            session_id,
            [id_um],
        ),
        args.api_key,
        args.timeout,
    )

    if sucesso(st):

        relatorio.ok(
            "evento de resumo aceito",
            f"HTTP {st}",
        )

    else:

        relatorio.falha(
            "evento de resumo aceito",
            (
                f"esperava 2xx e veio HTTP {st}. "
                "O resumo (`type: \"summary\"`) deve chegar "
                "no MESMO endpoint e ser roteado pelo campo `type`. "
                f"Resposta: {corpo[:300]}"
            ),
        )

    # ========================================================
    # 2. IDEMPOTÊNCIA
    # ========================================================

    print()
    print(
        f"{NEGRITO}"
        "2. Duplicata — o que impede peça contada em dobro"
        f"{FIM}"
    )

    st, corpo = enviar(
        args.url,
        evento_ciclo(id_um, session_id),
        args.api_key,
        args.timeout,
    )

    idempotencia_provada = False

    if st == 409:

        idempotencia_provada = True
        relatorio.ok(
            "reenvio do mesmo event_id recusado com 409",
            "idempotência explícita",
        )

    elif sucesso(st):

        relatorio.aviso(
            "reenvio do mesmo event_id aceito com 2xx",
            (
                "pode estar correto se o backend ignorou "
                "silenciosamente a duplicata, mas o teste HTTP "
                "não consegue provar que não houve segunda produção. "
                "Idealmente, responder 409 para duplicata."
            ),
        )

    elif st is None:

        relatorio.falha(
            "reenvio do mesmo event_id",
            (
                "endpoint ficou inalcançável — "
                f"{corpo}"
            ),
        )

    else:

        relatorio.falha(
            "reenvio do mesmo event_id",
            (
                f"veio HTTP {st}. "
                "Esperado 409 ou 2xx. "
                f"Resposta: {corpo[:300]}"
            ),
        )

    # ========================================================
    # 3. TOLERÂNCIA A CAMPOS NOVOS
    # ========================================================

    print()
    print(
        f"{NEGRITO}"
        "3. Tolerância a campo novo"
        f"{FIM}"
    )

    evento_novo = evento_ciclo(
        novo_event_id(),
        session_id,

        campo_que_ainda_nao_existe="valor",

        outro_campo_futuro={
            "a": 1
        },
        metadata_futura={
            "versao": 2,
            "teste": True
        },
    )

    st, corpo = enviar(
        args.url,
        evento_novo,
        args.api_key,
        args.timeout,
    )

    if sucesso(st):

        relatorio.ok(
            "campo desconhecido não quebra",
            f"HTTP {st}",
        )

    elif st in (400, 422):

        relatorio.falha(
            "campo desconhecido não quebra",
            (
                f"HTTP {st}. "
                "O backend aparentemente está rejeitando "
                "campos adicionais. "
                f"Resposta: {corpo[:300]}"
            ),
        )

    else:

        relatorio.falha(
            "campo desconhecido não quebra",
            (
                f"veio HTTP {st}. "
                f"Resposta: {corpo[:300]}"
            ),
        )

    # ========================================================
    # 4. EVENTO INVÁLIDO
    # ========================================================

    print()
    print(
        f"{NEGRITO}"
        "4. Evento inválido"
        f"{FIM}"
    )

    evento_ruim = evento_ciclo(
        novo_event_id(),
        session_id,
    )

    # Remove o event_id propositalmente
    del evento_ruim["event_id"]

    st, corpo = enviar(
        args.url,
        evento_ruim,
        args.api_key,
        args.timeout,
    )

    if st in (400, 422):

        relatorio.ok(
            "evento sem event_id é recusado",
            f"HTTP {st}",
        )

    elif st in (401, 403):

        relatorio.falha(
            "evento sem event_id é recusado",
            (
                f"veio HTTP {st} por autenticação. "
                "O teste não conseguiu chegar à validação "
                "do event_id."
            ),
        )

    elif st and 500 <= st < 600:

        relatorio.falha(
            "evento sem event_id é recusado",
            (
                f"veio HTTP {st}. "
                "Evento inválido deve retornar 4xx, "
                "não 5xx."
            ),
        )

    elif sucesso(st):

        relatorio.falha(
            "evento sem event_id é recusado",
            (
                f"veio HTTP {st}. "
                "Um evento sem identificador não deveria "
                "ser aceito."
            ),
        )

    else:

        relatorio.falha(
            "evento sem event_id é recusado",
            (
                f"veio HTTP {st}. "
                f"Resposta: {corpo[:300]}"
            ),
        )

    # ========================================================
    # 5. RAJADA
    # ========================================================

    print()
    print(
        f"{NEGRITO}"
        f"5. Rajada de {args.rajada} eventos"
        f"{FIM}"
    )

    codigos: dict[int | None, int] = {}

    for i in range(args.rajada):

        event_id = novo_event_id()

        evento = evento_ciclo(
            event_id,
            session_id,
            cycle_id=100 + i,
        )

        st, _ = enviar(
            args.url,
            evento,
            args.api_key,
            args.timeout,
        )

        codigos[st] = (
            codigos.get(st, 0) + 1
        )

    bons = sum(
        quantidade
        for codigo, quantidade
        in codigos.items()
        if sucesso(codigo)
    )

    if bons == args.rajada:

        relatorio.ok(
            f"todos os {args.rajada} aceitos",
            (
                "a fila foi processada sem "
                "respostas de erro"
            ),
        )

    else:

        relatorio.falha(
            f"todos os {args.rajada} aceitos",
            (
                f"aceitos {bons}/{args.rajada}. "
                f"Respostas: {codigos}"
            ),
        )

    # ========================================================
    # 6. AUTENTICAÇÃO
    # ========================================================

    print()
    print(
        f"{NEGRITO}"
        "6. Autenticação"
        f"{FIM}"
    )

    if args.api_key:

        # ----------------------------------------------------
        # API KEY CORRETA
        # ----------------------------------------------------

        st, corpo = enviar(
            args.url,
            evento_ciclo(
                novo_event_id(),
                session_id,
                cycle_id=999,
            ),
            args.api_key,
            args.timeout,
        )

        if sucesso(st):

            relatorio.ok(
                "API Key correta é aceita",
                f"HTTP {st}",
            )

        else:

            relatorio.falha(
                "API Key correta é aceita",
                (
                    f"veio HTTP {st}. "
                    f"Resposta: {corpo[:300]}"
                ),
            )

        # ----------------------------------------------------
        # API KEY ERRADA
        # ----------------------------------------------------

        st, corpo = enviar(
            args.url,
            evento_ciclo(
                novo_event_id(),
                session_id,
                cycle_id=1000,
            ),
            "api-key-errada-de-proposito",
            args.timeout,
        )

        if st in (401, 403):

            relatorio.ok(
                "API Key errada é recusada",
                f"HTTP {st}",
            )

        elif sucesso(st):

            relatorio.falha(
                "API Key errada é recusada",
                (
                    f"veio HTTP {st}. "
                    "O endpoint aceitou uma API Key inválida."
                ),
            )

        else:

            relatorio.falha(
                "API Key errada é recusada",
                (
                    f"veio HTTP {st}. "
                    f"Resposta: {corpo[:300]}"
                ),
            )

    else:

        relatorio.aviso(
            "autenticação",
            (
                "nenhuma API Key foi fornecida. "
                "Use --api-key para testar autenticação."
            ),
        )

    # ========================================================
    # 7. DIAGNÓSTICO FINAL
    # ========================================================

    print()
    print(
        f"{AZUL}"
        "============================================================"
        f"{FIM}"
    )

    print(
        f"{NEGRITO}"
        "RESULTADO"
        f"{FIM}"
    )

    print(
        f"{AZUL}"
        "============================================================"
        f"{FIM}"
    )

    print()

    total = len(relatorio.itens)

    print(
        f"Total de verificações: {total}"
    )

    print(
        f"{VERDE}OK: {total - relatorio.falhas - relatorio.avisos}{FIM}"
    )

    print(
        f"{AMARELO}Avisos: {relatorio.avisos}{FIM}"
    )

    print(
        f"{VERMELHO}Falhas: {relatorio.falhas}{FIM}"
    )

    print()

    # ========================================================
    # CONCLUSÃO
    # ========================================================

    if relatorio.falhas:

        print(
            f"{VERMELHO}{NEGRITO}"
            "ENDPOINT AINDA NÃO ESTÁ APROVADO."
            f"{FIM}"
        )

        print(
            "Existem problemas que precisam ser corrigidos "
            "antes da integração com o CycleCount."
        )

        print()

        return 1

    if idempotencia_provada:

        print(
            f"{VERDE}{NEGRITO}"
            "ENDPOINT APROVADO PELO CONTRATO HTTP."
            f"{FIM}"
        )

        print(
            "A autenticação está funcionando e a "
            "idempotência foi comprovada por HTTP 409."
        )

        print(
            f"{CINZA}"
            "Observação: ainda é recomendável conferir "
            "a contagem final no banco."
            f"{FIM}"
        )

    else:

        print(
            f"{AMARELO}{NEGRITO}"
            "CONTRATO HTTP PASSOU, MAS A IDEMPOTÊNCIA "
            "NÃO FOI COMPLETAMENTE COMPROVADA."
            f"{FIM}"
        )

        print(
            "O endpoint pode estar ignorando duplicatas "
            "corretamente com 2xx, mas este script não "
            "consegue confirmar isso sem consultar o banco."
        )

    print()

    return 0


# ============================================================
# EXECUÇÃO
# ============================================================

if __name__ == "__main__":
    raise SystemExit(main())
