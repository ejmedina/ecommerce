ALTER TABLE "orders"
  ADD COLUMN "deliveryZoneId" TEXT,
  ADD COLUMN "deliveryZoneName" TEXT,
  ADD COLUMN "scheduledDeliveryDate" DATE,
  ADD COLUMN "deliveryScheduleRuleId" TEXT,
  ADD COLUMN "deliverySlotLabel" TEXT,
  ADD COLUMN "deliveryWindowStart" TEXT,
  ADD COLUMN "deliveryWindowEnd" TEXT;

ALTER TABLE "store_settings"
  ADD COLUMN "deliverySchedulingEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deliveryDateOptionsLimit" INTEGER NOT NULL DEFAULT 2;

CREATE TABLE "delivery_schedule_rules" (
  "id" TEXT NOT NULL,
  "storeSettingsId" TEXT NOT NULL,
  "shippingZoneId" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "cutoffDaysBefore" INTEGER NOT NULL DEFAULT 0,
  "cutoffTime" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "delivery_schedule_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "delivery_schedule_rules_storeSettingsId_shippingZoneId_weekday_idx"
  ON "delivery_schedule_rules"("storeSettingsId", "shippingZoneId", "weekday");

ALTER TABLE "delivery_schedule_rules"
  ADD CONSTRAINT "delivery_schedule_rules_storeSettingsId_fkey"
  FOREIGN KEY ("storeSettingsId") REFERENCES "store_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
