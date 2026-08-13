import type { Route } from "./+types/api.search";
import { parseSearchResults } from "../lib/parse-filename";

const SEARCH_ATTEMPTS = 3;

type SearchResult = Awaited<
  ReturnType<Env["GHIBLI_SEARCH"]["search"]>
>;

const inflightSearches = new Map<string, Promise<SearchResult>>();

function isRetryableSearchError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|aborted|DownstreamConfigApiError/i.test(message);
}

function searchErrorMessage(error: unknown): string {
  if (isRetryableSearchError(error)) {
    return "Search timed out. Try again in a moment.";
  }
  return error instanceof Error ? error.message : "Failed to perform search";
}

function errorSummary(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function searchWithRetry(
  ghibliSearch: Env["GHIBLI_SEARCH"],
  query: string
): Promise<SearchResult> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= SEARCH_ATTEMPTS; attempt++) {
    try {
      return await ghibliSearch.search({
        query,
        ai_search_options: {
          // Instance defaults enable reranking; that is too slow through the
          // local remote-binding proxy and often hits DownstreamConfigApiError.
          retrieval: {
            retrieval_type: "hybrid",
            return_on_failure: true,
            max_num_results: 10,
          },
          query_rewrite: { enabled: false },
          reranking: { enabled: false },
          cache: { enabled: true },
        },
      });
    } catch (error) {
      lastError = error;
      console.warn(`Search attempt ${attempt}/${SEARCH_ATTEMPTS} failed: ${errorSummary(error)}`);
      if (!isRetryableSearchError(error) || attempt === SEARCH_ATTEMPTS) {
        throw error;
      }
      await scheduler.wait(500 * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to perform search");
}

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
    let pending = inflightSearches.get(query);
    if (!pending) {
      pending = searchWithRetry(
        context.cloudflare.env.GHIBLI_SEARCH,
        query
      ).finally(() => {
        inflightSearches.delete(query);
      });
      inflightSearches.set(query, pending);
    }

    const searchResult = await pending;
    const results = parseSearchResults(searchResult.chunks ?? []);

    return Response.json({
      results,
      query,
      searchQuery: searchResult.search_query ?? query,
    });
  } catch (error) {
    console.warn("Search error:", errorSummary(error));
    return Response.json({ error: searchErrorMessage(error) }, { status: 503 });
  }
}
