/*
  Warnings:

  - You are about to drop the column `descition` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "descition",
ADD COLUMN     "description" TEXT;
