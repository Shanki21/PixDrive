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
  reelitAiEnabled?: boolean;
  expiryDate?: string | null;
  fullAccessPin?: string | null;
  guestPin?: string | null;
  fullAccessPinHash?: string | null;
  guestPinHash?: string | null;
  fullAccessPinSet?: boolean;
  guestPinSet?: boolean;
  allowSingleDownload?: boolean;
  allowBulkDownload?: boolean;
  whatsappEnabled?: boolean;
  emailEnabled?: boolean;
  oneQrEnabled?: boolean;
  oneQrRequirePin?: boolean;
  oneQrAccessLevel?: "full" | "guest";
  galleryAppEnabled?: boolean;
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
  coverPositionX?: number;
  coverPositionY?: number;
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

function asPercent(value: unknown, fallback = 50) {
  return Math.min(100, Math.max(0, asNumber(value, fallback)));
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
    reelitAiEnabled: asBoolean(record.reelitAiEnabled, false),
    expiryDate: asNullableString(record.expiryDate, MAX_DATE_LENGTH),
    fullAccessPin: asNullableString(record.fullAccessPin, MAX_PIN_LENGTH),
    guestPin: asNullableString(record.guestPin, MAX_PIN_LENGTH),
    fullAccessPinHash: asNullableString(record.fullAccessPinHash, 200),
    guestPinHash: asNullableString(record.guestPinHash, 200),
    fullAccessPinSet: asBoolean(record.fullAccessPinSet, false),
    guestPinSet: asBoolean(record.guestPinSet, false),
    allowSingleDownload: asBoolean(record.allowSingleDownload, true),
    allowBulkDownload: asBoolean(record.allowBulkDownload, false),
    whatsappEnabled: asBoolean(record.whatsappEnabled, false),
    emailEnabled: asBoolean(record.emailEnabled, false),
    oneQrEnabled: asBoolean(record.oneQrEnabled, true),
    oneQrRequirePin: asBoolean(record.oneQrRequirePin, false),
    oneQrAccessLevel,
    galleryAppEnabled: asBoolean(record.galleryAppEnabled, true),
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
    coverPositionX: asPercent(record.coverPositionX, 50),
    coverPositionY: asPercent(record.coverPositionY, 50),
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
  const record = asRecord(incoming);
  if (!record) return null;

  const next: GalleryEventSettings = {};
  if ("startDate" in record) next.startDate = asNullableString(record.startDate, MAX_DATE_LENGTH);
  if ("endDate" in record) next.endDate = asNullableString(record.endDate, MAX_DATE_LENGTH);
  if ("eventType" in record) next.eventType = asNullableString(record.eventType, MAX_EVENT_FIELD_LENGTH);
  if ("eventLocation" in record) next.eventLocation = asNullableString(record.eventLocation, MAX_EVENT_FIELD_LENGTH);
  if ("description" in record) next.description = asNullableString(record.description, MAX_DESCRIPTION_LENGTH);
  if ("published" in record) next.published = asBoolean(record.published, base.published ?? true);
  if ("reelitAiEnabled" in record) next.reelitAiEnabled = asBoolean(record.reelitAiEnabled, base.reelitAiEnabled ?? false);
  if ("expiryDate" in record) next.expiryDate = asNullableString(record.expiryDate, MAX_DATE_LENGTH);
  if ("fullAccessPin" in record) next.fullAccessPin = asNullableString(record.fullAccessPin, MAX_PIN_LENGTH);
  if ("guestPin" in record) next.guestPin = asNullableString(record.guestPin, MAX_PIN_LENGTH);
  if ("fullAccessPinHash" in record) next.fullAccessPinHash = asNullableString(record.fullAccessPinHash, 200);
  if ("guestPinHash" in record) next.guestPinHash = asNullableString(record.guestPinHash, 200);
  if ("fullAccessPinSet" in record) next.fullAccessPinSet = asBoolean(record.fullAccessPinSet, base.fullAccessPinSet ?? false);
  if ("guestPinSet" in record) next.guestPinSet = asBoolean(record.guestPinSet, base.guestPinSet ?? false);
  if ("allowSingleDownload" in record) {
    next.allowSingleDownload = asBoolean(record.allowSingleDownload, base.allowSingleDownload ?? true);
  }
  if ("allowBulkDownload" in record) {
    next.allowBulkDownload = asBoolean(record.allowBulkDownload, base.allowBulkDownload ?? false);
  }
  if ("whatsappEnabled" in record) next.whatsappEnabled = asBoolean(record.whatsappEnabled, base.whatsappEnabled ?? false);
  if ("emailEnabled" in record) next.emailEnabled = asBoolean(record.emailEnabled, base.emailEnabled ?? false);
  if ("oneQrEnabled" in record) next.oneQrEnabled = asBoolean(record.oneQrEnabled, base.oneQrEnabled ?? true);
  if ("oneQrRequirePin" in record) {
    next.oneQrRequirePin = asBoolean(record.oneQrRequirePin, base.oneQrRequirePin ?? false);
  }
  if ("oneQrAccessLevel" in record) {
    const access = record.oneQrAccessLevel;
    next.oneQrAccessLevel = access === "full" || access === "guest" ? access : base.oneQrAccessLevel ?? "guest";
  }
  if ("galleryAppEnabled" in record) {
    next.galleryAppEnabled = asBoolean(record.galleryAppEnabled, base.galleryAppEnabled ?? true);
  }

  const merged = { ...base, ...next };
  if (!("fullAccessPin" in record)) delete merged.fullAccessPin;
  if (!("guestPin" in record)) delete merged.guestPin;
  return merged;
}

