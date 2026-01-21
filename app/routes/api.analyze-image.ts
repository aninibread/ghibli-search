import type { Route } from "./+types/api.analyze-image";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_RETRIES = 2;

async function analyzeImageWithRetry(
  ai: Ai,
  file: File,
  retries = MAX_RETRIES
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await ai.toMarkdown({
        name: file.name,
        blob: new Blob([await file.arrayBuffer()], { type: file.type }),
      });

      // Handle single result (not array)
      const conversionResult = Array.isArray(result) ? result[0] : result;

      if (conversionResult.format === "error") {
        throw new Error(conversionResult.error || "Failed to analyze image");
      }

      if (!conversionResult.data) {
        throw new Error("No description generated from image");
      }

      return conversionResult.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      lastError = error instanceof Error ? error : new Error(errorMessage);
      console.error(`Image analysis attempt ${attempt + 1} failed:`, errorMessage);

      // Check for Cloudflare error codes - don't retry on certain errors
      if (errorMessage.includes("error code: 1031") || errorMessage.includes("error code: 1015")) {
        // 1031 = service error, 1015 = rate limited - don't waste retries
        console.error("Cloudflare AI service error, skipping retries");
        break;
      }

      // Wait before retry (exponential backoff)
      if (attempt < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, attempt))
        );
      }
    }
  }

  throw lastError || new Error("Failed to analyze image after retries");
}

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image");

    // Validate file exists
    if (!file || !(file instanceof File)) {
      return Response.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json(
        { error: "Please upload a JPEG, PNG, or WebP image" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return Response.json(
        { error: "Image must be smaller than 10MB" },
        { status: 400 }
      );
    }

    // Analyze image with AI.toMarkdown()
    const description = await analyzeImageWithRetry(
      context.cloudflare.env.AI,
      file
    );

    return Response.json({
      description,
      filename: file.name,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Image analysis failed:", errorMessage, error);
    return Response.json(
      { 
        error: "Couldn't analyze this image, please try another",
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
