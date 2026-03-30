-- Add car details fields to Driver profile
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "carDescription" TEXT;
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "carPhotoUrl" TEXT;

