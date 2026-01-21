import type { Route } from "./+types/api.image";
import { parseFilename } from "../lib/parse-filename";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const filename = url.searchParams.get("filename");

  if (!filename) {
    return Response.json(
      { error: "Query parameter 'filename' is required" },
      { status: 400 }
    );
  }

  try {
    // Parse the filename to get image details
    const image = parseFilename(filename, 1);
    return Response.json(image);
  } catch (error) {
    console.error("Image fetch error:", error);
    return Response.json(
      { error: "Failed to fetch image" },
      { status: 500 }
    );
  }
}
