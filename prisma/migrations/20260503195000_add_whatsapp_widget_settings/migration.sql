-- AlterTable
ALTER TABLE "store_settings"
ADD COLUMN "whatsappWidgetEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "whatsappWidgetPhone" TEXT,
ADD COLUMN "whatsappWidgetMessage" TEXT;
