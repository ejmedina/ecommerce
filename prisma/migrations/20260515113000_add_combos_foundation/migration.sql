CREATE TYPE "OrderItemType" AS ENUM ('PRODUCT', 'COMBO');

ALTER TABLE "products"
ADD COLUMN "isCombo" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "cart_items"
ADD COLUMN "comboConfiguration" JSONB,
ADD COLUMN "selectionSignature" TEXT;

ALTER TABLE "order_items"
ADD COLUMN "itemType" "OrderItemType" NOT NULL DEFAULT 'PRODUCT';

CREATE TABLE "combo_components" (
  "id" TEXT NOT NULL,
  "comboProductId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "combo_components_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_item_components" (
  "id" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "comboComponentId" TEXT,
  "name" TEXT NOT NULL,
  "sku" TEXT,
  "quantityPerCombo" INTEGER NOT NULL,
  "comboQuantity" INTEGER NOT NULL,
  "quantityOrdered" INTEGER NOT NULL,
  "quantityFulfilled" INTEGER DEFAULT 0,
  "quantityMissing" INTEGER DEFAULT 0,
  "missingReason" TEXT,
  "fulfilledAt" TIMESTAMP(3),
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_item_components_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "combo_components_comboProductId_position_idx" ON "combo_components"("comboProductId", "position");
CREATE INDEX "combo_components_productId_idx" ON "combo_components"("productId");
CREATE INDEX "cart_items_cartId_productId_variantId_idx" ON "cart_items"("cartId", "productId", "variantId");
CREATE INDEX "order_item_components_orderItemId_position_idx" ON "order_item_components"("orderItemId", "position");
CREATE INDEX "order_item_components_productId_idx" ON "order_item_components"("productId");
CREATE INDEX "order_item_components_variantId_idx" ON "order_item_components"("variantId");

ALTER TABLE "combo_components"
ADD CONSTRAINT "combo_components_comboProductId_fkey"
FOREIGN KEY ("comboProductId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "combo_components"
ADD CONSTRAINT "combo_components_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_item_components"
ADD CONSTRAINT "order_item_components_orderItemId_fkey"
FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_item_components"
ADD CONSTRAINT "order_item_components_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_item_components"
ADD CONSTRAINT "order_item_components_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order_item_components"
ADD CONSTRAINT "order_item_components_comboComponentId_fkey"
FOREIGN KEY ("comboComponentId") REFERENCES "combo_components"("id") ON DELETE SET NULL ON UPDATE CASCADE;
