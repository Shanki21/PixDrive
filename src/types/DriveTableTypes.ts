export type MinimalGallery = {
  id: string;
  name: string;
  coverUrl?: string | null;
  firstPhotoUrl?: string | null;
  createdAt?: string | null;
  filesCount?: number;
  totalSize?: string | null;
  expiresAt?: string | null;

  visitors?: number;
  downloads?: number;

  type?: "client" | "favorites";
  favoritesEnabled?: boolean;
  favoritesLimitSelected?: boolean;
  favoritesName?: string;
  favoritesListsCount?: number;
  selectionCompletedCount?: number;
  favoritesMaxSelected?: number | null;
  storageTimeLabel?: string;
  pinned?: boolean;
  deletedAt?: string | null;
};
