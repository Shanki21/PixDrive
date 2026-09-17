import {
  createCloudinaryUploadSignature,
  destroyCloudinaryAssetByUrl,
  isCloudinaryConfigured,
  uploadImageDataUrl,
} from "@/lib/cloudinary";
import {
  createR2ObjectKey,
  createR2SignedUploadUrl,
  deleteR2ObjectByUrl,
  isR2Configured,
} from "@/lib/r2";

export type StorageProvider = "cloudinary" | "r2";

export type StoredImage = {
  url: string;
  provider: StorageProvider;
  key?: string | null;
};

export type SignedImageUpload = {
  provider: StorageProvider;
  method: "POST" | "PUT";
  uploadUrl: string;
  publicUrl?: string | null;
  key?: string | null;
  folder?: string | null;
  timestamp?: number | null;
  fields?: Record<string, string | number>;
  headers?: Record<string, string>;
};

function configuredProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER?.trim().toLowerCase();
  if (provider === "r2") return "r2";
  return "cloudinary";
}

export function getStorageProvider() {
  return configuredProvider();
}

export function isStorageConfigured() {
  const provider = configuredProvider();
  if (provider === "cloudinary") return isCloudinaryConfigured();

  return isR2Configured();
}

export async function uploadGalleryImageDataUrl(dataUrl: string): Promise<StoredImage> {
  const provider = configuredProvider();
  if (provider === "r2") {
    throw new Error("Cloudflare R2 uploads are not enabled yet. Use Cloudinary or signed direct upload.");
  }

  const uploaded = await uploadImageDataUrl(dataUrl);
  return {
    url: uploaded.url,
    provider: "cloudinary",
    key: uploaded.publicId,
  };
}

export function createSignedGalleryImageUpload({
  fileName,
  contentType,
}: {
  fileName: string;
  contentType: string;
}): SignedImageUpload {
  const provider = configuredProvider();
  if (provider === "r2") {
    const key = createR2ObjectKey(fileName, contentType);
    const signed = createR2SignedUploadUrl({ key, contentType });
    return {
      provider: "r2",
      method: "PUT",
      uploadUrl: signed.uploadUrl,
      publicUrl: signed.publicUrl,
      key: signed.key,
      headers: {
        "Content-Type": contentType,
      },
    };
  }

  const folder = process.env.CLOUDINARY_GALLERY_FOLDER?.trim() || "pixdrive/gallery";
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = createCloudinaryUploadSignature({ folder, timestamp });

  return {
    provider: "cloudinary",
    method: "POST",
    uploadUrl: `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
    folder,
    timestamp,
    fields: {
      api_key: signed.apiKey,
      folder,
      timestamp,
      signature: signed.signature,
    },
  };
}

export async function deleteStoredImageByUrl(url: string) {
  const provider = configuredProvider();
  if (provider === "r2") {
    return deleteR2ObjectByUrl(url);
  }

  return destroyCloudinaryAssetByUrl(url);
}
