import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_UPLOAD_BYTES,
  imageStoragePath,
  imageUploadDetails,
} from "./image-upload";

describe("image upload metadata", () => {
  it.each([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
    ["image/heic", "heic"],
    ["image/heif", "heif"],
  ])("maps %s to .%s", (type, extension) => {
    expect(imageUploadDetails({ type, size: 1024 })).toEqual({
      contentType: type,
      extension,
    });
  });

  it("normalizes MIME type casing and whitespace", () => {
    expect(imageUploadDetails({ type: " IMAGE/PNG ", size: 1024 })).toEqual({
      contentType: "image/png",
      extension: "png",
    });
  });

  it("rejects unsupported, empty, and oversized files", () => {
    expect(() => imageUploadDetails({ type: "application/pdf", size: 1024 })).toThrow(
      "Unsupported image type",
    );
    expect(() => imageUploadDetails({ type: "image/png", size: 0 })).toThrow(
      "selected image is empty",
    );
    expect(() =>
      imageUploadDetails({ type: "image/png", size: MAX_IMAGE_UPLOAD_BYTES + 1 }),
    ).toThrow("larger than 15 MB");
  });
});

describe("image Storage paths", () => {
  it("uses the user, local year/month, generated name, and real extension", () => {
    const date = new Date(2026, 8, 2, 12, 0, 0);
    expect(imageStoragePath("00000000-0000-4000-8000-000000000000", "png", date, "receipt"))
      .toBe("00000000-0000-4000-8000-000000000000/2026/09/receipt.png");
  });

  it("rejects unsafe user paths and unknown extensions", () => {
    expect(() => imageStoragePath("user/other", "png")).toThrow("Invalid user ID");
    expect(() => imageStoragePath("user", "exe")).toThrow("Invalid image extension");
  });
});
