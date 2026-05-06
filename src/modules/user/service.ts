import { findOrCreateUserByEmail } from "./repository";
import { verifyOtp } from "@/lib/otp-store";

export async function verifyOtpAndEnsureUser(email: string, code: string) {
  const ok = await verifyOtp(email, code);
  if (!ok) return { ok: false } as const;

  const user = await findOrCreateUserByEmail(email);
  return { ok: true, user } as const;
}
