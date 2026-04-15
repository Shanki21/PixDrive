import { type GalleryEventSettings } from "@/lib/gallery-config";
import { hashGalleryPin } from "@/lib/gallery-pin-access";

function normalizePinInput(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const next = String(value).trim();
  return next.length > 0 ? next : null;
}

export async function secureEventSettingsForStorage(
  settings: GalleryEventSettings | null
): Promise<GalleryEventSettings | null> {
  if (!settings) return null;

  const fullPin = normalizePinInput(settings.fullAccessPin);
  const guestPin = normalizePinInput(settings.guestPin);
  const next: GalleryEventSettings = { ...settings };

  if (fullPin !== undefined) {
    next.fullAccessPinHash = fullPin ? await hashGalleryPin(fullPin) : null;
  }
  if (guestPin !== undefined) {
    next.guestPinHash = guestPin ? await hashGalleryPin(guestPin) : null;
  }

  next.fullAccessPin = null;
  next.guestPin = null;
  return next;
}
