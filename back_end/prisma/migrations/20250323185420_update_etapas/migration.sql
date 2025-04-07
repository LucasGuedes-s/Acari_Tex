-- DropForeignKey
ALTER TABLE `Etapa` DROP FOREIGN KEY `Etapa_id_da_op_fkey`;

-- DropIndex
DROP INDEX `Etapa_id_da_op_fkey` ON `Etapa`;

-- AlterTable
ALTER TABLE `Etapa` MODIFY `id_da_op` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Etapa` ADD CONSTRAINT `Etapa_id_da_op_fkey` FOREIGN KEY (`id_da_op`) REFERENCES `PecasOP`(`id_da_op`) ON DELETE SET NULL ON UPDATE CASCADE;
