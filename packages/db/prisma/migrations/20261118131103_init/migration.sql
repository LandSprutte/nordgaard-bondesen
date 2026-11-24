-- CreateTable
CREATE TABLE "Account" (
    "number" TEXT NOT NULL,
    "name" TEXT,
    "balance" DECIMAL(14,2),
    "balanceDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("number")
);

-- CreateTable
CREATE TABLE "TextKey" (
    "key" TEXT NOT NULL,
    "label" TEXT,
    "category" TEXT,
    "isTransfer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TextKey_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Import" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "createdCount" INTEGER NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL,
    "text" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "counterparty" TEXT,
    "payer" TEXT,
    "note" TEXT,
    "receiverText" TEXT,
    "isInternalTransfer" BOOLEAN NOT NULL DEFAULT false,
    "fingerprint" TEXT NOT NULL,
    "importId" TEXT NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_fingerprint_key" ON "Transaction"("fingerprint");

-- CreateIndex
CREATE INDEX "Transaction_accountNumber_date_idx" ON "Transaction"("accountNumber", "date");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE INDEX "Transaction_key_idx" ON "Transaction"("key");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountNumber_fkey" FOREIGN KEY ("accountNumber") REFERENCES "Account"("number") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_key_fkey" FOREIGN KEY ("key") REFERENCES "TextKey"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE CASCADE ON UPDATE CASCADE;
