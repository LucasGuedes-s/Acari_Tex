const express = require('express');
const app = express();
const cors = require('cors');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Headers", "Authorization, content-type");
    res.header("Access-Control-Expose-Headers", "Authorization, content-type");
    res.header("Access-Control-Allow-Origin", "*");
    next();
});

//Primeira vez que o sistema é executado
const firstRun = require('./firstRun.util.js');
firstRun();


app.set('trust proxy', 1);

const routerEstoque = require('./Routes/EstoqueTecido.router.js');
const routerEstoqueAgulhas = require('./Routes/EstoqueAgulhas.router.js');
const routerFuncionarios = require('./Routes/Funcionarios.router.js');
const routerDashboard = require('./Routes/Dashboard.router.js');
const routerUser= require('./Routes/User.router.js');

app.use(routerEstoque, routerEstoqueAgulhas, routerFuncionarios, routerDashboard, routerUser);

const hostname = 'localhost';
const port = 3333;
/*
//aplicando o body-parser
app.use(bodyParser.json());
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);
app.use(cors({
    origin: 'http://localhost:8080'
}));
*/
app.use(cors({
    origin: 'http://localhost:8080',
    methods: 'PUT',
    optionsSuccessStatus: 200 // Algumas versões mais recentes do CORS exigem isso
  }));
app.listen(3333, () => {
    console.log(`Servidor iniciado em http://${hostname}:${port} (Clique Ctrl+C)`);
});
//Inicia o servidor
//app.listen(port, hostname, ()=>{
//});