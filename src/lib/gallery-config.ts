import { normalizePublicOrigin } from "./url-security";

type JsonRecord = Record<string, unknown>;
const MAX_DATE_LENGTH = 40;
const MAX_EVENT_FIELD_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_PIN_LENGTH = 64;
const MAX_STORAGE_LABEL_LENGTH = 80;
const MAX_FAVORITES_NAME_LENGTH = 120;
const MAX_FOLDER_ID_LENGTH = 100;
const MAX_FOLDER_NAME_LENGTH = 100;
const MAX_FOLDER_DESCRIPTION_LENGTH = 280;
const MAX_FOLDER_COUNT = 48;
const MAX_FOLDER_PHOTO_IDS = 500;
const MAX_FOLDER_ORDER_IDS = 128;

export type GalleryEventSettings = {
  startDate?: string | null;
  endDate?: string | null;
  eventType?: string | null;
  eventLocation?: string | null;
  description?: string | null;
  published?: boolean;
  photoSellingEnabled?: boolean;
  reelitAiEnabled?: boolean;
  brandingEnabled?: boolean;
  expiryDate?: string | null;
  fullAccessPin?: string | null;
  guestPin?: string | null;
  fullAccessPinHash?: string | null;
  guestPinHash?: string | null;
  allowSingleDownload?: boolean;
  allowBulkDownload?: boolean;
  whatsappEnabled?: boolean;
  emailEnabled?: boolean;
  oneQrEnabled?: boolean;
  oneQrRequirePin?: boolean;
  oneQrAccessLevel?: "full" | "guest";
  galleryAppEnabled?: boolean;
  livenessDetectionEnabled?: boolean;
};

export type GalleryMetaConfig = {
  expiresAt?: string | null;
  storageTimeLabel?: string | null;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  favoritesEnabled?: boolean;
  favoritesLimitSelected?: boolean;
  favoritesName?: string | null;
  favoritesListsCount?: number;
  selectionCompletedCount?: number;
  favoritesMaxSelected?: number | null;
  folders?: GalleryFolderMeta[];
  folderPhotosMap?: Record<string, string[]>;
  folderOrder?: string[];
};

export type GalleryFolderMeta = {
  id: string;
  name: string;
  description: string;
  hidden: boolean;
  createdAt: string;
};

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

function asNullableString(value: unknown, maxLength = MAX_EVENT_FIELD_LENGTH) {
  if (value == null) return null;
  const next = String(value).trim().slice(0, maxLength);
  return next || null;
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return value;
}

function asStringArray(value: unknown, maxItems = MAX_FOLDER_ORDER_IDS, itemMaxLength = MAX_FOLDER_ID_LENGTH) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, maxItems)
    .map((entry) => String(entry ?? "").trim())
    .map((entry) => entry.slice(0, itemMaxLength))
    .filter((entry) => entry.length > 0);
}

function asFolderMetaArray(value: unknown): GalleryFolderMeta[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_FOLDER_COUNT)
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const record = entry as JsonRecord;
      const id = asNullableString(record.id, MAX_FOLDER_ID_LENGTH) ?? "";
      const name = asNullableString(record.name, MAX_FOLDER_NAME_LENGTH) ?? "";
      if (!id || !name) return null;
      return {
        id,
        name,
        description: asNullableString(record.description, MAX_FOLDER_DESCRIPTION_LENGTH) ?? "",
        hidden: asBoolean(record.hidden, false),
        createdAt: asNullableString(record.createdAt, MAX_DATE_LENGTH) ?? new Date().toISOString(),
      };
    })
    .filter((entry): entry is GalleryFolderMeta => Boolean(entry));
}

function asFolderPhotosMap(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as JsonRecord;
  const normalized: Record<string, string[]> = {};
  for (const [key, raw] of Object.entries(record).slice(0, MAX_FOLDER_COUNT)) {
    const cleanKey = key.trim().slice(0, MAX_FOLDER_ID_LENGTH);
    if (!cleanKey) continue;
    normalized[cleanKey] = asStringArray(raw, MAX_FOLDER_PHOTO_IDS, MAX_FOLDER_ID_LENGTH);
  }
  return normalized;
}

