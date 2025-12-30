-- AlterTable: Add phone verification fields to User
ALTER TABLE "User" ADD COLUMN "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "phoneVerificationOtp" TEXT;
ALTER TABLE "User" ADD COLUMN "phoneVerificationExpires" TIMESTAMP(3);

-- AlterTable: Add account recovery fields to User
ALTER TABLE "User" ADD COLUMN "accountRecoveryToken" TEXT;
ALTER TABLE "User" ADD COLUMN "accountRecoveryExpires" TIMESTAMP(3);

-- AlterTable: Make phone unique
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- AlterTable: Add delivery PIN fields to Package
ALTER TABLE "Package" ADD COLUMN "deliveryPin" TEXT;
ALTER TABLE "Package" ADD COLUMN "deliveryPinExpires" TIMESTAMP(3);
ALTER TABLE "Package" ADD COLUMN "deliveryPinSent" BOOLEAN NOT NULL DEFAULT false;

