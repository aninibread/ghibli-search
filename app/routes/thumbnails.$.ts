import type { Route } from "./+types/thumbnails.$";

export async function loader({ params, context }: Route.LoaderArgs) {
  const path = params["*"];

  if (!path) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const object = await context.cloudflare.env.THUMBNAILS_BUCKET.get(path);

    if (!object) {
      return new Response("Image not found", { status: 404 });
    }

    return new Response(object.body, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Thumbnail fetch error:", error);
    return new Response("Failed to fetch image", { status: 500 });
  }
}
