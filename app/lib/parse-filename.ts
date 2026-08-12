import type { GhibliImage, AISearchChunk } from "./types";
import { getMovieSlug } from "./movie-slugs";
import { getThumbnailUrl, getFullImageUrl } from "./image-urls";

/**
 * Parse a filename in the format: "(YEAR) Movie Name/Description.png"
 * Example: "(1986) Laputa - Castle in the Sky/Holding Tight.png"
 */
export function parseFilename(filename: string, score: number): GhibliImage {
  // Match pattern: (YEAR) Movie Name/Description.extension
  const regex = /^\((\d{4})\)\s+(.+?)\/(.+)\.\w+$/;
  const match = filename.match(regex);

  if (!match) {
    // Fallback for unexpected format
    return {
      filename,
      year: 0,
      movieName: "Unknown",
      description: filename,
      movieSlug: "unknown",
      imageUrl: getFullImageUrl(filename),
      thumbnailUrl: getThumbnailUrl(filename),
      score,
    };
  }

  const [, yearStr, movieName, description] = match;
  const year = parseInt(yearStr, 10);
  const movieSlug = getMovieSlug(movieName);

  return {
    filename,
    year,
    movieName: movieName.trim(),
    description: description.trim(),
    movieSlug,
    imageUrl: getFullImageUrl(filename),
    thumbnailUrl: getThumbnailUrl(filename),
    score,
  };
}

/**
 * Extract the R2 object key / filename from an AI Search chunk.
 * Prefer the new binding field (item.key); fall back to legacy-shaped fields
 * in case an older response shape is still returned.
 */
function chunkFilename(chunk: AISearchChunk): string | null {
  const key = chunk.item?.key;
  if (typeof key === "string" && key.length > 0) return key;

  const legacy = chunk.filename;
  if (typeof legacy === "string" && legacy.length > 0) return legacy;

  return null;
}

/**
 * Parse AI Search binding chunks into GhibliImage objects.
 * Dedupes by filename (hybrid/rerank can surface multiple chunks per still)
 * and keeps the highest-scoring hit for each image.
 */
export function parseSearchResults(chunks: AISearchChunk[]): GhibliImage[] {
  const bestByFilename = new Map<string, GhibliImage>();

  for (const chunk of chunks) {
    const filename = chunkFilename(chunk);
    if (!filename) continue;

    const image = parseFilename(filename, chunk.score ?? 0);
    const existing = bestByFilename.get(filename);
    if (!existing || image.score > existing.score) {
      bestByFilename.set(filename, image);
    }
  }

  return Array.from(bestByFilename.values()).sort((a, b) => b.score - a.score);
}
