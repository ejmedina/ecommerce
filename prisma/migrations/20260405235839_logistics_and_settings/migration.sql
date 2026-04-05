-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "route_sheets" ADD COLUMN     "endDepotId" TEXT,
ADD COLUMN     "startDepotId" TEXT,
ADD COLUMN     "vehicleId" TEXT;

-- AlterTable
ALTER TABLE "store_settings" ADD COLUMN     "minShippingOrderAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "licensePlate" TEXT,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depots" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" JSONB NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "depots_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "route_sheets" ADD CONSTRAINT "route_sheets_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_sheets" ADD CONSTRAINT "route_sheets_startDepotId_fkey" FOREIGN KEY ("startDepotId") REFERENCES "depots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_sheets" ADD CONSTRAINT "route_sheets_endDepotId_fkey" FOREIGN KEY ("endDepotId") REFERENCES "depots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
