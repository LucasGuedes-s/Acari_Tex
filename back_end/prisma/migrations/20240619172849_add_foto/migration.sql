/*
  Warnings:

  - Added the required column `foto` to the `Funcionarios` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Funcionarios` ADD COLUMN `foto` VARCHAR(2048) NOT NULL;
