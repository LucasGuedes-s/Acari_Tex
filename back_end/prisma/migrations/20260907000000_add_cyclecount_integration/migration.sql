-- CreateTable
CREATE TABLE `CycleCountSession` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sessionId` VARCHAR(191) NOT NULL,
    `stationId` VARCHAR(191) NOT NULL,
    `estabelecimentoCnpj` VARCHAR(191) NOT NULL,
    `operatorId` VARCHAR(191) NOT NULL,
    `opId` INTEGER NOT NULL,
    `operationId` INTEGER NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endedAt` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CycleCountSession_sessionId_key`(`sessionId`),
    INDEX `CycleCountSession_estabelecimentoCnpj_idx`(`estabelecimentoCnpj`),
    INDEX `CycleCountSession_operatorId_idx`(`operatorId`),
    INDEX `CycleCountSession_opId_idx`(`opId`),
    INDEX `CycleCountSession_stationId_idx`(`stationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- CreateTable
CREATE TABLE `CycleCountEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventId` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NULL,
    `stationId` VARCHAR(191) NULL,
    `operatorId` VARCHAR(191) NULL,
    `opId` INTEGER NULL,
    `operation` VARCHAR(191) NULL,
    `cycleId` INTEGER NULL,
    `state` VARCHAR(191) NOT NULL,
    `cycleCompleted` BOOLEAN NOT NULL DEFAULT false,
    `startedAt` DATETIME(3) NULL,
    `endedAt` DATETIME(3) NULL,
    `confidence` DOUBLE NULL,
    `durationS` DOUBLE NULL,
    `sewingTimeS` DOUBLE NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'cyclecount',
    `rawPayload` JSON NULL,
    `productionId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,

    UNIQUE INDEX `CycleCountEvent_eventId_key`(`eventId`),
    UNIQUE INDEX `CycleCountEvent_productionId_key`(`productionId`),
    INDEX `CycleCountEvent_sessionId_idx`(`sessionId`),
    INDEX `CycleCountEvent_operatorId_idx`(`operatorId`),
    INDEX `CycleCountEvent_opId_idx`(`opId`),
    INDEX `CycleCountEvent_state_idx`(`state`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- Add cycleCountEventId to Producao
-- IMPORTANTE:
-- A coluna precisa existir antes da criação da foreign key.
ALTER TABLE `Producao`
ADD COLUMN `cycleCountEventId` INTEGER NULL;


-- CreateTable
CREATE TABLE `CycleCountAdjustment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cycleCountEventId` INTEGER NOT NULL,
    `delta` INTEGER NOT NULL,
    `reason` VARCHAR(191) NULL,
    `user` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CycleCountAdjustment_cycleCountEventId_key`(`cycleCountEventId`),
    INDEX `CycleCountAdjustment_cycleCountEventId_idx`(`cycleCountEventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- AddForeignKey
ALTER TABLE `CycleCountSession`
ADD CONSTRAINT `CycleCountSession_estabelecimentoCnpj_fkey`
FOREIGN KEY (`estabelecimentoCnpj`)
REFERENCES `Estabelecimento`(`cnpj`)
ON DELETE RESTRICT
ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE `CycleCountSession`
ADD CONSTRAINT `CycleCountSession_operatorId_fkey`
FOREIGN KEY (`operatorId`)
REFERENCES `Usuarios`(`email`)
ON DELETE RESTRICT
ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE `CycleCountSession`
ADD CONSTRAINT `CycleCountSession_opId_fkey`
FOREIGN KEY (`opId`)
REFERENCES `PecasOP`(`id_da_op`)
ON DELETE RESTRICT
ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE `CycleCountSession`
ADD CONSTRAINT `CycleCountSession_operationId_fkey`
FOREIGN KEY (`operationId`)
REFERENCES `Etapa`(`id_da_funcao`)
ON DELETE SET NULL
ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE `CycleCountEvent`
ADD CONSTRAINT `CycleCountEvent_sessionId_fkey`
FOREIGN KEY (`sessionId`)
REFERENCES `CycleCountSession`(`sessionId`)
ON DELETE SET NULL
ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE `CycleCountEvent`
ADD CONSTRAINT `CycleCountEvent_productionId_fkey`
FOREIGN KEY (`productionId`)
REFERENCES `Producao`(`id_da_producao`)
ON DELETE SET NULL
ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE `Producao`
ADD CONSTRAINT `Producao_cycleCountEventId_fkey`
FOREIGN KEY (`cycleCountEventId`)
REFERENCES `CycleCountEvent`(`id`)
ON DELETE SET NULL
ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE `CycleCountAdjustment`
ADD CONSTRAINT `CycleCountAdjustment_cycleCountEventId_fkey`
FOREIGN KEY (`cycleCountEventId`)
REFERENCES `CycleCountEvent`(`id`)
ON DELETE RESTRICT
ON UPDATE CASCADE;