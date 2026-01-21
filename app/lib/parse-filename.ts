import type { GhibliImage, AISearchResult } from "./types";
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
 * Parse multiple AI Search results into GhibliImage objects
 */
export function parseSearchResults(results: AISearchResult[]): GhibliImage[] {
  return results.map((result) => parseFilename(result.filename, result.score));
}
