import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const VERDE_ACARITEX = [13, 57, 39];

export function gerarPdfOPs(ops) {
  const doc = new jsPDF();

  const pecas = agruparPorPeca(ops);

  // =========================
  // CABEÇALHO
  // =========================
  doc.setFillColor(...VERDE_ACARITEX);
  doc.rect(0, 0, 210, 28, "F");

  doc.setTextColor(255);
  doc.setFontSize(16);
  doc.text("AcariTex - Relatório de Produção por Peça", 14, 18);

  doc.setFontSize(10);
  doc.text(
    `Estabelecimento: ${ops[0]?.Estabelecimento?.nome || "-"}`,
    14,
    24
  );

  doc.setTextColor(0);
  let posY = 38;

  // =========================
  // LOOP POR PEÇA
  // =========================
  pecas.forEach((peca) => {

    if (posY > 260) {
      doc.addPage();
      posY = 20;
    }

    // =========================
    // DESTAQUE DA PEÇA
    // =========================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...VERDE_ACARITEX);
    doc.text(peca.descricao.toUpperCase(), 14, posY);

    posY += 4;
    doc.line(14, posY, 196, posY);
    posY += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0);

    doc.text(`Quantidade prevista: ${peca.totalPrevisto}`, 14, posY);
    posY += 5;

    doc.text(`Total produzido (etapa final): ${peca.totalProduzido}`, 14, posY);
    posY += 8;

    // =========================
    // TABELA – PRODUÇÃO DETALHADA
    // =========================
    autoTable(doc, {
      startY: posY,
      head: [["Profissional", "Etapa", "Qtd", "Data", "Hora"]],
      body: peca.registros.map(r => [
        r.profissional,
        r.etapa,
        r.quantidade,
        formatarData(r.data),
        r.hora || "-"
      ]),
      styles: { fontSize: 9 },
      headStyles: {
        fillColor: VERDE_ACARITEX,
        textColor: 255,
        fontStyle: "bold"
      },
      alternateRowStyles: {
        fillColor: [240, 245, 243],
      },
    });

    posY = doc.lastAutoTable.finalY + 16;
  });

  doc.save("Relatorio_Producao_Por_Peca.pdf");
}

// =========================
// AGRUPAMENTO POR PEÇA
// =========================
function agruparPorPeca(ops) {
  const mapa = {};

  ops.forEach(op => {
    const peca = op.descricao || "Sem descrição";

    // 🔑 ETAPA FINAL (regra de negócio)
    const etapaFinal =
      op.Estabelecimento?.peca_final ||
      op.etapas?.[op.etapas.length - 1]?.etapa?.descricao;

    if (!mapa[peca]) {
      mapa[peca] = {
        descricao: peca,
        totalPrevisto: 0,
        totalProduzido: 0,
        registros: []
      };
    }

    mapa[peca].totalPrevisto += op.quantidade_pecas || 0;

    (op.producao_peca || []).forEach(p => {
      const quantidade = p.quantidade_pecas || 0;
      const etapa = p.producao_etapa?.descricao;

      // ✅ SÓ CONTA SE FOR ETAPA FINAL
      if (etapa === etapaFinal) {
        mapa[peca].totalProduzido += quantidade;
      }

      mapa[peca].registros.push({
        profissional: p.producao_funcionario?.nome || p.id_funcionario,
        etapa,
        quantidade,
        data: p.data_inicio,
        hora: p.hora_registro
      });
    });
  });

  return Object.values(mapa);
}

// =========================
// FORMATA DATA
// =========================
function formatarData(data) {
  if (!data) return "-";
  return new Date(data).toLocaleDateString("pt-BR");
}
