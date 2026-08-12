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
  /** Query actually used for retrieval (may be rewritten by AI Search) */
  searchQuery?: string;
}

/** Normalized search hit used by parseSearchResults */
export interface AISearchResult {
  filename: string;
  score: number;
  [key: string]: unknown;
}

/**
 * Chunk shape returned by the AI Search Workers binding
 * (env.GHIBLI_SEARCH.search → { chunks: [...] }).
 * Legacy AutoRAG used data[].filename; new API uses chunks[].item.key.
 */
export interface AISearchChunk {
  id?: string;
  score: number;
  text?: string;
  item?: {
    key?: string;
    timestamp?: number | string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
