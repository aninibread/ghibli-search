import type { Route } from "./+types/api.search";
import { parseSearchResults } from "../lib/parse-filename";

/**
 * Custom rewrite prompt for AI Search's built-in query rewriting.
 * Tuned for short, atmospheric Ghibli scene queries (same intent as
 * the image-search rewrite path, but applied server-side for text search).
 */
const GHIBLI_REWRITE_PROMPT = `You rewrite search queries for a Studio Ghibli movie stills search engine.
Convert the user query into a short, complete, atmospheric phrase (4-8 words) that captures mood, subject, and setting.
Never mention image/picture/photo. No markdown or quotes. Output only the rewritten query.`;

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");

  if (!query) {
    return Response.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  try {
    // AI Search Workers binding (replaces legacy env.AI.autorag(...).search)
    // https://developers.cloudflare.com/ai-search/api/search/workers-binding/
    const searchResult = await context.cloudflare.env.GHIBLI_SEARCH.search({
      query,
      ai_search_options: {
        retrieval: {
          // Hybrid (vector + keyword) is the main new-quality win for scene search
          retrieval_type: "hybrid",
          fusion_method: "rrf",
          // Keyword matching: any term can match (better for short poetic queries)
          keyword_match_mode: "or",
          max_num_results: 30,
          // Legacy ranking_options.score_threshold → match_threshold
          match_threshold: 0.25,
        },
        // Built-in rewrite improves recall for casual / multilingual queries
        query_rewrite: {
          enabled: true,
          rewrite_prompt: GHIBLI_REWRITE_PROMPT,
        },
        // Rerank retrieved candidates for better top-of-grid relevance
        reranking: {
          enabled: true,
          model: "@cf/baai/bge-reranker-base",
          match_threshold: 0.25,
        },
      },
    });

    // Response shape: chunks[] with item.key (was data[].filename on AutoRAG)
    const results = parseSearchResults(searchResult.chunks ?? []);

    return Response.json({
      results,
      query,
      // Expose the (possibly rewritten) query used for retrieval
      searchQuery: searchResult.search_query ?? query,
    });
  } catch (error) {
    console.error("Search error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to perform search";
    return Response.json({ error: message }, { status: 500 });
  }
}
