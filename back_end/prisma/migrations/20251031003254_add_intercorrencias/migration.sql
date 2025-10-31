-- AlterTable
ALTER TABLE `Estabelecimento` ADD COLUMN `endereco` VARCHAR(191) NULL,
    ADD COLUMN `telefone` VARCHAR(191) NULL,
    ADD COLUMN `tempo_de_producao` INTEGER NULL DEFAULT 480;

-- CreateTable
CREATE TABLE `Intercorrencias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estabelecimentoCnpj` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `registradaPor` VARCHAR(191) NULL,
    `tempo_perda` DOUBLE NULL,
    `data_ocorrencia` DATETIME(3) NOT NULL,
    `notas` VARCHAR(191) NULL,

    INDEX `Intercorrencias_estabelecimentoCnpj_fkey`(`estabelecimentoCnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Intercorrencias` ADD CONSTRAINT `Intercorrencias_estabelecimentoCnpj_fkey` FOREIGN KEY (`estabelecimentoCnpj`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;
