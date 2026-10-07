"use client";
import { createClient } from "@/lib/supabase/client";
import { imageStoragePath, imageUploadDetails } from "@/lib/image-upload";

export async function uploadFoodImage(file: File) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session expired. Please log in again.");

  const upload = imageUploadDetails(file);
  const path = imageStoragePath(user.id, upload.extension);
  const { error } = await supabase.storage
    .from("food-images")
    .upload(path, file, { contentType: upload.contentType, upsert: false });
  if (error) throw new Error("Image upload failed. Check the food-images bucket policies.");

  return { path, user, supabase };
}
