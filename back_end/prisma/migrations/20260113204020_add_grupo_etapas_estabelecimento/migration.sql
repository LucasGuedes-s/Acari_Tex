/*
  Warnings:

  - Added the required column `estabelecimentoCnpj` to the `GrupoEtapas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `GrupoEtapas` ADD COLUMN `estabelecimentoCnpj` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `GrupoEtapas` ADD CONSTRAINT `GrupoEtapas_estabelecimentoCnpj_fkey` FOREIGN KEY (`estabelecimentoCnpj`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;
