-- AlterTable
ALTER TABLE "products" ADD COLUMN     "discountConfig" JSONB,
ADD COLUMN     "discountType" TEXT NOT NULL DEFAULT 'NONE';
