-- CreateTable
CREATE TABLE `estoque` (
    `id_do_tecido` INTEGER NOT NULL AUTO_INCREMENT,
    `nome_do_tecido` VARCHAR(191) NOT NULL,
    `valor` DOUBLE NOT NULL,
    `fornecedor` VARCHAR(191) NOT NULL,
    `composicao` VARCHAR(191) NULL,
    `largura` DOUBLE NULL,
    `peso` DOUBLE NULL,
    `estoque` INTEGER NOT NULL,
    `data` DATETIME(3) NOT NULL,
    `notas` VARCHAR(191) NULL,

    PRIMARY KEY (`id_do_tecido`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Estoque_Agulhas` (
    `id_da_agulha` INTEGER NOT NULL AUTO_INCREMENT,
    `valor` DOUBLE NOT NULL,
    `fornecedor` VARCHAR(191) NULL,
    `numeracao` VARCHAR(191) NULL,
    `estoque` INTEGER NOT NULL,
    `data` DATETIME(3) NOT NULL,
    `notas` VARCHAR(191) NULL,

    PRIMARY KEY (`id_da_agulha`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Funcionarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome_do_funcionario` VARCHAR(191) NOT NULL,
    `idade` VARCHAR(191) NOT NULL,
    `funcoes` VARCHAR(191) NOT NULL,
    `data` DATETIME(3) NOT NULL,
    `notas` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
