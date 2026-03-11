type OtpEntry = {
  code: string;
  expiresAt: number;
};

declare global {
  var otpStore: Map<string, OtpEntry> | undefined;
}

const store = globalThis.otpStore ?? new Map<string, OtpEntry>();

if (!globalThis.otpStore) {
  globalThis.otpStore = store;
}

export function createOtp(email: string) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 5 * 60 * 1000;
  store.set(email.toLowerCase(), { code, expiresAt });
  return code;
}

export function verifyOtp(email: string, code: string) {
  const entry = store.get(email.toLowerCase());
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    store.delete(email.toLowerCase());
    return false;
  }
  const ok = entry.code === code;
  if (ok) {
    store.delete(email.toLowerCase());
  }
  return ok;
}

