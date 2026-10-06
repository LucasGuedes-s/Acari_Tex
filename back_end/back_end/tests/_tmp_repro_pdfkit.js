const PDFDocument = require('pdfkit')

function gerar(comRodape) {
  return new Promise(resolve => {
    const doc = new PDFDocument({ size: 'A4', bufferPages: true, margins: { top: 50, bottom: 50, left: 45, right: 45 } })
    const chunks = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))

    // conteúdo de 2 páginas
    doc.text('Conteúdo pagina 1', 45, 60)
    doc.addPage()
    doc.text('Conteúdo pagina 2', 45, 60)

    if (comRodape) {
      const totalPages = doc.bufferedPageRange().count
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i)
        doc.fontSize(7)
        doc.text(`Gerado em ${i}`, 45, doc.page.height - 28, { width: (doc.page.width - 90) / 2 })
        doc.text(`Página ${i + 1} de ${totalPages}`, 45 + (doc.page.width - 90) / 2, doc.page.height - 28, { width: (doc.page.width - 90) / 2, align: 'right' })
      }
    }
    doc.end()
  })
}

;(async () => {
  const sem = await gerar(false)
  const com = await gerar(true)
  const contarPaginas = buf => (String(buf).match(/\/Type\s*\/Page[^s]/g) || []).length
  console.log('páginas sem rodapé:', contarPaginas(sem))
  console.log('páginas com rodapé:', contarPaginas(com))
})()
