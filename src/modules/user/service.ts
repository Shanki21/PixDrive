import { createUserByEmail, findUserByEmail } from "./repository";
import { verifyOtp } from "@/lib/otp-store";

export type AuthIntent = "login" | "signup";

export async function verifyOtpForIntent(email: string, code: string, intent: AuthIntent) {
  const ok = await verifyOtp(email, code);
  if (!ok) return { ok: false } as const;

  const existingUser = await findUserByEmail(email);
  if (intent === "login") {
    if (!existingUser) {
      return { ok: false, code: "ACCOUNT_NOT_FOUND" } as const;
    }
    return { ok: true, user: existingUser } as const;
  }

  if (existingUser) {
    return { ok: false, code: "ACCOUNT_EXISTS" } as const;
  }

  const user = await createUserByEmail(email);
  return { ok: true, user } as const;
}
