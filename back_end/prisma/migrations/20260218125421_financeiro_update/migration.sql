-- CreateTable
CREATE TABLE `Financeiro` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estabelecimentoCnpj` VARCHAR(191) NOT NULL,
    `notaFiscal` VARCHAR(191) NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `categoria` VARCHAR(191) NOT NULL,
    `valor` DOUBLE NOT NULL,
    `data` DATETIME(3) NOT NULL,
    `saldoRestante` DOUBLE NULL DEFAULT 0,
    `registradaPor` VARCHAR(191) NULL,
    `descricao` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Financeiro_estabelecimentoCnpj_fkey`(`estabelecimentoCnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Financeiro` ADD CONSTRAINT `Financeiro_estabelecimentoCnpj_fkey` FOREIGN KEY (`estabelecimentoCnpj`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;
