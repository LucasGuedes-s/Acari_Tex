/*
  Warnings:

  - You are about to drop the column `tempo_esperado` on the `PecasOP` table. All the data in the column will be lost.
  - You are about to drop the column `tempo_estimado` on the `PecasOP` table. All the data in the column will be lost.
  - You are about to drop the `Estoque_Agulhas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Estoque_Tecidos` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Estoque_Agulhas` DROP FOREIGN KEY `Estoque_Agulhas_id_Estabelecimento_fkey`;

-- DropForeignKey
ALTER TABLE `Estoque_Tecidos` DROP FOREIGN KEY `Estoque_Tecidos_id_Estabelecimento_fkey`;

-- AlterTable
ALTER TABLE `Estabelecimento` ADD COLUMN `nome` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `PecasOP` DROP COLUMN `tempo_esperado`,
    DROP COLUMN `tempo_estimado`;

-- DropTable
DROP TABLE `Estoque_Agulhas`;

-- DropTable
DROP TABLE `Estoque_Tecidos`;
