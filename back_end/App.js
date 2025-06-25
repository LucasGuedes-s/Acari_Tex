const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Headers", "Authorization, content-type");
    res.header("Access-Control-Expose-Headers", "Authorization, content-type");
    res.header("Access-Control-Allow-Origin", "*");
    next();
});

app.set('trust proxy', 1);

const { Server } = require('socket.io');

const http = require('http');

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
const routerEstoque = require('./Routes/EstoqueTecido.router.js');
const routerEstoqueAgulhas = require('./Routes/EstoqueAgulhas.router.js');
const routerFuncionarios = require('./Routes/Funcionarios.router.js');
const routerDashboard = require('./Routes/Dashboard.router.js');
const routerPecas = require('./Routes/Pecas.router.js');

const routerUser= require('./Routes/User.router.js');

app.use(routerEstoque, routerEstoqueAgulhas, routerFuncionarios, routerDashboard, routerPecas, routerUser);


const hostname = 'localhost';
const port = 3333;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
server.listen(3333, () => {
    console.log(`Servidor iniciado em http://${hostname}:${port} (Clique Ctrl+C)`);
});
