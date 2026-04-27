const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const SINGLE_LINE_WHITESPACE_REGEX = /\s+/g;
const CLIENT_KEY_REGEX = /^[A-Za-z0-9._:-]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function stripControlChars(value: string) {
  return value.replace(CONTROL_CHARS_REGEX, "");
}

export function normalizeSingleLine(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return stripControlChars(value).replace(SINGLE_LINE_WHITESPACE_REGEX, " ").trim().slice(0, maxLength);
}

export function normalizeOptionalSingleLine(value: unknown, maxLength: number) {
  const normalized = normalizeSingleLine(value, maxLength);
  return normalized || null;
}

export function normalizeMultiline(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return stripControlChars(value).replace(/\r\n?/g, "\n").trim().slice(0, maxLength);
}

export function normalizeEmail(value: unknown, maxLength = 254) {
  const normalized = normalizeSingleLine(value, maxLength).toLowerCase();
  return EMAIL_REGEX.test(normalized) ? normalized : "";
}

export function normalizeOptionalEmail(value: unknown, maxLength = 254) {
  const normalized = normalizeEmail(value, maxLength);
  return normalized || null;
}

export function normalizeClientKey(value: unknown, maxLength = 120) {
  const normalized = normalizeSingleLine(value, maxLength);
  return normalized && CLIENT_KEY_REGEX.test(normalized) ? normalized : "";
}
