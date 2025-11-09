import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportarProducaoPDF(pecaDetalhes, chartFuncionariosRef, chartEtapasRef) {
  const doc = new jsPDF("p", "mm", "a4");

  // --- Cabeçalho ---
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text(`Relatório de Produção - ${pecaDetalhes.descricao}`, 10, 20);

  // --- Informações Gerais ---
  doc.setFontSize(12);
  let y = 30;
  doc.text(`Status: ${pecaDetalhes.status}`, 10, y);
  doc.text(`Quantidade Total: ${pecaDetalhes.quantidade_pecas}`, 10, y + 7);
  doc.text(`Total Produzido: ${pecaDetalhes.totalProduzido}`, 10, y + 14);
  doc.text(`Pedido por: ${pecaDetalhes.pedido_por}`, 10, y + 21);
  doc.text(`Data do Pedido: ${pecaDetalhes.data_do_pedido}`, 10, y + 28);
  doc.text(`Data de Entrega: ${pecaDetalhes.data_de_entrega}`, 10, y + 35);

  y += 45;

  // --- Gráfico Funcionários ---
  if (chartFuncionariosRef?.value) {
    const canvasFunc = chartFuncionariosRef.value.$el || chartFuncionariosRef.value; 
    const imgFunc = await html2canvas(canvasFunc, { backgroundColor: "#ffffff" });
    const imgDataFunc = imgFunc.toDataURL("image/png");
    doc.addImage(imgDataFunc, "PNG", 10, y, 190, 80);
    y += 90;
  }

  // --- Gráfico Etapas ---
  if (chartEtapasRef?.value) {
    const canvasEtapas = chartEtapasRef.value.$el || chartEtapasRef.value;
    const imgEtapas = await html2canvas(canvasEtapas, { backgroundColor: "#ffffff" });
    const imgDataEtapas = imgEtapas.toDataURL("image/png");
    if (y + 90 > 280) doc.addPage(), y = 10; // nova página se passar
    doc.addImage(imgDataEtapas, "PNG", 10, y, 190, 80);
    y += 90;
  }

  // --- Tabela de Produção por Etapa ---
  if (pecaDetalhes.producaoPorEtapa) {
    if (y + 80 > 280) doc.addPage(), y = 10;
    doc.setFontSize(12);
    doc.text("Detalhamento da Produção por Etapa", 10, y);
    y += 7;

    let headers = ["Etapa", "Funcionário", "Quantidade", "Data", "Hora"];
    let rowHeight = 6;

    // Cabeçalho
    headers.forEach((h, i) => doc.text(h, 10 + i * 35, y));
    y += rowHeight;

    Object.entries(pecaDetalhes.producaoPorEtapa).forEach(([etapa, registros]) => {
      registros.forEach((r) => {
        if (y > 280) doc.addPage(), y = 10;
        doc.text(etapa, 10, y);
        doc.text(r.funcionario, 45, y);
        doc.text(String(r.quantidade), 80, y);
        doc.text(r.data_inicio, 115, y);
        doc.text(r.hora_registro, 150, y);
        y += rowHeight;
      });
    });
  }

  // --- Rodapé ---
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text("Relatório gerado automaticamente pelo sistema Acari Tex", 10, 295);

  // --- Salvar PDF ---
  doc.save(`Relatorio_${pecaDetalhes.descricao}.pdf`);
}
