import jsPDF from "jspdf";
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

// Função para formatar o status
function formatarStatus(status) {
  const map = {
    em_progresso: "Em Progresso",
    finalizado: "Finalizado",
    pendente: "Pendente",
    cancelado: "Cancelado",
  };
  return map[status] || status;
}

export async function gerarPDF(dadosPorStatus, titulo = "Relatório de Produção") {
  const doc = new jsPDF();
  const corPrincipal = [13, 57, 39];

  // Logo + título
  const logoBase64 = await carregarImagemBase64(logo);
  doc.addImage(logoBase64, "PNG", 14, 10, 30, 15);

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(corPrincipal[0], corPrincipal[1], corPrincipal[2]);
  doc.text(titulo, 105, 20, { align: "center" });

  // Linha divisória
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 28, 196, 28);

  // Data
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 35);

  let posY = 45;

  // Itera pelos status
  for (const [status, lista] of Object.entries(dadosPorStatus)) {
    if (!lista || lista.length === 0) continue;

    if (posY > 250) {
      doc.addPage();
      posY = 20;
    }

    // Separador
    doc.setDrawColor(230, 230, 230);
    doc.line(14, posY - 3, 196, posY - 3);

    // Título da seção
    const statusFormatado = formatarStatus(status);
    doc.setFontSize(13);
    doc.setTextColor(corPrincipal[0], corPrincipal[1], corPrincipal[2]);
    doc.setFont("helvetica", "bold");
    doc.text(statusFormatado.toUpperCase(), 14, posY);
    posY += 6;

    // Texto introdutório
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(
      `Abaixo estão listadas todas as ordens de produção com status "${statusFormatado}".`,
      14,
      posY
    );
    posY += 8;

    // Monta colunas e linhas da tabela
    const colunas = ["ID OP", "Descrição", "Qtd. Peças", "Status"];
    const linhas = lista.map((p) => [
      p.id_da_op,
      p.descricao,
      p.quantidade_pecas,
      formatarStatus(p.status),
    ]);

    doc.autoTable({
      head: [colunas],
      body: linhas,
      startY: posY,
      theme: "striped",
      styles: {
        fontSize: 10,
        halign: "center",
      },
      headStyles: {
        fillColor: corPrincipal,
        textColor: [255, 255, 255],
        halign: "center",
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        posY = data.cursor.y + 15;
      },
    });
  }


  // Rodapé com barra verde
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    const alturaPagina = doc.internal.pageSize.getHeight();
    const larguraPagina = doc.internal.pageSize.getWidth();

    // barra verde
    doc.setFillColor(...corPrincipal);
    doc.rect(0, alturaPagina - 12, larguraPagina, 12, "F");

    // texto rodapé
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("Linha Tex - Sistema de Produção Têxtil", larguraPagina / 2, alturaPagina - 4, { align: "center" });
    doc.text(`Página ${i} de ${pageCount}`, larguraPagina - 20, alturaPagina - 4, { align: "right" });
  }

  doc.save(`${titulo}.pdf`);
}
