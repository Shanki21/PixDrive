import { normalizeEmail } from "../../lib/input-security";

export function parseEmail(input: unknown): string | null {
  const email = normalizeEmail(input);
  return email || null;
}

export function parseOtpCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const code = input.replace(/\D/g, "");
  return code.length === 6 ? code : null;
}

export type VerifyOtpPayload = {
  email: string;
  code: string;
};
