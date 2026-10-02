import path from "path";

/**
 * Upload storage abstraction.
 *
 * Current: local disk `Backend/uploads/` served via `/uploads` static.
 * Limitation: Render free filesystem is ephemeral — files disappear on redeploy/restart.
 * Future: swap `resolveStorageDir()` / URL builder for S3/Cloudinary without touching controllers.
 * No secrets here — external providers must read from env when added.
 */
export function resolveStorageDir(): string {
  return path.join(process.cwd(), "uploads");
}

export function publicUrlFor(filename: string): string {
  return `/uploads/${filename}`;
}
