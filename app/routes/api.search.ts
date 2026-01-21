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
    const searchResult = await context.cloudflare.env.AI.autorag(
      "studio-ghibli-google"
    ).search({
      query,
      max_num_results: 30,
      ranking_options: {
        score_threshold: 0.25,
      },
    });

    const results = parseSearchResults(searchResult.data);

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
