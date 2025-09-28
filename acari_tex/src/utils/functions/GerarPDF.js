/*import jsPDF from "jspdf";
import "jspdf-autotable";
import logo from "@/assets/Logo.png";

// Função para carregar logo como base64
function carregarImagemBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = (err) => reject(err);
  });
}

export async function gerarPDF(dadosPorStatus, titulo = "Relatório de Produção") {
  const doc = new jsPDF();
  const cor = "";

  // Logo
  const logoBase64 = await carregarImagemBase64(logo);
  doc.addImage(logoBase64, "PNG", 150, 10, 40, 20);

  // Título principal em negrito
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(cor);
  doc.text(titulo, 14, 20);

  // Data
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 30);

  let posY = 40;

  // Itera pelos status
  for (const [status, lista] of Object.entries(dadosPorStatus)) {
    if (!lista || lista.length === 0) continue;

    if (posY > 250) {
      doc.addPage();
      posY = 20;
    }

    // Título da seção
    doc.setFontSize(12);
    doc.setTextColor(cor);
    doc.setFont("helvetica", "bold");
    doc.text(status.replace("_", " ").toUpperCase(), 14, posY);
    posY += 6;

    // Monta colunas e linhas da tabela
    const colunas = ["ID OP", "Descrição", "Qtd. Peças", "Status"];
    const linhas = lista.map((p) => [
      p.id_da_op,
      p.descricao,
      p.quantidade_pecas,
      p.status,
    ]);

    doc.autoTable({
      head: [colunas],
      body: linhas,
      startY: posY,
      headStyles: {
        fillColor: [13, 57, 39],
        textColor: [255, 255, 255],
        halign: "center",
      },
      bodyStyles: { halign: "center" },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        posY = data.cursor.y + 10;
      },
    });
  }

  // Rodapé com barra verde
  const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // barra verde no rodapé, ocupando toda a largura e chegando até o final da página
    const alturaPagina = doc.internal.pageSize.getHeight(); // 297 mm por padrão
    doc.setFillColor(13, 57, 39);
    doc.rect(0, alturaPagina - 10, doc.internal.pageSize.getWidth(), 10, "F"); // 10 mm de altura

    // texto rodapé acima da barra
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("Linha Tex - Sistema de Produção têxtil", 14, alturaPagina - 4);
    doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.getWidth() - 30, alturaPagina - 4);
    }


  doc.save(`${titulo}.pdf`);
} */

  
/* src/utils/functions/GerarPDF.js */
import * as pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from "pdfmake/build/vfs_fonts";
import Chart from "chart.js/auto";
import logo from "@/assets/Logo.png";

/**
 * Workaround para bundlers: pdfFonts pode estar em pdfFonts.pdfMake.vfs ou em pdfFonts.vfs
 * eslint rule 'no-import-assign' reclama em alguns setups ao atribuir à import,
 * então desabilitamos apenas essa linha.
 */
// eslint-disable-next-line no-import-assign
pdfMake.vfs = (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) || pdfFonts.vfs || pdfFonts;

/**
 * Carrega uma imagem (url/module import) e retorna base64 (PNG).
 * Usa crossOrigin para evitar problemas quando possível.
 */
