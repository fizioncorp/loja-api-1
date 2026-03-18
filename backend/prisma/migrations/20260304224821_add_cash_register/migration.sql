-- CreateTable
CREATE TABLE "CashRegister" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "initial" DOUBLE PRECISION NOT NULL,
    "sales" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "CashRegister_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CashRegister" ADD CONSTRAINT "CashRegister_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
