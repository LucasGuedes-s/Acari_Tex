-- CreateTable
CREATE TABLE `ChatIAResultado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `resultado` TEXT NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioEmail` VARCHAR(191) NOT NULL,
    `estabelecimentoCnpj` VARCHAR(191) NOT NULL,

    INDEX `ChatIAResultado_usuarioEmail_idx`(`usuarioEmail`),
    INDEX `ChatIAResultado_estabelecimentoCnpj_idx`(`estabelecimentoCnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ChatIAResultado` ADD CONSTRAINT `ChatIAResultado_usuarioEmail_fkey` FOREIGN KEY (`usuarioEmail`) REFERENCES `Usuarios`(`email`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatIAResultado` ADD CONSTRAINT `ChatIAResultado_estabelecimentoCnpj_fkey` FOREIGN KEY (`estabelecimentoCnpj`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;
