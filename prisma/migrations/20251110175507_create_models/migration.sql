/*
  Warnings:

  - You are about to drop the column `description` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "description",
ADD COLUMN     "descition" TEXT;
