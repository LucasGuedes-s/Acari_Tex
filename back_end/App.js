const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const multer = require("multer");
// Middleware

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization', 'Content-Type']
}));

app.set('trust proxy', 1);

// Socket.IO
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

// ===== Configuração Cloudflare R2 =====

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Configuração do Cliente S3 (Cloudflare R2)
const s3 = new S3Client({
    region: "auto",
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT, // Endpoint do seu R2
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
    },
});

app.post('/upload/foto', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('Nenhum arquivo enviado.');
  }

  const fileName = `${Date.now()}_${req.file.originalname}`; // Gerar um nome único para o arquivo
  const fileContent = req.file.buffer;

    // Configurações do upload para o Cloudflare R2
    const params = {
        Bucket: process.env.CLOUDFLARE_R2_BUCKET,
        Key: `uploads/${fileName}`, // Caminho do arquivo no R2
        Body: fileContent,
        ContentType: req.file.mimetype,
        ACL: "public-read", // Permite que o arquivo seja acessado publicamente
    };

    try {
        // Envia o arquivo para o Cloudflare R2
        await s3.send(new PutObjectCommand(params));

        // URL pública do arquivo-
        const fileUrl = `${process.env.URL_PUBLICA}.r2.dev/uploads/${fileName}`;
        res.status(200).json({ fileUrl }); // Retorna a URL pública do arquivo
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao fazer upload do arquivo." });
    }
});


// ===== Rotas existentes =====
const routerEstoque = require('./Routes/EstoqueTecido.router.js');
const routerEstoqueAgulhas = require('./Routes/EstoqueAgulhas.router.js');
const routerFuncionarios = require('./Routes/Funcionarios.router.js');
const routerDashboard = require('./Routes/Dashboard.router.js');
const routerPecas = require('./Routes/Pecas.router.js');
const routerUser = require('./Routes/User.router.js');
const routerRelatorios = require('./Routes/Relatorios.router.js');
const routerIntercorrencias = require('./Routes/Intercorrencias.router.js');
//ROTAS
app.get('/teste', (req, res) => {
  res.send('Teste')
})

app.use(
  routerEstoque,
  routerEstoqueAgulhas,
  routerFuncionarios,
  routerDashboard,
  routerPecas,
  routerUser,
  routerRelatorios,
  routerIntercorrencias
);

// ===== Iniciar servidor =====
const PORT = process.env.PORT || 3333;
server.listen(PORT, () => {
  console.log(`Servidor iniciado em http://localhost:${PORT}`);
});
