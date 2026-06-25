-- CreateTable
CREATE TABLE `Usuarios` (
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha` VARCHAR(191) NOT NULL,
    `foto` VARCHAR(2048) NOT NULL,
    `idade` INTEGER NOT NULL,
    `funcoes` VARCHAR(191) NULL,
    `identidade` VARCHAR(191) NULL,
    `permissoes` INTEGER NULL,
    `cpf` VARCHAR(191) NULL,
    `pis` VARCHAR(191) NULL,
    `pix` VARCHAR(191) NULL,
    `notas` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL DEFAULT 'ativo',
    `estabelecimentoCnpj` VARCHAR(191) NOT NULL,
    `salario` DOUBLE NULL,
    `telefone` VARCHAR(191) NULL,

    INDEX `Usuarios_estabelecimentoCnpj_fkey`(`estabelecimentoCnpj`),
    PRIMARY KEY (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Estabelecimento` (
    `cnpj` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NULL,
    `endereco` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `tempo_de_producao` INTEGER NULL DEFAULT 480,
    `logo` VARCHAR(2048) NULL,
    `peca_final` VARCHAR(191) NULL,

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
    `tempo_padrao` DOUBLE NULL,
    `cem_porcento` DOUBLE NULL,
    `local_armazenamento` VARCHAR(191) NULL,

    INDEX `PecasOP_id_Estabelecimento_fkey`(`id_Estabelecimento`),
    PRIMARY KEY (`id_da_op`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EficienciaTurma` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estabelecimentoCnpj` VARCHAR(191) NOT NULL,
    `tempo_padrao` INTEGER NOT NULL,
    `minutos_disponiveis` DOUBLE NOT NULL,
    `quantidade_produzida` INTEGER NOT NULL,
    `quantidade_pessoas` DOUBLE NOT NULL,
    `eficiencia_percent` DOUBLE NOT NULL,
    `calculadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EficienciaTurma_estabelecimentoCnpj_key`(`estabelecimentoCnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Etapa` (
    `id_da_funcao` INTEGER NOT NULL AUTO_INCREMENT,
    `descricao` VARCHAR(191) NOT NULL,
    `tempo_padrao` DOUBLE NULL,
    `id_Estabelecimento` VARCHAR(191) NULL,
    `grupoEtapaId` INTEGER NULL,

    INDEX `Etapa_grupoEtapaId_fkey`(`grupoEtapaId`),
    INDEX `Etapa_id_Estabelecimento_fkey`(`id_Estabelecimento`),
    PRIMARY KEY (`id_da_funcao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GrupoEtapas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `estabelecimentoCnpj` VARCHAR(191) NOT NULL,

    INDEX `GrupoEtapas_estabelecimentoCnpj_fkey`(`estabelecimentoCnpj`),
    PRIMARY KEY (`id`)
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
    `horaNumero` INTEGER NULL,
    `dataReferencia` DATE NULL,
    `tipoRegistro` VARCHAR(191) NULL DEFAULT 'principal',
    `tempo_produzido` DOUBLE NULL DEFAULT 60,

    INDEX `Producao_id_da_op_idx`(`id_da_op`),
    INDEX `Producao_id_da_funcao_idx`(`id_da_funcao`),
    INDEX `Producao_id_Estabelecimento_idx`(`id_Estabelecimento`),
    INDEX `Producao_id_funcionario_idx`(`id_funcionario`),
    UNIQUE INDEX `Producao_id_funcionario_id_da_funcao_id_da_op_dataReferencia_key`(`id_funcionario`, `id_da_funcao`, `id_da_op`, `dataReferencia`, `hora_registro`, `tipoRegistro`),
    PRIMARY KEY (`id_da_producao`)
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
CREATE TABLE `AlocacaoProducaoDia` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estabelecimentoCnpj` VARCHAR(191) NOT NULL,
    `data` DATETIME(3) NOT NULL,
    `id_da_op` INTEGER NOT NULL,
    `funcionarioEmail` VARCHAR(191) NOT NULL,
    `etapaId` INTEGER NULL,
    `quantidadePlanejada` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ativa',

    INDEX `AlocacaoProducaoDia_data_id_da_op_idx`(`data`, `id_da_op`),
    INDEX `AlocacaoProducaoDia_funcionarioEmail_idx`(`funcionarioEmail`),
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
    `data_medicao` DATETIME(3) NULL,
    `fator_ritmo` DOUBLE NULL,
    `maquina` VARCHAR(191) NULL,
    `opId` INTEGER NULL,
    `percentual_tolerancia` DOUBLE NULL,
    `produtoId` INTEGER NULL,
    `quantidade_ciclos` INTEGER NULL,
    `tempo_por_peca` DOUBLE NULL,
    `tipo_medicao` VARCHAR(191) NULL,
    `tipo_operacao` VARCHAR(191) NULL,

    INDEX `TempoReferencia_estabelecimentoCnpj_id_funcionario_id_da_fun_idx`(`estabelecimentoCnpj`, `id_funcionario`, `id_da_funcao`),
    INDEX `TempoReferencia_id_da_funcao_idx`(`id_da_funcao`),
    INDEX `TempoReferencia_id_funcionario_idx`(`id_funcionario`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notificacoes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estabelecimentoCnpj` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `mensagem` VARCHAR(191) NOT NULL,
    `lida` BOOLEAN NOT NULL DEFAULT false,
    `criadaEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `etapa` VARCHAR(191) NULL DEFAULT 'Coletiva',

    INDEX `Notificacoes_estabelecimentoCnpj_fkey`(`estabelecimentoCnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Intercorrencias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estabelecimentoCnpj` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `registradaPor` VARCHAR(191) NULL,
    `tempo_perda` DOUBLE NULL,
    `data_ocorrencia` DATETIME(3) NOT NULL,
    `notas` VARCHAR(191) NULL,
    `classificacao` VARCHAR(191) NULL,
    `etapa` VARCHAR(191) NULL DEFAULT 'Coletiva',

    INDEX `Intercorrencias_estabelecimentoCnpj_fkey`(`estabelecimentoCnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `metaDia` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estabelecimentoCnpj` VARCHAR(191) NOT NULL,
    `data` DATETIME(3) NOT NULL,
    `meta_diaria` INTEGER NULL,
    `observacoes` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `registradoPor` VARCHAR(191) NULL,
    `id_da_op` INTEGER NULL,

    UNIQUE INDEX `metaDia_estabelecimentoCnpj_data_key`(`estabelecimentoCnpj`, `data`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MetaDiaPeca` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `metaDiaId` INTEGER NOT NULL,
    `id_da_op` INTEGER NOT NULL,
    `meta` INTEGER NOT NULL DEFAULT 0,

    INDEX `MetaDiaPeca_id_da_op_fkey`(`id_da_op`),
    UNIQUE INDEX `MetaDiaPeca_metaDiaId_id_da_op_key`(`metaDiaId`, `id_da_op`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MetaDiaFuncionario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `metaDiaId` INTEGER NOT NULL,
    `funcionarioId` VARCHAR(191) NOT NULL,
    `etapaPadraoId` INTEGER NULL,

    INDEX `MetaDiaFuncionario_etapaPadraoId_fkey`(`etapaPadraoId`),
    INDEX `MetaDiaFuncionario_funcionarioId_fkey`(`funcionarioId`),
    UNIQUE INDEX `MetaDiaFuncionario_metaDiaId_funcionarioId_key`(`metaDiaId`, `funcionarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
ALTER TABLE `Usuarios` ADD CONSTRAINT `Usuarios_estabelecimentoCnpj_fkey` FOREIGN KEY (`estabelecimentoCnpj`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PecasOP` ADD CONSTRAINT `PecasOP_id_Estabelecimento_fkey` FOREIGN KEY (`id_Estabelecimento`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EficienciaTurma` ADD CONSTRAINT `EficienciaTurma_estabelecimentoCnpj_fkey` FOREIGN KEY (`estabelecimentoCnpj`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Etapa` ADD CONSTRAINT `Etapa_grupoEtapaId_fkey` FOREIGN KEY (`grupoEtapaId`) REFERENCES `GrupoEtapas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Etapa` ADD CONSTRAINT `Etapa_id_Estabelecimento_fkey` FOREIGN KEY (`id_Estabelecimento`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GrupoEtapas` ADD CONSTRAINT `GrupoEtapas_estabelecimentoCnpj_fkey` FOREIGN KEY (`estabelecimentoCnpj`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE `Tarefas` ADD CONSTRAINT `Tarefas_id_Estabelecimento_fkey` FOREIGN KEY (`id_Estabelecimento`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipesGrupos` ADD CONSTRAINT `EquipesGrupos_estabelecimentoCnpj_fkey` FOREIGN KEY (`estabelecimentoCnpj`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AlocacaoProducaoDia` ADD CONSTRAINT `AlocacaoProducaoDia_id_da_op_fkey` FOREIGN KEY (`id_da_op`) REFERENCES `PecasOP`(`id_da_op`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AlocacaoProducaoDia` ADD CONSTRAINT `AlocacaoProducaoDia_funcionarioEmail_fkey` FOREIGN KEY (`funcionarioEmail`) REFERENCES `Usuarios`(`email`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AlocacaoProducaoDia` ADD CONSTRAINT `AlocacaoProducaoDia_etapaId_fkey` FOREIGN KEY (`etapaId`) REFERENCES `Etapa`(`id_da_funcao`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipesUsuarios` ADD CONSTRAINT `EquipesUsuarios_equipeId_fkey` FOREIGN KEY (`equipeId`) REFERENCES `EquipesGrupos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipesUsuarios` ADD CONSTRAINT `EquipesUsuarios_usuarioEmail_fkey` FOREIGN KEY (`usuarioEmail`) REFERENCES `Usuarios`(`email`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TempoReferencia` ADD CONSTRAINT `TempoReferencia_id_da_funcao_fkey` FOREIGN KEY (`id_da_funcao`) REFERENCES `Etapa`(`id_da_funcao`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TempoReferencia` ADD CONSTRAINT `TempoReferencia_id_funcionario_fkey` FOREIGN KEY (`id_funcionario`) REFERENCES `Usuarios`(`email`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notificacoes` ADD CONSTRAINT `Notificacoes_estabelecimentoCnpj_fkey` FOREIGN KEY (`estabelecimentoCnpj`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Intercorrencias` ADD CONSTRAINT `Intercorrencias_estabelecimentoCnpj_fkey` FOREIGN KEY (`estabelecimentoCnpj`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MetaDiaPeca` ADD CONSTRAINT `MetaDiaPeca_id_da_op_fkey` FOREIGN KEY (`id_da_op`) REFERENCES `PecasOP`(`id_da_op`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MetaDiaPeca` ADD CONSTRAINT `MetaDiaPeca_metaDiaId_fkey` FOREIGN KEY (`metaDiaId`) REFERENCES `metaDia`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MetaDiaFuncionario` ADD CONSTRAINT `MetaDiaFuncionario_etapaPadraoId_fkey` FOREIGN KEY (`etapaPadraoId`) REFERENCES `Etapa`(`id_da_funcao`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MetaDiaFuncionario` ADD CONSTRAINT `MetaDiaFuncionario_funcionarioId_fkey` FOREIGN KEY (`funcionarioId`) REFERENCES `Usuarios`(`email`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MetaDiaFuncionario` ADD CONSTRAINT `MetaDiaFuncionario_metaDiaId_fkey` FOREIGN KEY (`metaDiaId`) REFERENCES `metaDia`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatIAResultado` ADD CONSTRAINT `ChatIAResultado_estabelecimentoCnpj_fkey` FOREIGN KEY (`estabelecimentoCnpj`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatIAResultado` ADD CONSTRAINT `ChatIAResultado_usuarioEmail_fkey` FOREIGN KEY (`usuarioEmail`) REFERENCES `Usuarios`(`email`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Financeiro` ADD CONSTRAINT `Financeiro_estabelecimentoCnpj_fkey` FOREIGN KEY (`estabelecimentoCnpj`) REFERENCES `Estabelecimento`(`cnpj`) ON DELETE RESTRICT ON UPDATE CASCADE;
