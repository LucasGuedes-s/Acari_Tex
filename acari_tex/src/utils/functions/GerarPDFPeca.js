/* eslint-disable */
import jsPDF from "jspdf";
import Chart from "chart.js/auto";

export async function exportarProducaoPDF(pecaDetalhes) {
  if (!pecaDetalhes || typeof pecaDetalhes !== "object") return;

  const safeText = (t) => (t !== null && t !== undefined ? String(t) : "-");
  const formatarData = (data) =>
    data ? new Date(data).toLocaleDateString("pt-BR") : "-";

  const doc = new jsPDF();
  const margem = 14;
  const corPrincipal = "#164B33"; // Verde escuro principal
  const corSecundaria = "#1D5C3E"; // Um tom ligeiramente mais claro para seções

  // --- Cabeçalho ---
  doc.setFillColor(corPrincipal);
  doc.rect(0, 0, 210, 35, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("Relatório de Produção - Linha Tex", margem, 20);
  doc.setFontSize(14);
  doc.text(`Peça: ${safeText(pecaDetalhes.descricao)}`, margem, 30);

  let y = 45;

  // 🔹 Função que adiciona nova página quando falta espaço
  const verificaEspaco = (alturaNecessaria = 30) => {
    const alturaPagina = doc.internal.pageSize.getHeight();
    if (y + alturaNecessaria > alturaPagina - 20) {
      doc.addPage();
      y = 20;
    }
  };

  // 🔹 Função para criar seções com título colorido e espaçamento
  const addSection = (titulo) => {
    verificaEspaco(20);
    y += 4; // margem extra antes da seção
    doc.setFillColor(corSecundaria);
    doc.rect(margem - 2, y - 5, 180, 8, "F");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(titulo, margem, y);
    y += 10; // espaço após o título
    doc.setTextColor(0, 0, 0);
  };

  // --- Informações Gerais ---
  addSection("Informações Gerais");

  const info = [
    ["Status", safeText(pecaDetalhes.status)],
    ["Quantidade Total", safeText(pecaDetalhes.quantidade_pecas)],
    ["Total Produzido", safeText(pecaDetalhes.totalProduzido)],
    ["Saldo Restante", safeText(pecaDetalhes.saldo)],
    ["Pedido Por", safeText(pecaDetalhes.pedido_por)],
    ["Data do Pedido", formatarData(pecaDetalhes.data_do_pedido)],
    ["Data de Entrega", formatarData(pecaDetalhes.data_de_entrega)],
  ];

  doc.setFontSize(11);
  info.forEach(([label, valor]) => {
    verificaEspaco(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(corPrincipal);
    doc.text(`${label}:`, margem, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(`${valor}`, margem + 50, y);
    y += 9;
  });

  // --- Monta dados dos gráficos ---
  const producaoPorEtapa = Object.entries(pecaDetalhes.producaoPorEtapa || {}).map(([etapa, registros]) => ({
    etapa,
    total: registros.reduce((s, r) => s + (Number(r.quantidade) || 0), 0),
  }));

  const funcMap = {};
  Object.values(pecaDetalhes.producaoPorEtapa || {}).forEach((regs) =>
    regs.forEach((r) => {
      if (!r.funcionario) return;
      funcMap[r.funcionario] = (funcMap[r.funcionario] || 0) + (Number(r.quantidade) || 0);
    })
  );
  const producaoPorFuncionario = Object.entries(funcMap).map(([nome, total]) => ({ nome, total }));

  // --- Gera o gráfico (usando Chart.js) ---
  const gerarGrafico = (titulo, labels, valores, tipo = "bar") =>
    new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = 700;
      canvas.height = 350;
      const ctx = canvas.getContext("2d");

      const verdeEscuro = [
        "#164B33",
        "#1D5C3E",
        "#25754E",
        "#2D8A5C",
        "#379F6A",
        "#40B57A",
      ];

      new Chart(ctx, {
        type: tipo,
        data: {
          labels,
          datasets: [
            {
              label: titulo,
              data: valores,
              backgroundColor: verdeEscuro,
              borderColor: "#0E2B1E",
              borderWidth: 1.5,
            },
          ],
        },
        options: {
          responsive: false,
          animation: false,
          plugins: {
            legend: { display: tipo !== "bar", position: "bottom" },
            title: {
              display: true,
              text: titulo,
              color: corPrincipal,
              font: { size: 16, weight: "bold" },
            },
          },
          scales: tipo === "bar" ? {
            y: { beginAtZero: true },
          } : {},
        },
      });

      setTimeout(() => resolve(canvas.toDataURL("image/png")), 250);
    });

  // --- Gráfico: Produção por Etapa ---
  if (producaoPorEtapa.length > 0) {
    verificaEspaco(110);
    addSection("Produção por Etapa");
    const graficoEtapas = await gerarGrafico(
      "Total Produzido por Etapa",
      producaoPorEtapa.map((e) => e.etapa),
      producaoPorEtapa.map((e) => e.total),
      "bar"
    );
    doc.addImage(graficoEtapas, "PNG", margem, y, 180, 90);
    y += 100;
  }

  // --- Gráfico: Produção por Funcionário ---
  if (producaoPorFuncionario.length > 0) {
    verificaEspaco(110);
    addSection("Produção por Funcionário");
    const graficoFunc = await gerarGrafico(
      "Produção por Funcionário",
      producaoPorFuncionario.map((f) => f.nome),
      producaoPorFuncionario.map((f) => f.total),
      "bar"
    );
    doc.addImage(graficoFunc, "PNG", margem, y, 180, 90);
    y += 100;
  }

  // --- Etapas ---
  if (pecaDetalhes.pecasEtapas?.length) {
    verificaEspaco(pecaDetalhes.pecasEtapas.length * 8 + 20);
    addSection("Etapas da Peça");
    pecaDetalhes.pecasEtapas.forEach((et, i) => {
      doc.setTextColor(corPrincipal);
      doc.text(`${i + 1}.`, margem, y);
      doc.setTextColor(0, 0, 0);
      doc.text(`${safeText(et.descricao)}`, margem + 10, y);
      y += 8;
    });
  }

  // --- Rodapé ---
  const alturaPagina = doc.internal.pageSize.getHeight();
  doc.setFillColor(corPrincipal);
  doc.rect(0, alturaPagina - 15, 210, 15, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(`Gerado automaticamente - ${new Date().toLocaleString("pt-BR")}`, margem, alturaPagina - 7);

  doc.save(`Relatorio_${safeText(pecaDetalhes.descricao)}.pdf`);
}
