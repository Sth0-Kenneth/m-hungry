export const MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024;

const IMAGE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
} as const;

export type SupportedImageMimeType = keyof typeof IMAGE_EXTENSIONS;

export function imageUploadDetails(file: Pick<File, "size" | "type">) {
  const contentType = file.type.trim().toLowerCase() as SupportedImageMimeType;
  const extension = IMAGE_EXTENSIONS[contentType];

  if (!extension) {
    throw new Error("Unsupported image type. Use JPEG, PNG, WebP, HEIC, or HEIF.");
  }
  if (file.size <= 0) {
    throw new Error("The selected image is empty.");
  }
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error("The selected image is larger than 15 MB.");
  }

  return { contentType, extension };
}

export function imageStoragePath(
  userId: string,
  extension: string,
  now = new Date(),
  generatedName = crypto.randomUUID(),
) {
  if (!userId || userId.includes("/")) throw new Error("Invalid user ID");
  if (!Object.values(IMAGE_EXTENSIONS).includes(extension as never)) {
    throw new Error("Invalid image extension");
  }

  return `${userId}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${generatedName}.${extension}`;
}
