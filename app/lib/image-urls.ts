/**
 * Image URL helpers
 * 
 * Thumbnails: Pre-generated 480px WebP served from /thumbnails/ (fast!)
 * Full-size: Original PNGs served from /images/
 */

/**
 * Get thumbnail URL for grid display (pre-generated 480px WebP)
 */
export function getThumbnailUrl(imagePath: string): string {
  // Thumbnails are .webp, originals are .png
  const webpPath = imagePath.replace(/\.png$/i, '.webp');
  return `/thumbnails/${encodeURIComponent(webpPath)}`;
}

/**
 * Get full-size URL for lightbox display (original PNG)
 */
export function getFullImageUrl(imagePath: string): string {
  return `/images/${encodeURIComponent(imagePath)}`;
}

/**
 * Get the original image URL (same as full-size, for fallback)
 */
export function getOriginalImageUrl(imagePath: string): string {
  return `/images/${encodeURIComponent(imagePath)}`;
}
