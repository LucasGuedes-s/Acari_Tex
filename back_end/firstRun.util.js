const { PrismaClient } = require('@prisma/client');
prisma = new PrismaClient()

const bcrypt = require('bcrypt');
const saltos = 10;

async function firstRun() {
    let cnpj = parseInt(process.env.CNPJ)
    let user = await prisma.Estabelecimento.findUnique({
        where:{
            cnpj: cnpj
        }
    })
    //console.log(user)

    if(user){
        console.log('Já existe esse usuário cadastrado')
    }
    else{
        console.log(process.env.SENHA)
        
        let senhaAdmin = bcrypt.hashSync(process.env.SENHA, saltos);
        console.log(senhaAdmin)
        /*let admin_user = {
            cnpj: process.env.CNPJ,
            nome: process.env.USER_PADRAO,
            email: 'admin@admin.com',
            senha: senhaAdmin,
        }*/
        admin_user = await prisma.Estabelecimento.create({
            data: {
                cnpj: cnpj,
                nome: process.env.USER_PADRAO,
                email: 'admin@admin.com',
                senha: senhaAdmin,
            }
        });
        
    }
    //console.log('Usuário criado')

}

module.exports = firstRun;