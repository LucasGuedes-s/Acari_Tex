-- AlterTable
ALTER TABLE `Etapa` ADD COLUMN `id_Estabelecimento` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Etapa` ADD CONSTRAINT `Etapa_id_Estabelecimento_fkey` FOREIGN KEY (`id_Estabelecimento`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE SET NULL ON UPDATE CASCADE;
