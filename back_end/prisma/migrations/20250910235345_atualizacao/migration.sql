/*
  Warnings:

  - You are about to alter the column `data_inicio` on the `Producao` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `DateTime(3)`.
  - Added the required column `quantidade_meta` to the `PecasEtapas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `PecasEtapas` ADD COLUMN `quantidade_meta` INTEGER NOT NULL,
    ADD COLUMN `status` VARCHAR(191) NULL DEFAULT 'pendente';

-- AlterTable
ALTER TABLE `PecasOP` ADD COLUMN `tempo_esperado` DOUBLE NULL,
    ADD COLUMN `tempo_estimado` DOUBLE NULL;

-- AlterTable
ALTER TABLE `Producao` MODIFY `data_inicio` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Usuarios` ADD COLUMN `status` VARCHAR(191) NULL DEFAULT 'ativo';

-- CreateTable
CREATE TABLE `EquipesGrupos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `estabelecimentoCnpj` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_EquipesGruposToUsuarios` (
    `A` INTEGER NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_EquipesGruposToUsuarios_AB_unique`(`A`, `B`),
    INDEX `_EquipesGruposToUsuarios_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EquipesGrupos` ADD CONSTRAINT `EquipesGrupos_estabelecimentoCnpj_fkey` FOREIGN KEY (`estabelecimentoCnpj`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_EquipesGruposToUsuarios` ADD CONSTRAINT `_EquipesGruposToUsuarios_A_fkey` FOREIGN KEY (`A`) REFERENCES `EquipesGrupos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_EquipesGruposToUsuarios` ADD CONSTRAINT `_EquipesGruposToUsuarios_B_fkey` FOREIGN KEY (`B`) REFERENCES `Usuarios`(`email`) ON DELETE CASCADE ON UPDATE CASCADE;
