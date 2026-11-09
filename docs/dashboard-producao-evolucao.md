# Dashboard — Evolução da Produção

Gráfico de evolução diária da produção (tempo padrão × tempo de referência ×
tempo efetivado) exibido em `DashboardView.vue` pelo componente
`GraficoEvolucaoProducao.vue`.

## Rota

```
GET /dashboard/producao-evolucao        (JWT obrigatório)
```

| Parâmetro    | Descrição                                                        |
| ------------ | ---------------------------------------------------------------- |
| `dias`       | Janela móvel terminando hoje: `1..90` (padrão `7`).              |
| `dataInicio` | `YYYY-MM-DD` — período personalizado (precisa de `dataFim`).     |
| `dataFim`    | `YYYY-MM-DD` — período personalizado (máximo 366 dias no total). |

O estabelecimento vem **sempre** de `req.user.cnpj`; qualquer `cnpj` na query é
ignorado.

### Resposta (resumo)

```json
{
  "periodo": { "dataInicio": "2026-03-01", "dataFim": "2026-03-06", "dias": 6, "periodoLabel": "01/03/2026 a 06/03/2026" },
  "resumo": {
    "totalPecas": 121,
    "totalPecasApontadas": 1661,
    "tempoPadraoTotal": 988.25,
    "tempoReferenciaTotal": 0,
    "tempoEfetivadoTotal": 1680,
    "minutosJornada": 532,
    "funcionariosDia": 14,
    "tempoRegistradoTotal": 1680,
    "eficienciaPadrao": 59,
    "eficienciaReferencia": null,
    "diasComProducao": 1,
    "diasComReferencia": 0,
    "diasSemProducao": 5,
    "referenciaCobertura": 0
  },
  "regras": { "...": "documentação viva das fórmulas" },
  "evolucao": [
    {
      "data": "2026-03-06",
      "quantidadePecas": 121,
      "pecasApontadas": 1661,
      "tempoPadrao": 988.25,
      "tempoReferencia": 0,
      "tempoEfetivado": 1680,
      "eficienciaPadrao": 59,
      "eficienciaReferencia": null,
      "profissionais": 14,
      "minutosJornada": 532,
      "jornadaDia": 120,
      "tempoRegistrado": 1680,
      "registros": 28,
      "temProducao": true,
      "referenciaCobertura": 0
    }
  ]
}
```

Tempos em **minutos**; a interface converte para horas.

## Regras de cálculo

Toda a consolidação vem de `relatorioProducaoService.calcularRelatorio()` →
`utils/producaoCalculos.js`. Não existe lógica paralela:

| Campo             | Origem na consolidação                     |
| ----------------- | ------------------------------------------ |
| `tempoPadrao`     | `porDia.tempoFicha` = Σ(qtd × tempo padrão) |
| `tempoReferencia` | `porDia.tempoReferenciaPuro` = Σ(qtd × tempo de referência **individual válido**) |
| `tempoEfetivado`  | `jornadaDia × profissionais` do dia (ver abaixo) |
| `quantidadePecas` | `porDia.producaoConcluida` (etapa final da OP + saldo líquido) |
| `pecasApontadas`  | `porDia.producao` (todas as etapas) |

### Tempo efetivado = jornada real do dia × profissionais

O tempo efetivado **não** é a soma de `tempo_produzido`: esse campo é o slot de
1h (default 60) repetido em todos os registros, então dois apontamentos na mesma
hora contariam 2h e todo mundo teria “o mesmo tempo”. A regra é a mesma da tela
Produção Hoje (`OP.services.js`) e dos relatórios (`Relatorios.services.js`):

1. `minutosJornada` = `estabelecimento.tempo_de_producao` (ex.: 440/540; 480 se
   não configurado) — jornada máxima da fábrica no dia;
2. `jornadaDia` = **jornada real daquele dia**, obtida dos apontamentos da
   **etapa final (Revisão Final)**: do primeiro ao último horário da etapa
   (fim = início + duração do slot), limitada por `minutosJornada`. Se a revisão
   final foi 08:00 → 15:20, o dia vale 440 min e não 540. Sem apontamento na
   etapa final, mantém a jornada configurada;
3. `tempoEfetivado` = `jornadaDia × profissionais` que apontaram no dia.

`tempoRegistrado` (Σ `tempo_produzido`) continua exposto por dia só como
informação de auditoria — nunca como denominador da eficiência.

- `tempoEfetivado` não é multiplicado pela quantidade outra vez.
- Eficiências: `tempo do critério × 100 ÷ tempo efetivado`, cada uma a partir do
  seu próprio numerador. O resumo usa os **totais do período**, nunca a média das
  eficiências diárias.
- Sem referência cadastrada não há percentual: `eficienciaReferencia = null`
  (nada é substituído pelo tempo padrão). O mesmo vale para `eficienciaPadrao`
  quando não há tempo padrão. `referenciaCobertura` mostra quanto da quantidade
  apontada tem referência.
- Dias sem apontamento aparecem com tempos/peças zerados, `temProducao: false`
  e percentuais `null`.
- Antes da consolidação passam as regras já validadas: dedupe de lançamentos,
  estornos/quantidade 0 ignorados, etapa final por OP, fuso de São Paulo.

## Consultas ao banco

Uma execução = 6 consultas em paralelo (estabelecimento, produções, tempos de
referência, metas, OPs ×2, contagem de ativos), sem N+1. Medido no banco real:
~2–3 s por requisição de 7 dias.

## Testes

```
cd back_end && node tests/dashboardProducaoEvolucao_test.js
```

Cobre tempos, eficiências, múltiplos profissionais/etapas/OPs, dias zerados,
registros zerados, ausência de referência e de padrão, dedupe, mudança de
período, validação de parâmetros, isolamento por CNPJ e igualdade com o serviço
de relatórios.
