-- CreateTable
CREATE TABLE `Funcoes` (
    `id_da_funcao` INTEGER NOT NULL AUTO_INCREMENT,
    `descricao` VARCHAR(191) NOT NULL,
    `id_da_op` INTEGER NOT NULL,

    PRIMARY KEY (`id_da_funcao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Funcoes` ADD CONSTRAINT `Funcoes_id_da_op_fkey` FOREIGN KEY (`id_da_op`) REFERENCES `PecasOP`(`id_da_op`) ON DELETE RESTRICT ON UPDATE CASCADE;
