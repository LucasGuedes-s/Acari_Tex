/**
 * Cliente Prisma ÚNICO do backend.
 *
 * Evidência (diagnóstico de 08/10/2026, medição direta no Aiven):
 *  - `max_connections` do MySQL do projeto = 76 (15 conexões abertas em repouso);
 *  - havia 26 `new PrismaClient()` espalhados em arquivos diferentes — cada
 *    instância cria o PRÓPRIO pool de conexões (padrão do Prisma: nº de CPUs
 *    × 2 + 1, ou seja ~3 por instância numa instância de 1 vCPU no Render);
 *  - 26 pools × 3 conexões = até 78 conexões concorrentes contra as 76
 *    suportadas: sob carga (tela inicial + apontamentos + cron das 19h) o
 *    MySQL passa a rejeitar/segurar conexões e as requisições estouram o
 *    timeout no frontend (causa raiz provada por medição).
 *
 * Um único cliente compartilhado (recomendação oficial da Prisma) reduz os
 * pools ao mínimo sem alterar nenhuma consulta.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