function carregarImagemBase64(url) {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = (err) => reject(err);
      // Se logo for um objeto (import por webpack/vite), a string estará em logo.default
      const src = (url && url.default) ? url.default : url;
      img.src = src;
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Gera um gráfico de barras via Chart.js em um canvas offscreen e retorna base64.
 * Ajuste canvas.width/height para controlar resolução (maior = imagem mais nítida).
 */
async function gerarGraficoBase64(dadosPorStatus, tipo = "bar") {
  // Prepara labels e valores a partir do objeto dadosPorStatus (espera arrays por status)
  const labels = Object.keys(dadosPorStatus).map(k => k.replace("_", " "));
  const valores = Object.values(dadosPorStatus).map(arr => Array.isArray(arr) ? arr.length : 0);

  const canvas = document.createElement("canvas");
  // resolução maior para ficar nítido no PDF
  canvas.width = 1200;
  canvas.height = 400;
  const ctx = canvas.getContext("2d");

  // cria chart
  const chart = new Chart(ctx, {
    type: tipo,
    data: {
      labels,
      datasets: [
        {
          label: "Qtd. Peças",
          data: valores,
          backgroundColor: valuesToColors(valores.length),
          borderColor: "#0d3927",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: false, // importante: renderizar com as dimensões do canvas
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: { ticks: { font: { size: 12 } } },
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    },
  });

  // força update e captura após pequeno delay (garante render)
  await new Promise((r) => setTimeout(r, 100));
  chart.update();

  const base64 = canvas.toDataURL("image/png");

  // cleanup
  try { chart.destroy(); } catch (e) { /* ignore */ }

  return base64;
}

/**
 * Gera um array de cores (simples) para o dataset
 */
function valuesToColors(n) {
  // se quiser cores diferentes por barra — aqui usamos tons verdes/azuis
  const palette = [
    "#0d3927", "#2f7a4a", "#4da6ff", "#66cc66", "#66cc99",
    "#145a32", "#008d3b", "#4b9be6", "#9bd89b", "#8fbcd8"
  ];
  return Array.from({ length: n }).map((_, i) => palette[i % palette.length]);
}

/**
 * Função principal — gera e baixa o PDF via pdfMake.
 * dadosPorStatus: { nao_iniciado: [...], em_progresso: [...], coleta: [...], finalizado: [...] }
 */
export async function gerarPDF(dadosPorStatus = {}, titulo = "Relatório de Produção", opc = {}) {
  try {
    const logoBase64 = await carregarImagemBase64(logo).catch(() => null);
    const graficoBase64 = await gerarGraficoBase64(dadosPorStatus, opc.tipoGrafico || "bar");

    // Monta conteúdo
    const content = [];

    // Cabeçalho com título e logo
    const headerColumns = [
      { text: titulo, style: "header", margin: [0, 8, 0, 0] }
    ];
    if (logoBase64) headerColumns.push({ image: logoBase64, width: 100, alignment: "right" });
    content.push({ columns: headerColumns });

    // Data
    content.push({ text: `Gerado em: ${new Date().toLocaleString("pt-BR")}`, style: "subheader" });
    content.push({ text: " " });

    // Gráfico resumo
    if (graficoBase64) {
      content.push({ text: "Resumo de Quantidades", style: "sectionHeader" });
      content.push({ image: graficoBase64, width: 520, alignment: "center", margin: [0, 8, 0, 14] });
    }

    // Tabelas por status
    for (const [statusRaw, lista] of Object.entries(dadosPorStatus)) {
      const listaValida = Array.isArray(lista) ? lista : [];
      if (listaValida.length === 0) continue;

      const status = statusRaw.replace("_", " ").toUpperCase();
      content.push({ text: status, style: "sectionHeader" });

      const body = [
        ["ID OP", "Descrição", "Qtd. Peças", "Status"],
        ...listaValida.map(p => [
          p.id_da_op ?? p.id ?? "-",
          p.descricao ?? "-",
          p.quantidade_pecas ?? "-",
          p.status ?? statusRaw
        ])
      ];

      content.push({
        table: {
          headerRows: 1,
          widths: ["auto", "*", 80, 80],
          body
        },
        layout: {
          fillColor: function (rowIndex) {
            return rowIndex === 0 ? "#0d3927" : (rowIndex % 2 === 0 ? "#f0f0f0" : null);
          },
          hLineColor: () => "#e0e0e0",
          vLineColor: () => "#e0e0e0",
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 6,
          paddingBottom: () => 6
        },
        margin: [0, 6, 0, 12]
      });
    }

    // Definição do documento
    const docDefinition = {
      pageSize: "A4",
      pageMargins: [14, 20, 14, 40], // left, top, right, bottom (bottom reserva espaço para footer)
      content,
      styles: {
        header: { fontSize: 18, bold: true, color: "#0d3927" },
        subheader: { fontSize: 10, color: "gray", margin: [0, 4, 0, 10] },
        sectionHeader: { fontSize: 13, bold: true, color: "#0d3927", margin: [0, 8, 0, 6] },
        tableHeader: { fillColor: "#0d3927", color: "#fff", bold: true }
      },
      footer: function (currentPage, pageCount) {
        return {
          columns: [
            { text: "Linha Tex - Sistema de Produção Têxtil", alignment: "left", margin: [14, 0, 0, 0] },
            { text: `Página ${currentPage} de ${pageCount}`, alignment: "right", margin: [0, 0, 14, 0] }
          ],
          margin: [0, 0, 0, 6]
        };
      }
    };

    // Gera e força download
    pdfMake.createPdf(docDefinition).download(`${titulo}.pdf`);
  } catch (err) {
    console.error("Erro ao gerar PDF:", err);
    throw err;
  }
}
