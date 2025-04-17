/*
  Warnings:

  - You are about to drop the column `id_usuarios` on the `Estabelecimento` table. All the data in the column will be lost.
  - Added the required column `id_da_funcao` to the `Producao` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estabelecimentoCnpj` to the `Usuarios` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Estabelecimento` DROP FOREIGN KEY `Estabelecimento_id_usuarios_fkey`;

-- DropIndex
DROP INDEX `Estabelecimento_id_usuarios_fkey` ON `Estabelecimento`;

-- AlterTable
ALTER TABLE `Estabelecimento` DROP COLUMN `id_usuarios`;

-- AlterTable
ALTER TABLE `Producao` ADD COLUMN `id_da_funcao` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Usuarios` ADD COLUMN `estabelecimentoCnpj` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `Producao_id_da_funcao_idx` ON `Producao`(`id_da_funcao`);

-- AddForeignKey
ALTER TABLE `Usuarios` ADD CONSTRAINT `Usuarios_estabelecimentoCnpj_fkey` FOREIGN KEY (`estabelecimentoCnpj`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producao` ADD CONSTRAINT `Producao_id_da_funcao_fkey` FOREIGN KEY (`id_da_funcao`) REFERENCES `Etapa`(`id_da_funcao`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `Producao` RENAME INDEX `Producao_id_da_op_fkey` TO `Producao_id_da_op_idx`;
