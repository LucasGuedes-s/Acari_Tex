/* eslint-disable */
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export async function exportarProducaoExcel(pecaDetalhes) {
  if (!pecaDetalhes || typeof pecaDetalhes !== "object") return;

  const safeText = (t) => (t !== null && t !== undefined ? String(t) : "-");
  const formatarData = (data) =>
    data ? new Date(data).toLocaleDateString("pt-BR") : "-";

  const corPrincipal = "164B33"; // verde escuro
  const workbook = new ExcelJS.Workbook();

  // 🔹 Função para criar aba com título verde e tabela
  const criarAba = (nome, dados) => {
    const ws = workbook.addWorksheet(nome);

    // Cabeçalho
    const header = Object.keys(dados[0] || {});
    ws.addRow(header);
    dados.forEach((obj) => ws.addRow(Object.values(obj)));

    // Estiliza cabeçalho
    ws.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: corPrincipal },
      };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Ajusta largura automática
    ws.columns.forEach((col) => {
      let maxLength = 0;
      col.eachCell({ includeEmpty: true }, (cell) => {
        const len = cell.value ? cell.value.toString().length : 10;
        if (len > maxLength) maxLength = len;
      });
      col.width = maxLength + 4;
    });

    return ws;
  };

  // --- Aba 1: Informações Gerais ---
  const infoGerais = [
    { Campo: "Peça", Valor: safeText(pecaDetalhes.descricao) },
    { Campo: "Status", Valor: safeText(pecaDetalhes.status) },
    { Campo: "Quantidade Total", Valor: safeText(pecaDetalhes.quantidade_pecas) },
    { Campo: "Total Produzido", Valor: safeText(pecaDetalhes.totalProduzido) },
    { Campo: "Saldo Restante", Valor: safeText(pecaDetalhes.saldo) },
    { Campo: "Pedido Por", Valor: safeText(pecaDetalhes.pedido_por) },
    { Campo: "Data do Pedido", Valor: formatarData(pecaDetalhes.data_do_pedido) },
    { Campo: "Data de Entrega", Valor: formatarData(pecaDetalhes.data_de_entrega) },
  ];
  criarAba("Informações Gerais", infoGerais);

  // --- Aba 2: Produção por Etapa ---
  const producaoPorEtapa = Object.entries(pecaDetalhes.producaoPorEtapa || {}).map(
    ([etapa, registros]) => ({
      Etapa: etapa,
      Total: registros.reduce((s, r) => s + (Number(r.quantidade) || 0), 0),
    })
  );
  if (producaoPorEtapa.length > 0)
    criarAba("Produção por Etapa", producaoPorEtapa);

  // --- Aba 3: Produção por Funcionário ---
  const funcMap = {};
  Object.values(pecaDetalhes.producaoPorEtapa || {}).forEach((regs) =>
    regs.forEach((r) => {
      if (!r.funcionario) return;
      funcMap[r.funcionario] =
        (funcMap[r.funcionario] || 0) + (Number(r.quantidade) || 0);
    })
  );
  const producaoPorFuncionario = Object.entries(funcMap).map(([nome, total]) => ({
    Funcionário: nome,
    Total: total,
  }));
  if (producaoPorFuncionario.length > 0)
    criarAba("Produção por Funcionário", producaoPorFuncionario);

  // --- Aba 4: Etapas da Peça ---
  const etapas = (pecaDetalhes.pecasEtapas || []).map((et, i) => ({
    "Nº": i + 1,
    Descrição: safeText(et.descricao),
  }));
  if (etapas.length > 0) criarAba("Etapas da Peça", etapas);

  // --- Rodapé ---
  workbook.creator = "Linha Tex";
  workbook.created = new Date();

  // 🔹 Gera o arquivo
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Relatorio_${safeText(pecaDetalhes.descricao)}.xlsx`);
}
