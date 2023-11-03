-- CreateTable
CREATE TABLE `Estoque_Tecidos` (
    `id_do_tecido` INTEGER NOT NULL AUTO_INCREMENT,
    `nome_do_tecido` VARCHAR(191) NOT NULL,
    `valor` DOUBLE NOT NULL,
    `fornecedor` VARCHAR(191) NOT NULL,
    `composicao` VARCHAR(191) NULL,
    `largura` DOUBLE NULL,
    `peso` DOUBLE NULL,
    `estoque` INTEGER NOT NULL,
    `data_` DATETIME(3) NOT NULL,
    `tamanho` DOUBLE NULL,
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
    `idade` INTEGER NOT NULL,
    `funcoes` VARCHAR(191) NULL,
    `aniversario` DATETIME(3) NULL,
    `identidade` VARCHAR(191) NULL,
    `cpf` VARCHAR(191) NULL,
    `pis` VARCHAR(191) NULL,
    `pix` VARCHAR(191) NULL,
    `data` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `Horas_faltas` DOUBLE NULL,
    `Horas_extras` DOUBLE NULL,
    `justificativa` VARCHAR(191) NULL,
    `notas` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tarefas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tarefa` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `data_abertura` DATETIME(3) NOT NULL,
    `data_conclusao` DATETIME(3) NULL,
    `notas` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pedidos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `Tipo_do_pedido` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `data_do_pedido` DATETIME(3) NOT NULL,
    `data_de_entrega` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
