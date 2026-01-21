import type { Route } from "./+types/images.$";

export async function loader({ params, context }: Route.LoaderArgs) {
  // The "*" param captures everything after /images/
  const imagePath = params["*"];

  if (!imagePath) {
    return new Response("Image path is required", { status: 400 });
  }

  try {
    // Decode the URL-encoded path
    const key = decodeURIComponent(imagePath);

    const object = await context.cloudflare.env.GHIBLI_BUCKET.get(key);

    if (!object) {
      return new Response("Image not found", { status: 404 });
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      object.httpMetadata?.contentType || "image/png"
    );
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new Response(object.body, { headers });
  } catch (error) {
    console.error("Image serving error:", error);
    return new Response("Failed to load image", { status: 500 });
  }
}
