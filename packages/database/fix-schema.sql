-- Ensure missing Driver columns exist
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "carDescription" TEXT;
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "carPhotoUrl" TEXT;

-- Ensure CommissionReservation table exists
CREATE TABLE IF NOT EXISTS "CommissionReservation" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 30.0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommissionReservation_pkey" PRIMARY KEY ("id")
);

-- Add FK if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'CommissionReservation_driverId_fkey'
    ) THEN
        ALTER TABLE "CommissionReservation"
            ADD CONSTRAINT "CommissionReservation_driverId_fkey"
            FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