export function maskEventSettingsPins(settings: GalleryEventSettings | null): GalleryEventSettings | null {
  if (!settings) return null;
  return {
    ...settings,
    fullAccessPinSet: Boolean(settings.fullAccessPin || settings.fullAccessPinHash || settings.fullAccessPinSet),
    guestPinSet: Boolean(settings.guestPin || settings.guestPinHash || settings.guestPinSet),
    fullAccessPin: null,
    guestPin: null,
    fullAccessPinHash: null,
    guestPinHash: null,
  };
}

export function mergeGalleryMeta(existing: unknown, incoming: unknown): GalleryMetaConfig | null {
  const base = normalizeGalleryMeta(existing) ?? {};
  const record = asRecord(incoming);
  if (!record) return null;

  const next: GalleryMetaConfig = {};
  if ("expiresAt" in record) next.expiresAt = asNullableString(record.expiresAt, MAX_DATE_LENGTH);
  if ("storageTimeLabel" in record) {
    next.storageTimeLabel = asNullableString(record.storageTimeLabel, MAX_STORAGE_LABEL_LENGTH);
  }
  if ("customDomain" in record) {
    next.customDomain =
      normalizePublicOrigin(String(record.customDomain ?? ""), {
        allowHttpLocalhost: process.env.NODE_ENV !== "production",
      }) ?? null;
  }
  if ("customDomainVerified" in record) {
    next.customDomainVerified =
      typeof record.customDomainVerified === "boolean" ? record.customDomainVerified : base.customDomainVerified ?? false;
  }
  if ("favoritesEnabled" in record) next.favoritesEnabled = asBoolean(record.favoritesEnabled, base.favoritesEnabled ?? true);
  if ("favoritesLimitSelected" in record) {
    next.favoritesLimitSelected = asBoolean(record.favoritesLimitSelected, base.favoritesLimitSelected ?? false);
  }
  if ("favoritesName" in record) next.favoritesName = asNullableString(record.favoritesName, MAX_FAVORITES_NAME_LENGTH);
  if ("favoritesListsCount" in record) {
    next.favoritesListsCount = Math.max(0, asNumber(record.favoritesListsCount, base.favoritesListsCount ?? 0));
  }
  if ("selectionCompletedCount" in record) {
    next.selectionCompletedCount = Math.max(0, asNumber(record.selectionCompletedCount, base.selectionCompletedCount ?? 0));
  }
  if ("favoritesMaxSelected" in record) {
    next.favoritesMaxSelected =
      record.favoritesMaxSelected == null
        ? null
        : Math.max(0, asNumber(record.favoritesMaxSelected, base.favoritesMaxSelected ?? 0));
  }
  if ("coverPositionX" in record) next.coverPositionX = asPercent(record.coverPositionX, base.coverPositionX ?? 50);
  if ("coverPositionY" in record) next.coverPositionY = asPercent(record.coverPositionY, base.coverPositionY ?? 50);
  if ("folders" in record) next.folders = asFolderMetaArray(record.folders);
  if ("folderPhotosMap" in record) next.folderPhotosMap = asFolderPhotosMap(record.folderPhotosMap);
  if ("folderOrder" in record) next.folderOrder = asStringArray(record.folderOrder, MAX_FOLDER_ORDER_IDS, MAX_FOLDER_ID_LENGTH);

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
