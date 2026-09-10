CREATE TABLE "store_analytics_secrets" (
  "id" TEXT NOT NULL,
  "storeSettingsId" TEXT NOT NULL,
  "metaCapiAccessTokenCiphertext" TEXT,
  "metaCapiAccessTokenIv" TEXT,
  "metaCapiAccessTokenAuthTag" TEXT,
  "metaCapiAccessTokenUpdatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "store_analytics_secrets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_analytics_secrets_storeSettingsId_key" ON "store_analytics_secrets"("storeSettingsId");

ALTER TABLE "store_analytics_secrets"
  ADD CONSTRAINT "store_analytics_secrets_storeSettingsId_fkey"
  FOREIGN KEY ("storeSettingsId") REFERENCES "store_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
