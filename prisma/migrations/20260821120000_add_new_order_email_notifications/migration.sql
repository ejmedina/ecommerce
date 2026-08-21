ALTER TABLE "store_settings"
ADD COLUMN "newOrderEmailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "newOrderNotificationEmails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
