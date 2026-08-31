import api from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/** Neutral placeholder — never return "" for <img src> (triggers Next.js console errors). */
export const MEDIA_PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect fill="#141414" width="800" height="450"/></svg>`,
  );

/**
 * Turn a stored media path into a browser-loadable URL.
 * - Absolute http(s) / data: / blob: URLs pass through
 * - Paths like /uploads/foo.jpg are prefixed with the API origin
 */
export function resolveMediaUrl(
  url: string | null | undefined,
  fallback: string = MEDIA_PLACEHOLDER,
): string {
  if (!url) return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  if (trimmed.startsWith("/uploads/")) {
    return `${API_BASE_URL}${trimmed}`;
  }
  if (trimmed.startsWith("/")) {
    return `${API_BASE_URL}${trimmed}`;
  }
  return trimmed;
}

/** Upload an image via the existing POST /api/upload/image endpoint. */
export async function uploadImageFile(file: File): Promise<{ url: string; filename: string } | null> {
  const formData = new FormData();
  formData.append("image", file);

  try {
    const { data } = await api.post("/upload/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (data.success && data.data?.url) {
      return {
        url: data.data.url as string,
        filename: (data.data.originalName || data.data.filename || file.name) as string,
      };
    }
  } catch (error) {
    console.error("Image upload failed:", error);
  }
  return null;
}
