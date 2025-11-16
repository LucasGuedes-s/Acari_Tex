/*
  Warnings:

  - You are about to drop the column `classidicacao` on the `Intercorrencias` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Intercorrencias` DROP COLUMN `classidicacao`,
    ADD COLUMN `classificacao` VARCHAR(191) NULL;
