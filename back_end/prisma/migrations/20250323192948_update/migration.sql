/*
  Warnings:

  - You are about to drop the column `id_da_op` on the `Etapa` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[descricao]` on the table `Etapa` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `Etapa` DROP FOREIGN KEY `Etapa_id_da_op_fkey`;

-- DropIndex
DROP INDEX `Etapa_id_da_op_fkey` ON `Etapa`;

-- AlterTable
ALTER TABLE `Etapa` DROP COLUMN `id_da_op`;

-- CreateTable
CREATE TABLE `PecasEtapas` (
    `id_da_op` INTEGER NOT NULL,
    `id_da_funcao` INTEGER NOT NULL,

    PRIMARY KEY (`id_da_op`, `id_da_funcao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Etapa_descricao_key` ON `Etapa`(`descricao`);

-- AddForeignKey
ALTER TABLE `PecasEtapas` ADD CONSTRAINT `PecasEtapas_id_da_op_fkey` FOREIGN KEY (`id_da_op`) REFERENCES `PecasOP`(`id_da_op`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PecasEtapas` ADD CONSTRAINT `PecasEtapas_id_da_funcao_fkey` FOREIGN KEY (`id_da_funcao`) REFERENCES `Etapa`(`id_da_funcao`) ON DELETE CASCADE ON UPDATE CASCADE;
