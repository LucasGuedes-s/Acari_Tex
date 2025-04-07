/*
  Warnings:

  - You are about to drop the column `data` on the `Producao` table. All the data in the column will be lost.
  - You are about to drop the `Funcoes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Funcoes` DROP FOREIGN KEY `Funcoes_id_da_op_fkey`;

-- AlterTable
ALTER TABLE `Producao` DROP COLUMN `data`,
    ADD COLUMN `data_fim` VARCHAR(191) NULL,
    ADD COLUMN `data_inicio` VARCHAR(191) NULL,
    MODIFY `quantidade_pecas` INTEGER NULL;

-- DropTable
DROP TABLE `Funcoes`;

-- CreateTable
CREATE TABLE `Etapa` (
    `id_da_funcao` INTEGER NOT NULL AUTO_INCREMENT,
    `descricao` VARCHAR(191) NOT NULL,
    `id_da_op` INTEGER NOT NULL,

    PRIMARY KEY (`id_da_funcao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Etapa` ADD CONSTRAINT `Etapa_id_da_op_fkey` FOREIGN KEY (`id_da_op`) REFERENCES `PecasOP`(`id_da_op`) ON DELETE RESTRICT ON UPDATE CASCADE;
