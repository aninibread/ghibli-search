export interface GhibliImage {
  filename: string;
  year: number;
  movieName: string;
  description: string;
  movieSlug: string;
  imageUrl: string;      // Full-size optimized (1920px max, WebP)
  thumbnailUrl: string;  // Thumbnail for grid (480px, WebP)
  score: number;
}

export interface SearchResponse {
  results: GhibliImage[];
  query: string;
}

export interface AISearchResult {
  filename: string;
  score: number;
  [key: string]: unknown;
}
