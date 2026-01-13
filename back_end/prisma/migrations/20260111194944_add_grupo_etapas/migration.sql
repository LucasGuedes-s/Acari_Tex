-- AlterTable
ALTER TABLE `Etapa` ADD COLUMN `grupoEtapaId` INTEGER NULL;

-- AlterTable
ALTER TABLE `PecasOP` ADD COLUMN `local_armazenamento` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `GrupoEtapas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Etapa` ADD CONSTRAINT `Etapa_grupoEtapaId_fkey` FOREIGN KEY (`grupoEtapaId`) REFERENCES `GrupoEtapas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
