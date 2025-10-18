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
    `status` VARCHAR(191) NULL DEFAULT 'ativo',
    `estabelecimentoCnpj` VARCHAR(191) NOT NULL,
    `permissoes` INTEGER NULL,

    INDEX `Usuarios_estabelecimentoCnpj_fkey`(`estabelecimentoCnpj`),
    PRIMARY KEY (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Estabelecimento` (
    `cnpj` VARCHAR(191) NOT NULL,

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
    `tempo_estimado` DOUBLE NULL,
    `tempo_esperado` DOUBLE NULL,

    INDEX `PecasOP_id_Estabelecimento_fkey`(`id_Estabelecimento`),
    PRIMARY KEY (`id_da_op`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Etapa` (
    `id_da_funcao` INTEGER NOT NULL AUTO_INCREMENT,
    `descricao` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Etapa_descricao_key`(`descricao`),
    PRIMARY KEY (`id_da_funcao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PecasEtapas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_da_op` INTEGER NOT NULL,
    `id_da_funcao` INTEGER NOT NULL,
    `quantidade_meta` INTEGER NOT NULL,
    `status` VARCHAR(191) NULL DEFAULT 'pendente',

    INDEX `PecasEtapas_id_da_funcao_fkey`(`id_da_funcao`),
    UNIQUE INDEX `PecasEtapas_id_da_op_id_da_funcao_key`(`id_da_op`, `id_da_funcao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Producao` (
    `id_da_producao` INTEGER NOT NULL AUTO_INCREMENT,
    `quantidade_pecas` INTEGER NULL,
    `id_Estabelecimento` VARCHAR(191) NOT NULL,
    `id_da_op` INTEGER NOT NULL,
    `id_funcionario` VARCHAR(191) NOT NULL,
    `id_da_funcao` INTEGER NOT NULL,
    `data_inicio` DATETIME(3) NULL,
    `hora_registro` VARCHAR(191) NULL,

    INDEX `Producao_id_da_op_idx`(`id_da_op`),
    INDEX `Producao_id_da_funcao_idx`(`id_da_funcao`),
    INDEX `Producao_id_Estabelecimento_fkey`(`id_Estabelecimento`),
    INDEX `Producao_id_funcionario_fkey`(`id_funcionario`),
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

    INDEX `Estoque_Tecidos_id_Estabelecimento_fkey`(`id_Estabelecimento`),
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

    INDEX `Estoque_Agulhas_id_Estabelecimento_fkey`(`id_Estabelecimento`),
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
    `prioridade` VARCHAR(191) NULL,

    INDEX `Tarefas_id_Estabelecimento_fkey`(`id_Estabelecimento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EquipesGrupos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `estabelecimentoCnpj` VARCHAR(191) NOT NULL,

    INDEX `EquipesGrupos_estabelecimentoCnpj_fkey`(`estabelecimentoCnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EquipesUsuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioEmail` VARCHAR(191) NOT NULL,
    `equipeId` INTEGER NOT NULL,

    INDEX `EquipesUsuarios_equipeId_fkey`(`equipeId`),
    UNIQUE INDEX `EquipesUsuarios_usuarioEmail_equipeId_key`(`usuarioEmail`, `equipeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TempoReferencia` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estabelecimentoCnpj` VARCHAR(191) NOT NULL,
    `id_funcionario` VARCHAR(191) NOT NULL,
    `id_da_funcao` INTEGER NOT NULL,
    `tempo_minutos` DOUBLE NULL,
    `quantidade_pecas` INTEGER NULL,
    `observacoes` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `registradoPor` VARCHAR(191) NULL,

    INDEX `TempoReferencia_id_da_funcao_idx`(`id_da_funcao`),
    INDEX `TempoReferencia_id_funcionario_idx`(`id_funcionario`),
    UNIQUE INDEX `TempoReferencia_estabelecimentoCnpj_id_funcionario_id_da_fun_key`(`estabelecimentoCnpj`, `id_funcionario`, `id_da_funcao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IntercorrenciaEtapa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_intercorrencia` INTEGER NOT NULL,
    `id_da_funcao` INTEGER NOT NULL,

    INDEX `IntercorrenciaEtapa_id_da_funcao_fkey`(`id_da_funcao`),
    UNIQUE INDEX `IntercorrenciaEtapa_id_intercorrencia_id_da_funcao_key`(`id_intercorrencia`, `id_da_funcao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IntercorrenciaFuncionario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_intercorrencia` INTEGER NOT NULL,
    `id_funcionario` VARCHAR(191) NOT NULL,

    INDEX `IntercorrenciaFuncionario_id_funcionario_fkey`(`id_funcionario`),
    UNIQUE INDEX `IntercorrenciaFuncionario_id_intercorrencia_id_funcionario_key`(`id_intercorrencia`, `id_funcionario`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Intercorrencias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_da_op` INTEGER NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `data_inicio` DATETIME(3) NULL,
    `data_fim` DATETIME(3) NULL,
    `horas_perdidas` DOUBLE NULL,
    `perda_financeira` DOUBLE NULL,
    `resolvida` BOOLEAN NULL DEFAULT false,
    `notas` VARCHAR(191) NULL,
    `estabelecimentoCnpj` VARCHAR(191) NOT NULL,

    INDEX `Intercorrencias_estabelecimentoCnpj_fkey`(`estabelecimentoCnpj`),
    INDEX `Intercorrencias_id_da_op_fkey`(`id_da_op`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Usuarios` ADD CONSTRAINT `Usuarios_estabelecimentoCnpj_fkey` FOREIGN KEY (`estabelecimentoCnpj`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PecasOP` ADD CONSTRAINT `PecasOP_id_Estabelecimento_fkey` FOREIGN KEY (`id_Estabelecimento`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PecasEtapas` ADD CONSTRAINT `PecasEtapas_id_da_funcao_fkey` FOREIGN KEY (`id_da_funcao`) REFERENCES `Etapa`(`id_da_funcao`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PecasEtapas` ADD CONSTRAINT `PecasEtapas_id_da_op_fkey` FOREIGN KEY (`id_da_op`) REFERENCES `PecasOP`(`id_da_op`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producao` ADD CONSTRAINT `Producao_id_Estabelecimento_fkey` FOREIGN KEY (`id_Estabelecimento`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producao` ADD CONSTRAINT `Producao_id_da_funcao_fkey` FOREIGN KEY (`id_da_funcao`) REFERENCES `Etapa`(`id_da_funcao`) ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE `EquipesGrupos` ADD CONSTRAINT `EquipesGrupos_estabelecimentoCnpj_fkey` FOREIGN KEY (`estabelecimentoCnpj`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipesUsuarios` ADD CONSTRAINT `EquipesUsuarios_equipeId_fkey` FOREIGN KEY (`equipeId`) REFERENCES `EquipesGrupos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipesUsuarios` ADD CONSTRAINT `EquipesUsuarios_usuarioEmail_fkey` FOREIGN KEY (`usuarioEmail`) REFERENCES `Usuarios`(`email`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TempoReferencia` ADD CONSTRAINT `TempoReferencia_estabelecimentoCnpj_fkey` FOREIGN KEY (`estabelecimentoCnpj`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TempoReferencia` ADD CONSTRAINT `TempoReferencia_id_da_funcao_fkey` FOREIGN KEY (`id_da_funcao`) REFERENCES `Etapa`(`id_da_funcao`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TempoReferencia` ADD CONSTRAINT `TempoReferencia_id_funcionario_fkey` FOREIGN KEY (`id_funcionario`) REFERENCES `Usuarios`(`email`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IntercorrenciaEtapa` ADD CONSTRAINT `IntercorrenciaEtapa_id_da_funcao_fkey` FOREIGN KEY (`id_da_funcao`) REFERENCES `Etapa`(`id_da_funcao`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IntercorrenciaEtapa` ADD CONSTRAINT `IntercorrenciaEtapa_id_intercorrencia_fkey` FOREIGN KEY (`id_intercorrencia`) REFERENCES `Intercorrencias`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IntercorrenciaFuncionario` ADD CONSTRAINT `IntercorrenciaFuncionario_id_funcionario_fkey` FOREIGN KEY (`id_funcionario`) REFERENCES `Usuarios`(`email`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IntercorrenciaFuncionario` ADD CONSTRAINT `IntercorrenciaFuncionario_id_intercorrencia_fkey` FOREIGN KEY (`id_intercorrencia`) REFERENCES `Intercorrencias`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Intercorrencias` ADD CONSTRAINT `Intercorrencias_estabelecimentoCnpj_fkey` FOREIGN KEY (`estabelecimentoCnpj`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Intercorrencias` ADD CONSTRAINT `Intercorrencias_id_da_op_fkey` FOREIGN KEY (`id_da_op`) REFERENCES `PecasOP`(`id_da_op`) ON DELETE CASCADE ON UPDATE CASCADE;
