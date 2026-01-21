import type { Route } from "./+types/api.random";
import { parseFilename } from "../lib/parse-filename";
import type { GhibliImage } from "../lib/types";

// Fallback placeholder images for local development
const placeholderImages: GhibliImage[] = [
  { filename: "A Request.png", year: 1993, movieName: "Ocean Waves", description: "A Request", movieSlug: "ocean-waves", imageUrl: "/placeholders/A Request.png", thumbnailUrl: "/placeholders/A Request.png", score: 1 },
  { filename: "aiRikako.png", year: 1993, movieName: "Ocean Waves", description: "Rikako", movieSlug: "ocean-waves", imageUrl: "/placeholders/aiRikako.png", thumbnailUrl: "/placeholders/aiRikako.png", score: 1 },
  { filename: "airporTaku.png", year: 1993, movieName: "Ocean Waves", description: "Taku at Airport", movieSlug: "ocean-waves", imageUrl: "/placeholders/airporTaku.png", thumbnailUrl: "/placeholders/airporTaku.png", score: 1 },
  { filename: "Akiko Shimizu.png", year: 1993, movieName: "Ocean Waves", description: "Akiko Shimizu", movieSlug: "ocean-waves", imageUrl: "/placeholders/Akiko Shimizu.png", thumbnailUrl: "/placeholders/Akiko Shimizu.png", score: 1 },
  { filename: "Anxiously Waiting.png", year: 1993, movieName: "Ocean Waves", description: "Anxiously Waiting", movieSlug: "ocean-waves", imageUrl: "/placeholders/Anxiously Waiting.png", thumbnailUrl: "/placeholders/Anxiously Waiting.png", score: 1 },
  { filename: "Awkward.png", year: 1993, movieName: "Ocean Waves", description: "Awkward", movieSlug: "ocean-waves", imageUrl: "/placeholders/Awkward.png", thumbnailUrl: "/placeholders/Awkward.png", score: 1 },
  { filename: "Back Home.png", year: 1993, movieName: "Ocean Waves", description: "Back Home", movieSlug: "ocean-waves", imageUrl: "/placeholders/Back Home.png", thumbnailUrl: "/placeholders/Back Home.png", score: 1 },
  { filename: "Being Nosy.png", year: 1993, movieName: "Ocean Waves", description: "Being Nosy", movieSlug: "ocean-waves", imageUrl: "/placeholders/Being Nosy.png", thumbnailUrl: "/placeholders/Being Nosy.png", score: 1 },
  { filename: "Better Late Than Never.png", year: 1993, movieName: "Ocean Waves", description: "Better Late Than Never", movieSlug: "ocean-waves", imageUrl: "/placeholders/Better Late Than Never.png", thumbnailUrl: "/placeholders/Better Late Than Never.png", score: 1 },
  { filename: "Candid Rikako.png", year: 1993, movieName: "Ocean Waves", description: "Candid Rikako", movieSlug: "ocean-waves", imageUrl: "/placeholders/Candid Rikako.png", thumbnailUrl: "/placeholders/Candid Rikako.png", score: 1 },
  { filename: "Catching Up.png", year: 1993, movieName: "Ocean Waves", description: "Catching Up", movieSlug: "ocean-waves", imageUrl: "/placeholders/Catching Up.png", thumbnailUrl: "/placeholders/Catching Up.png", score: 1 },
];

export async function loader({ context }: Route.LoaderArgs) {
  try {
    // Check if bucket binding exists (fallback for local dev)
    if (!context.cloudflare.env.GHIBLI_BUCKET) {
      return Response.json({ results: shuffleArray(placeholderImages).slice(0, 7) });
    }

    // List objects from R2 bucket (1000 is max per call)
    const listed = await context.cloudflare.env.GHIBLI_BUCKET.list({ limit: 1000 });

    // Filter to only image files and shuffle
    const imageFiles = listed.objects
      .filter(obj => obj.key.endsWith('.png') || obj.key.endsWith('.jpg') || obj.key.endsWith('.jpeg'))
      .sort(() => Math.random() - 0.5);

    // Take random 7 images
    const selected = imageFiles.slice(0, 7);

    // Parse into GhibliImage format (score of 1 for random images)
    const results = selected.map(obj => parseFilename(obj.key, 1));

    return Response.json({ results });
  } catch (error) {
    console.error("Failed to list random images, using fallback:", error);
    // Return placeholder images as fallback
    return Response.json({ results: shuffleArray(placeholderImages).slice(0, 7) });
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
