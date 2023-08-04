-- CreateTable
CREATE TABLE `estoque` (
    `id_do_tecido` INTEGER NOT NULL AUTO_INCREMENT,
    `nome_do_tecido` VARCHAR(191) NOT NULL,
    `fornecedor` VARCHAR(191) NOT NULL,
    `composicao` VARCHAR(191) NOT NULL,
    `largura` DOUBLE NOT NULL,
    `peso` DOUBLE NOT NULL,
    `estoque` INTEGER NOT NULL,
    `notas` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id_do_tecido`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
