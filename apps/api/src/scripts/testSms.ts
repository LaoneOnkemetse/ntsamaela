import dotenv from "dotenv";
dotenv.config();

import { sendOtp } from "../services/smsService";

async function main() {
  const phone =
    process.env.TEST_SMS_NUMBER ||
    process.env.SANDBOX_SMS_NUMBER ||
    "+26776118695"; // fallback to your verified number

  if (!phone) {
    console.error("❌ No test phone number configured.");
    console.error(
      "Set TEST_SMS_NUMBER or SANDBOX_SMS_NUMBER in apps/api/.env (E.164 format, e.g. +26776118695)."
    );
    process.exit(1);
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  console.log(`📤 Sending test OTP ${code} to ${phone}...`);

  try {
    const result = await sendOtp(phone, code, "registration");
    if (result.success) {
      console.log("✅ SMS sent successfully:", result.messageId || result.message);
    } else {
      console.error("❌ Failed to send SMS:", result.error);
      process.exit(1);
    }
  } catch (error: any) {
    console.error("❌ Error while sending SMS:", error.message || error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});


