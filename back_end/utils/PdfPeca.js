const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const fs = require("fs");

async function gerarPdfPeca(peca) {
  // 🔹 Código único para o QR
  const codigoQr = `LT-OP-${peca.id_da_op}-EST-${peca.id_Estabelecimento}`;

  // Gerar QR Code
  const qrBase64 = await QRCode.toDataURL(codigoQr);

  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
  });

  const filePath = `./peca-op-${peca.id_da_op}.pdf`;
  doc.pipe(fs.createWriteStream(filePath));

  // Converter QR base64 para buffer
  const qrBuffer = Buffer.from(
    qrBase64.replace(/^data:image\/png;base64,/, ""),
    "base64"
  );

  // 🟦 QR CODE (canto superior direito)
  doc.image(qrBuffer, 450, 40, { width: 100 });

  // 🧵 Cabeçalho
  doc
    .fontSize(18)
    .text("Linha Tex", 40, 40)
    .fontSize(10)
    .text("Documento de Identificação Logística", 40, 65);

  // Linha
  doc.moveTo(40, 90).lineTo(550, 90).stroke();

  // 📦 Dados da peça
  doc
    .fontSize(12)
    .text(`OP: ${peca.id_da_op}`, 40, 110)
    .text(`Estabelecimento: ${peca.id_Estabelecimento}`)
    .text(`Descrição: ${peca.descricao}`)
    .text(`Status: ${peca.status}`)
    .text(`Quantidade de Peças: ${peca.quantidade_pecas}`)
    .text(`Pedido por: ${peca.pedido_por}`)
    .text(`Tempo padrão (min): ${peca.tempo_padrao}`);

  doc.moveDown();

  // 📅 Datas
  doc
    .text(
      `Data do Pedido: ${new Date(peca.data_do_pedido).toLocaleDateString("pt-BR")}`
    )
    .text(
      `Data de Entrega: ${
        peca.data_de_entrega
          ? new Date(peca.data_de_entrega).toLocaleDateString("pt-BR")
          : "Não definida"
      }`
    );

  doc.moveDown();

  // 💰 Valor
  doc.text(
    `Valor por Peça: ${
      peca.valor_peca !== null ? `R$ ${peca.valor_peca}` : "Não informado"
    }`
  );

  doc.moveDown();

  // 📝 Observações
  doc.text(`Observações: ${peca.notas ?? "Nenhuma observação"}`);

  // Linha final
  doc.moveDown();
  doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();

  // Rodapé
  doc
    .fontSize(9)
    .text(
      `QR Code: ${codigoQr}`,
      40,
      750,
      { align: "left" }
    )
    .text(
      "Linha Tex • Sistema de Produção e Logística",
      40,
      765,
      { align: "center" }
    );

  doc.end();

}

// Executar
module.exports = { gerarPdfPeca };