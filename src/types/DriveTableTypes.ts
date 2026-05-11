export type MinimalGallery = {
  id: string;
  userId?: string | null;
  name: string;
  slug?: string | null;
  coverUrl?: string | null;
  firstPhotoUrl?: string | null;
  createdAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  eventType?: string | null;
  eventLocation?: string | null;
  description?: string | null;
  filesCount?: number;
  totalSize?: string | null;
  expiresAt?: string | null;
  customDomain?: string | null;
  customDomainVerified?: boolean;

  visitors?: number;
  downloads?: number;
  published?: boolean;
  photoSellingEnabled?: boolean;
  allowSingleDownload?: boolean;
  allowBulkDownload?: boolean;
  oneQrEnabled?: boolean;

  type?: "client" | "favorites";
  favoritesEnabled?: boolean;
  favoritesLimitSelected?: boolean;
  favoritesName?: string;
  favoritesListsCount?: number;
  selectionCompletedCount?: number;
  favoritesMaxSelected?: number | null;
  coverPositionX?: number;
  coverPositionY?: number;
  storageTimeLabel?: string;
  folders?: Array<{
    id: string;
    name: string;
    description: string;
    hidden: boolean;
    createdAt: string;
  }>;
  folderPhotosMap?: Record<string, string[]>;
  folderOrder?: string[];
  pinned?: boolean;
  deletedAt?: string | null;
};
