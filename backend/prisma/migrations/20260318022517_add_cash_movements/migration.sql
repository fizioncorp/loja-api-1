-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'GERENTE', 'CAIXA');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'CAIXA';
