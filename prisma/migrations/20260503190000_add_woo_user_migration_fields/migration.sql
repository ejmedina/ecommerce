-- AlterTable
ALTER TABLE "users"
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "importedFromWooCommerce" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "requiresPasswordSetup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "legacyWooUserId" INTEGER,
ADD COLUMN "legacyWooCustomerId" INTEGER,
ADD COLUMN "legacyWooLastActiveAt" TIMESTAMP(3),
ADD COLUMN "legacyWooLastActiveField" TEXT,
ADD COLUMN "importedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "addresses"
ADD COLUMN "source" TEXT,
ADD COLUMN "importedAt" TIMESTAMP(3),
ADD COLUMN "legacySourceKey" TEXT;
