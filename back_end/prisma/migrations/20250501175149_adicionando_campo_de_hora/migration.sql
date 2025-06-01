/*
  Warnings:

  - You are about to drop the column `data_fim` on the `Producao` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Producao` DROP COLUMN `data_fim`,
    ADD COLUMN `hora_registro` VARCHAR(191) NULL;
