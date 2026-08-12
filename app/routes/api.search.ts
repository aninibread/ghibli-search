import type { Route } from "./+types/api.search";
import { parseSearchResults } from "../lib/parse-filename";

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
    // New AI Search Workers binding (replaces env.AI.autorag(...).search)
    // https://developers.cloudflare.com/ai-search/api/migration/workers-binding/
    const searchResult = await context.cloudflare.env.GHIBLI_SEARCH.search({
      messages: [{ role: "user", content: query }],
      ai_search_options: {
        retrieval: {
          max_num_results: 30,
          // Legacy ranking_options.score_threshold → match_threshold
          match_threshold: 0.25,
        },
      },
    });

    // Response shape changed: data[] → chunks[] (filename is now chunks[].item.key)
    const results = parseSearchResults(searchResult.chunks ?? []);

    return Response.json({
      results,
      query,
    });
  } catch (error) {
    console.error("Search error:", error);
    return Response.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
