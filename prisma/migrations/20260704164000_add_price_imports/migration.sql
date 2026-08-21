-- CreateEnum
CREATE TYPE "PriceImportStatus" AS ENUM ('ANALYZED', 'APPLIED', 'REVERTED', 'PARTIALLY_REVERTED', 'FAILED');

-- AlterTable
ALTER TABLE "products" ADD COLUMN "external_provider_code" TEXT;

-- CreateTable
CREATE TABLE "price_import_batches" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "uploaded_by" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_at" TIMESTAMP(3),
    "status" "PriceImportStatus" NOT NULL DEFAULT 'ANALYZED',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "applied_unit_prices" INTEGER NOT NULL DEFAULT 0,
    "applied_combo_prices" INTEGER NOT NULL DEFAULT 0,
    "warning_rows" INTEGER NOT NULL DEFAULT 0,
    "error_rows" INTEGER NOT NULL DEFAULT 0,
    "preview_data" JSONB,
    "reverted_at" TIMESTAMP(3),
    "reverted_by" TEXT,
    "revert_summary" JSONB,

    CONSTRAINT "price_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_price_change_logs" (
    "id" TEXT NOT NULL,
    "import_batch_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "old_price" DECIMAL(10,2) NOT NULL,
    "new_price" DECIMAL(10,2) NOT NULL,
    "external_provider_code" TEXT,
    "price_role" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,

    CONSTRAINT "product_price_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_external_provider_code_idx" ON "products"("external_provider_code");

-- CreateIndex
CREATE INDEX "price_import_batches_uploaded_by_idx" ON "price_import_batches"("uploaded_by");

-- CreateIndex
CREATE INDEX "price_import_batches_status_idx" ON "price_import_batches"("status");

-- CreateIndex
CREATE INDEX "product_price_change_logs_import_batch_id_idx" ON "product_price_change_logs"("import_batch_id");

-- CreateIndex
CREATE INDEX "product_price_change_logs_product_id_idx" ON "product_price_change_logs"("product_id");

-- CreateIndex
CREATE INDEX "product_price_change_logs_changed_by_idx" ON "product_price_change_logs"("changed_by");

-- AddForeignKey
ALTER TABLE "price_import_batches" ADD CONSTRAINT "price_import_batches_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_import_batches" ADD CONSTRAINT "price_import_batches_reverted_by_fkey" FOREIGN KEY ("reverted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_change_logs" ADD CONSTRAINT "product_price_change_logs_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "price_import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_change_logs" ADD CONSTRAINT "product_price_change_logs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_change_logs" ADD CONSTRAINT "product_price_change_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