export function normalizeEventSettings(value: unknown): GalleryEventSettings | null {
  const record = asRecord(value);
  if (!record) return null;
  const access = record.oneQrAccessLevel;
  const oneQrAccessLevel = access === "full" || access === "guest" ? access : "guest";

  return {
    startDate: asNullableString(record.startDate, MAX_DATE_LENGTH),
    endDate: asNullableString(record.endDate, MAX_DATE_LENGTH),
    eventType: asNullableString(record.eventType, MAX_EVENT_FIELD_LENGTH),
    eventLocation: asNullableString(record.eventLocation, MAX_EVENT_FIELD_LENGTH),
    description: asNullableString(record.description, MAX_DESCRIPTION_LENGTH),
    published: asBoolean(record.published, true),
    photoSellingEnabled: asBoolean(record.photoSellingEnabled, false),
    reelitAiEnabled: asBoolean(record.reelitAiEnabled, false),
    brandingEnabled: asBoolean(record.brandingEnabled, false),
    expiryDate: asNullableString(record.expiryDate, MAX_DATE_LENGTH),
    fullAccessPin: asNullableString(record.fullAccessPin, MAX_PIN_LENGTH),
    guestPin: asNullableString(record.guestPin, MAX_PIN_LENGTH),
    fullAccessPinHash: asNullableString(record.fullAccessPinHash, 200),
    guestPinHash: asNullableString(record.guestPinHash, 200),
    allowSingleDownload: asBoolean(record.allowSingleDownload, true),
    allowBulkDownload: asBoolean(record.allowBulkDownload, false),
    whatsappEnabled: asBoolean(record.whatsappEnabled, false),
    emailEnabled: asBoolean(record.emailEnabled, false),
    oneQrEnabled: asBoolean(record.oneQrEnabled, true),
    oneQrRequirePin: asBoolean(record.oneQrRequirePin, false),
    oneQrAccessLevel,
    galleryAppEnabled: asBoolean(record.galleryAppEnabled, true),
    livenessDetectionEnabled: asBoolean(record.livenessDetectionEnabled, false),
  };
}

export function normalizeGalleryMeta(value: unknown): GalleryMetaConfig | null {
  const record = asRecord(value);
  if (!record) return null;
  return {
    expiresAt: asNullableString(record.expiresAt, MAX_DATE_LENGTH),
    storageTimeLabel: asNullableString(record.storageTimeLabel, MAX_STORAGE_LABEL_LENGTH),
    customDomain:
      normalizePublicOrigin(String(record.customDomain ?? ""), {
        allowHttpLocalhost: process.env.NODE_ENV !== "production",
      }) ?? null,
    customDomainVerified: typeof record.customDomainVerified === "boolean" ? record.customDomainVerified : false,
    favoritesEnabled: asBoolean(record.favoritesEnabled, true),
    favoritesLimitSelected: asBoolean(record.favoritesLimitSelected, false),
    favoritesName: asNullableString(record.favoritesName, MAX_FAVORITES_NAME_LENGTH),
    favoritesListsCount: Math.max(0, asNumber(record.favoritesListsCount, 0)),
    selectionCompletedCount: Math.max(0, asNumber(record.selectionCompletedCount, 0)),
    favoritesMaxSelected:
      record.favoritesMaxSelected == null
        ? null
        : Math.max(0, asNumber(record.favoritesMaxSelected, 0)),
    folders: asFolderMetaArray(record.folders),
    folderPhotosMap: asFolderPhotosMap(record.folderPhotosMap),
    folderOrder: asStringArray(record.folderOrder, MAX_FOLDER_ORDER_IDS, MAX_FOLDER_ID_LENGTH),
  };
}

export function mergeEventSettings(
  existing: unknown,
  incoming: unknown
): GalleryEventSettings | null {
  const base = normalizeEventSettings(existing) ?? {};
  const next = normalizeEventSettings(incoming);
  if (!next) return null;
  return { ...base, ...next };
}

export function maskEventSettingsPins(settings: GalleryEventSettings | null): GalleryEventSettings | null {
  if (!settings) return null;
  return {
    ...settings,
    fullAccessPin: null,
    guestPin: null,
    fullAccessPinHash: null,
    guestPinHash: null,
  };
}

export function mergeGalleryMeta(existing: unknown, incoming: unknown): GalleryMetaConfig | null {
  const base = normalizeGalleryMeta(existing) ?? {};
  const next = normalizeGalleryMeta(incoming);
  if (!next) return null;
  // Merge customDomain carefully: if domain changes, clear verification flag.
  const existingDomain = base.customDomain ?? null;
  const incomingDomain = next.customDomain ?? null;
  const customDomain = incomingDomain ?? existingDomain ?? null;
  let customDomainVerified = base.customDomainVerified ?? false;
  if (incomingDomain != null && incomingDomain !== existingDomain) {
    // new domain was provided: require re-verification
    customDomainVerified = false;
  }

  return {
    ...base,
    ...next,
    customDomain,
    customDomainVerified,
  };
}
