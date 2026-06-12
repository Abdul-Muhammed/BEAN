import { supabase } from './supabase';

export const REVIEW_PHOTOS_BUCKET = 'review-photos';

// Decode a base64 string into an ArrayBuffer. Supabase Storage's `upload`
// needs binary data; the image picker hands us base64, and React Native's
// Hermes engine exposes a global `atob`, so we avoid pulling in a native
// filesystem module just to read the file back.
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const decode = (globalThis as any).atob as (data: string) => string;
  const binary = decode(base64);
  const length = binary.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Upload review images to the public `review-photos` bucket and return their
 * public URLs. Each image is stored under the owner's user id so storage RLS
 * can scope writes per-user. Photos that fail to upload are skipped (logged)
 * rather than failing the whole review.
 */
export async function uploadReviewPhotos(
  userId: string,
  items: { base64: string }[]
): Promise<string[]> {
  const urls: string[] = [];

  for (let i = 0; i < items.length; i += 1) {
    const base64 = items[i]?.base64;
    if (!base64) continue;

    const path = `${userId}/${Date.now()}-${i}.jpg`;
    try {
      const { error } = await supabase.storage
        .from(REVIEW_PHOTOS_BUCKET)
        .upload(path, base64ToArrayBuffer(base64), {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        console.warn('Failed to upload review photo:', error.message);
        continue;
      }

      const { data } = supabase.storage
        .from(REVIEW_PHOTOS_BUCKET)
        .getPublicUrl(path);
      if (data?.publicUrl) {
        urls.push(data.publicUrl);
      }
    } catch (err) {
      console.warn('Unexpected error uploading review photo:', err);
    }
  }

  return urls;
}
