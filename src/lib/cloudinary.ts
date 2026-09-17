import { v2 as cloudinary } from "cloudinary";

function readConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }
  return { cloudName, apiKey, apiSecret };
}

let configured = false;

function ensureConfigured() {
  const config = readConfig();
  if (!config) return false;
  if (!configured) {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: true,
    });
    configured = true;
  }
  return true;
}

export function isCloudinaryConfigured() {
  return ensureConfigured();
}

export async function uploadImageDataUrl(dataUrl: string) {
  if (!ensureConfigured()) {
    throw new Error("Cloudinary is not configured.");
  }
  const uploaded = await cloudinary.uploader.upload(dataUrl, {
    folder: "pixdrive/gallery",
    resource_type: "image",
    overwrite: false,
  });
  return {
    url: uploaded.secure_url,
    publicId: uploaded.public_id,
  };
}

export function createCloudinaryUploadSignature(options: {
  folder: string;
  timestamp: number;
}) {
  if (!ensureConfigured()) {
    throw new Error("Cloudinary is not configured.");
  }

  const signature = cloudinary.utils.api_sign_request(
    {
      folder: options.folder,
      timestamp: options.timestamp,
    },
    process.env.CLOUDINARY_API_SECRET?.trim() ?? ""
  );
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? "";
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim() ?? "";

  return {
    cloudName,
    apiKey,
    signature,
  };
}

export function extractCloudinaryPublicId(url: string) {
  if (!url.includes("res.cloudinary.com")) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?([^?#]+?)(?:\.[a-z0-9]+)?(?:[?#].*)?$/i);
  if (!match) return null;
  return match[1] ?? null;
}

export async function destroyCloudinaryAssetByUrl(url: string) {
  if (!ensureConfigured()) return false;
  const publicId = extractCloudinaryPublicId(url);
  if (!publicId) return false;
  await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
  return true;
}
