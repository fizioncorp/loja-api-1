-- remover coluna antiga
ALTER TABLE "StockMovement" DROP COLUMN "type";

-- recriar coluna com tipo correto
ALTER TABLE "StockMovement"
ADD COLUMN "type" TEXT NOT NULL DEFAULT 'ADJUST';