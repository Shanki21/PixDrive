// src/types/gallery.ts
export type Gallery = {
  id: string;
  name: string;
  slug?: string;
  shootDate?: string | null;
  storageLifetime?: number | null; // months
  allowOriginals?: boolean;
  watermarkEnabled?: boolean;
  galleryType?: "client" | "sales";
  createdAt?: string;
  filesCount?: number;
  thumbnail?: string | null;
};