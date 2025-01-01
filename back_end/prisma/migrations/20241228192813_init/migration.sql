-- CreateTable
CREATE TABLE `Usuarios` (
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha` VARCHAR(191) NOT NULL,
    `foto` VARCHAR(2048) NOT NULL,
    `idade` INTEGER NOT NULL,
    `funcoes` VARCHAR(191) NULL,
    `identidade` VARCHAR(191) NULL,
    `cpf` VARCHAR(191) NULL,
    `pis` VARCHAR(191) NULL,
    `pix` VARCHAR(191) NULL,
    `notas` VARCHAR(191) NULL,

    PRIMARY KEY (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Estabelecimento` (
    `cnpj` VARCHAR(191) NOT NULL,
    `id_usuarios` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`cnpj`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PecasOP` (
    `id_da_op` INTEGER NOT NULL AUTO_INCREMENT,
    `id_Estabelecimento` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NULL,
    `descricao` VARCHAR(191) NULL,
    `quantidade_pecas` INTEGER NULL,
    `pedido_por` VARCHAR(191) NULL,
    `valor_peca` DOUBLE NULL,
    `data_do_pedido` VARCHAR(191) NULL,
    `data_de_entrega` VARCHAR(191) NULL,
    `notas` VARCHAR(191) NULL,

    PRIMARY KEY (`id_da_op`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Producao` (
    `id_da_producao` INTEGER NOT NULL AUTO_INCREMENT,
    `quantidade_pecas` INTEGER NOT NULL,
    `id_Estabelecimento` VARCHAR(191) NOT NULL,
    `id_da_op` INTEGER NOT NULL,
    `id_funcionario` VARCHAR(191) NOT NULL,
    `data` VARCHAR(191) NULL,

    PRIMARY KEY (`id_da_producao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Estoque_Tecidos` (
    `id_do_tecido` INTEGER NOT NULL AUTO_INCREMENT,
    `id_Estabelecimento` VARCHAR(191) NOT NULL,
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
    `id_Estabelecimento` VARCHAR(191) NOT NULL,
    `valor` DOUBLE NOT NULL,
    `fornecedor` VARCHAR(191) NULL,
    `numeracao` VARCHAR(191) NULL,
    `estoque` INTEGER NOT NULL,
    `data` DATETIME(3) NOT NULL,
    `notas` VARCHAR(191) NULL,

    PRIMARY KEY (`id_da_agulha`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tarefas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_Estabelecimento` VARCHAR(191) NOT NULL,
    `tarefa` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `data_abertura` DATETIME(3) NOT NULL,
    `data_conclusao` DATETIME(3) NULL,
    `notas` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Estabelecimento` ADD CONSTRAINT `Estabelecimento_id_usuarios_fkey` FOREIGN KEY (`id_usuarios`) REFERENCES `Usuarios`(`email`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PecasOP` ADD CONSTRAINT `PecasOP_id_Estabelecimento_fkey` FOREIGN KEY (`id_Estabelecimento`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producao` ADD CONSTRAINT `Producao_id_Estabelecimento_fkey` FOREIGN KEY (`id_Estabelecimento`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producao` ADD CONSTRAINT `Producao_id_da_op_fkey` FOREIGN KEY (`id_da_op`) REFERENCES `PecasOP`(`id_da_op`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producao` ADD CONSTRAINT `Producao_id_funcionario_fkey` FOREIGN KEY (`id_funcionario`) REFERENCES `Usuarios`(`email`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Estoque_Tecidos` ADD CONSTRAINT `Estoque_Tecidos_id_Estabelecimento_fkey` FOREIGN KEY (`id_Estabelecimento`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Estoque_Agulhas` ADD CONSTRAINT `Estoque_Agulhas_id_Estabelecimento_fkey` FOREIGN KEY (`id_Estabelecimento`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tarefas` ADD CONSTRAINT `Tarefas_id_Estabelecimento_fkey` FOREIGN KEY (`id_Estabelecimento`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;
