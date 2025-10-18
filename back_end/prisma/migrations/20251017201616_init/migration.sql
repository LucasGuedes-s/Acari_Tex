/*
  Warnings:

  - You are about to drop the column `prioridade` on the `Tarefas` table. All the data in the column will be lost.
  - You are about to drop the `IntercorrenciaEtapa` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `IntercorrenciaFuncionario` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Intercorrencias` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `IntercorrenciaEtapa` DROP FOREIGN KEY `IntercorrenciaEtapa_id_da_funcao_fkey`;

-- DropForeignKey
ALTER TABLE `IntercorrenciaEtapa` DROP FOREIGN KEY `IntercorrenciaEtapa_id_intercorrencia_fkey`;

-- DropForeignKey
ALTER TABLE `IntercorrenciaFuncionario` DROP FOREIGN KEY `IntercorrenciaFuncionario_id_funcionario_fkey`;

-- DropForeignKey
ALTER TABLE `IntercorrenciaFuncionario` DROP FOREIGN KEY `IntercorrenciaFuncionario_id_intercorrencia_fkey`;

-- DropForeignKey
ALTER TABLE `Intercorrencias` DROP FOREIGN KEY `Intercorrencias_estabelecimentoCnpj_fkey`;

-- DropForeignKey
ALTER TABLE `Intercorrencias` DROP FOREIGN KEY `Intercorrencias_id_da_op_fkey`;

-- AlterTable
ALTER TABLE `Tarefas` DROP COLUMN `prioridade`;

-- DropTable
DROP TABLE `IntercorrenciaEtapa`;

-- DropTable
DROP TABLE `IntercorrenciaFuncionario`;

-- DropTable
DROP TABLE `Intercorrencias`;

-- CreateTable
CREATE TABLE `Notificacoes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estabelecimentoCnpj` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `mensagem` VARCHAR(191) NOT NULL,
    `lida` BOOLEAN NOT NULL DEFAULT false,
    `criadaEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Notificacoes` ADD CONSTRAINT `Notificacoes_estabelecimentoCnpj_fkey` FOREIGN KEY (`estabelecimentoCnpj`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;
