/*
  Warnings:

  - You are about to alter the column `idade` on the `Funcionarios` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- AlterTable
ALTER TABLE `Funcionarios` MODIFY `idade` INTEGER NOT NULL,
    MODIFY `funcoes` VARCHAR(191) NULL,
    MODIFY `identidade` VARCHAR(191) NULL,
    MODIFY `pis` VARCHAR(191) NULL;
