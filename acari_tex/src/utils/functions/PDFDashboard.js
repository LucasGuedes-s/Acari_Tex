import jsPDF from "jspdf";
import Chart from "chart.js/auto";

function desenharCabecalho(doc, titulo) {
  doc.setFillColor(13, 57, 39); // Verde escuro legível
  doc.rect(0, 0, 210, 20, "F");

  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(titulo, 14, 13);

  doc.setTextColor(0);
}

// 🔹 Gráfico de Pizza para cada etapa (Meta vs Produzido)
function gerarGraficoPizzaEtapa(etapa, meta, produzido) {
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 300;

  const ctx = canvas.getContext("2d");

  const chart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Meta", "Produzido"],
      datasets: [
        {
          data: [meta, produzido],
          backgroundColor: ["rgba(13,57,39,0.4)", "rgba(13,57,39,1)"],
        },
      ],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        title: {
          display: true,
          text: etapa,
          font: { size: 11 },
        },
        legend: {
          position: "bottom",
          labels: { boxWidth: 12, font: { size: 8 } },
        },
      },
    },
  });

  const image = canvas.toDataURL("image/png", 1.0);
  chart.destroy();
  return image;
}
/*
function prepararGraficoProfissional(producao) {
  const mapa = {};
  producao.forEach(p => {
    const nome = p.producao_funcionario?.nome || "Desconhecido";
    mapa[nome] = (mapa[nome] || 0) + p.quantidade_pecas;
  });

  return {
    labels: Object.keys(mapa),
    valores: Object.values(mapa),
  };
}

function gerarGraficoProfissional(dados) {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = Math.max(250, dados.labels.length * 25);

  const ctx = canvas.getContext("2d");

  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: dados.labels,
      datasets: [
        {
          label: "Peças Produzidas",
          data: dados.valores,
          backgroundColor: "#0d3927",
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: false,
      animation: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } },
    },
  });

  const image = canvas.toDataURL("image/png", 1.0);
  chart.destroy();
  return image;
}
*/
function prepararGraficoEtapas(op) {
  const mapa = {};
  op.etapas.forEach(e => {
    mapa[e.etapa.descricao] = {
      meta: e.quantidade_meta || 0,
      produzido: 0,
    };
  });

  op.producao_peca.forEach(p => {
    const nome = p.producao_etapa?.descricao;
    if (mapa[nome]) {
      mapa[nome].produzido += p.quantidade_pecas;
    }
  });

  return mapa;
}
//function desenharCabecalhoTabela(doc, posY) { doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setDrawColor(0); doc.setFillColor(13, 57, 39); doc.setTextColor(255); doc.rect(14, posY, 180, 7, "F"); doc.text("Funcionário", 16, posY + 5); doc.text("Etapa", 80, posY + 5); doc.text("Qtd", 130, posY + 5); doc.text("Data/Hora", 160, posY + 5); doc.setTextColor(0); return posY + 9; }
function formatarDataHora(dataHora) { if (!dataHora) return "-"; const d = new Date(dataHora); const dia = String(d.getDate()).padStart(2, "0"); const mes = String(d.getMonth() + 1).padStart(2, "0"); const ano = d.getFullYear(); return `${dia}/${mes}/${ano}`; }
export function gerarPdfOPs(ops) {
  const doc = new jsPDF();
  let posY = 25;

  desenharCabecalho(doc, "Relatório de Produção - LinhaTex");

  ops.forEach((op, index) => {
    if (index > 0) {
      doc.addPage();
      desenharCabecalho(doc, "Relatório de Produção - LinhaTex");
      posY = 25;
    }
    const inicioBloco = posY;


    // Nome da peça (título)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(33);
    doc.text(op.descricao, 14, inicioBloco + 6);

    // Informações — coluna esquerda
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);

    doc.text(`OP: ${op.id_da_op}`, 14, inicioBloco + 14);
    doc.text(`Estabelecimento: ${op.Estabelecimento?.nome || "-"}`, 14, inicioBloco + 20);

    // Informações — coluna direita
    doc.text(`Quantidade prevista: ${op.quantidade_pecas}`, 120, inicioBloco + 14);
    doc.text(`Peça final: ${op.Estabelecimento?.peca_final}`, 120, inicioBloco + 20);

    // Ajuste do cursor
    posY = inicioBloco + 34;


    // 📊 Gráficos de pizza por etapa (2 por linha)
    const etapas = prepararGraficoEtapas(op);
    doc.setFont("helvetica", "bold");
    doc.text("Produzido x Meta por Etapa", 14, posY);
    posY += 6;

    let col = 0;
    Object.entries(etapas).forEach(([etapa, valores]) => {
      const graficoEtapa = gerarGraficoPizzaEtapa(etapa, valores.meta, valores.produzido);
      const x = col === 0 ? 14 : 110;
      doc.addImage(graficoEtapa, "PNG", x, posY, 90, 70);

      if (col === 1) {
        posY += 75;
        col = 0;
      } else {
        col = 1;
      }

      if (posY > 200) {
        doc.addPage();
        desenharCabecalho(doc, "Relatório de Produção - LinhaTex");
        posY = 25;
      }
    });
    if (col === 1) posY += 75;

    /*
    const dadosProf = prepararGraficoProfissional(op.producao_peca);
    const graficoProf = gerarGraficoProfissional(dadosProf);
    doc.text("Produção por Profissional", 14, posY);
    posY += 4;
    doc.addImage(graficoProf, "PNG", 14, posY, 180, 70);
    posY += 80;*/

    // 📋 Tabela de produção individual (estilo limpo)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Detalhes da Produção", 14, posY);
    posY += 8;

    // Cabeçalho da tabela
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setFillColor(13, 57, 39); // verde escuro
    doc.setTextColor(255); // branco
    doc.rect(14, posY, 180, 7, "F");
    doc.text("Funcionário", 18, posY + 5);
    doc.text("Etapa", 90, posY + 5, { align: "center" });
    doc.text("Qtd", 135, posY + 5, { align: "right" });
    doc.text("Data/Hora", 190, posY + 5, { align: "right" });
    doc.setTextColor(0);
    posY += 9;

    // Linhas da tabela
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    op.producao_peca.forEach(p => {
      const nome = p.producao_funcionario?.nome || "Desconhecido";
      const etapa = p.producao_etapa?.descricao || "-";
      const qtd = p.quantidade_pecas;
      const dataHora = `${formatarDataHora(p.data_inicio)} ${p.hora_registro || ""}`.trim();

      // Linha separadora
      doc.setDrawColor(200); // cinza claro
      doc.line(14, posY + 4, 194, posY + 4);

      // Colunas alinhadas
      doc.text(nome, 18, posY + 3);
      doc.text(etapa, 90, posY + 3, { align: "center" });
      doc.text(String(qtd), 135, posY + 3, { align: "right" });
      doc.text(dataHora, 190, posY + 3, { align: "right" });

      posY += 7;

      // quebra automática
      if (posY > 270) {
        doc.addPage();
        desenharCabecalho(doc, "Relatório de Produção - LinhaTex");
        posY = 25;

        // redesenha cabeçalho da tabela
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setFillColor(13, 57, 39);
        doc.setTextColor(255);
        doc.rect(14, posY, 180, 7, "F");
        doc.text("Funcionário", 18, posY + 5);
        doc.text("Etapa", 90, posY + 5, { align: "center" });
        doc.text("Qtd", 135, posY + 5, { align: "right" });
        doc.text("Data/Hora", 190, posY + 5, { align: "right" });
        doc.setTextColor(0);
        posY += 9;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
      }
    });
  });

  doc.save("Relatorio_Completo_OPs.pdf");
}
