const fs = require('fs');
const dayjs = require('dayjs');
const mysqldump = require('mysqldump'); // ✅ NOVO
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand
} = require('@aws-sdk/client-s3');
require('dotenv').config();

// ================= CONFIG =================
const FILE_NAME = `backup-${dayjs().format('YYYY-MM-DD_HH-mm')}.sql`;

// ================= R2 CLIENT =================
const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

// ================= 1. GERAR BACKUP (SEM mysqldump CLI) =================
async function gerarBackup() {
  try {
    await mysqldump({
      connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: 11111, // se precisar, pode ajustar
      },
    dump: {
        schema: {
        format: 'sql',
        },
    },
      dumpToFile: FILE_NAME,
    });

    console.log('✅ Backup gerado:', FILE_NAME);
  } catch (err) {
    throw err;
  }
}

// ================= 2. UPLOAD PARA R2 =================
async function uploadR2() {
  const file = fs.readFileSync(FILE_NAME);

  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: FILE_NAME,
    Body: file,
  }));

  console.log('☁️ Enviado para R2');
}

// ================= 3. LIMPAR LOCAL =================
function limparLocal() {
  fs.unlinkSync(FILE_NAME);
  console.log('🧹 Arquivo local removido');
}
async function rotacao() {
  try {
    const data = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET,
    }));

    if (!data.Contents || data.Contents.length <= 7) return;

    const arquivosOrdenados = data.Contents
      .filter(f => f.Key && f.Key.startsWith('backup-')) // 🔥 segurança extra
      .sort((a, b) => new Date(a.LastModified) - new Date(b.LastModified));

    const deletar = arquivosOrdenados.slice(0, arquivosOrdenados.length - 7);

    for (const file of deletar) {
      if (!file.Key) continue;

      try {
        await s3.send(new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: file.Key,
        }));

        console.log('🗑️ Removido:', file.Key);

      } catch (err) {
        // 🔥 ignora completamente erro de arquivo inexistente
        if (
          err?.Code === 'NoSuchKey' ||
          err?.name === 'NoSuchKey' ||
          err?.$metadata?.httpStatusCode === 404
        ) {
          console.warn('⚠️ Ignorado (não existe):', file.Key);
          continue;
        }

        console.error('❌ Erro real ao deletar:', file.Key, err);
      }
    }

  } catch (err) {
    console.error('❌ Erro na listagem do bucket:', err);
  }
}
// ================= EXECUÇÃO =================
(async () => {
  try {
    await gerarBackup();
    await uploadR2();
    limparLocal();
    await rotacao();

    console.log('🚀 Backup finalizado com sucesso');
  } catch (err) {
    console.error('❌ Erro no backup:', err);
  }
})();