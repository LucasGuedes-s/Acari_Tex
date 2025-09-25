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

export async function gerarPDF(dadosPorStatus, titulo = "Relatório de Produção") {
  const doc = new jsPDF();
  const cor = "#0d3927";

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
}
