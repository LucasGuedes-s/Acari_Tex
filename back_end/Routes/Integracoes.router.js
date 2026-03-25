const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get("/usuarios/telefone/:telefone", async (req, res) => {
  const { telefone } = req.params;

  const usuario = await prisma.usuarios.findFirst({
    where: { telefone }
  });

  if (!usuario) {
    return res.status(404).json({ error: "Não encontrado" });
  }

  res.json(usuario);
});

router.post("/auth/login-cpf", async (req, res) => {
  const { cpf, telefone } = req.body;

  const usuario = await prisma.usuarios.findFirst({
    where: { cpf }
  });

  if (!usuario) {
    return res.status(404).json({ error: "CPF não encontrado" });
  }

  // salva telefone no usuário
  await prisma.usuarios.update({
    where: { email: usuario.email },
    data: { telefone }
  });

  return res.json(usuario);
});

module.exports = router;