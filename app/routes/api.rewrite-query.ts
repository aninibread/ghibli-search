import type { Route } from "./+types/api.rewrite-query";

const QUERY_REWRITE_PROMPT = `You are a search query writer for a Studio Ghibli movie stills search engine.

Your job: Convert a verbose image description into a short, poetic search phrase that will find similar anime scenes. The search engine uses semantic matching, so your phrase should capture the mood, subject, and atmosphere of the scene.

Your output will be used directly as a search query, so it MUST be a complete, meaningful phrase - not a fragment or incomplete sentence.

RULES:
- Write a COMPLETE phrase (4-8 words) that makes sense on its own
- NEVER end with articles or prepositions (e.g. "a", "an", "the", "of", "with", "in", "on", "to", "for", "and")
- NEVER mention "image", "picture", "shows", "depicts" - describe the scene itself
- Use dreamlike, atmospheric words that evoke Studio Ghibli's visual style
- NO markdown, quotes, or punctuation components or characters
- NO prefixes like "Output:" or "Search:"

EXAMPLES:
Input: "The image shows a young girl flying through clouds on a broomstick with a black cat sitting behind her."
Output: witch girl flying through soft clouds with black cat

Input: "A close up portrait of a young man is presented in the image with a thoughtful expression."
Output: dreaming young man portrait

Input: "A serene forest scene with ancient trees covered in moss and small white spirits standing among the roots."
Output: misty forest with gentle tree spirits

Input: "A red airplane flying over green rolling hills with white clouds in a bright blue sky."
Output: red airplane soaring over green hills

Input: "The image depicts a large castle floating in the sky surrounded by clouds at sunset."
Output: floating castle in golden sunset clouds

Input: "A young woman with long blonde hair sitting alone by a window looking out at the rain falling outside."
Output: lonely girl watching rain by window

Input: "A close-up of a person's face with soft lighting and a melancholic expression."
Output: melancholic portrait with soft lighting

Input: "The screenshot shows a yellow-themed user interface with various buttons."
Output: yellow themed interface design`;

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json() as { description?: string };
    const { description } = body;

    if (!description || typeof description !== "string") {
      return Response.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    // Use llama model for query rewriting (non-streaming)
    const result = await context.cloudflare.env.AI.run(
      // @ts-expect-error - model exists but types may be outdated
      "@cf/meta/llama-3.1-8b-instruct",
      {
        messages: [
          { role: "system", content: QUERY_REWRITE_PROMPT },
          { role: "user", content: description },
        ],
        max_tokens: 50,
      }
    );

    let searchQuery = (result as { response?: string }).response || description;

    // Clean up the response - strip any markdown or formatting
    searchQuery = searchQuery
      .replace(/```[\s\S]*?```/g, "") // Remove code blocks
      .replace(/```\w*\s*/g, "") // Remove unclosed code block markers
      .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold markdown
      .replace(/\*([^*]+)\*/g, "$1") // Remove italic markdown
      .replace(/^#+\s*/gm, "") // Remove heading markers
      .replace(/^[-*]\s+/gm, "") // Remove list markers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links, keep text
      .replace(/^["']|["']$/g, "") // Remove surrounding quotes
      .replace(/^(Output|Query|Search|Search query|Keywords|Result):?\s*/i, "") // Remove common prefixes
      .replace(/\n/g, " ") // Replace newlines with spaces
      .replace(/[^\w\s'-]/g, " ") // Remove punctuation except hyphens and apostrophes
      // Remove image-related words
      .replace(/\b(image|picture|photo|screenshot|photograph|description)\b/gi, "")
      // Remove verbs that describe showing
      .replace(/\b(shows?|depicts?|displays?|features?|presents?|contains?|illustrates?)\b/gi, "")
      .replace(/\s+/g, " ") // Collapse multiple spaces
      .toLowerCase()
      .trim();

    // Split into words and clean up
    let words = searchQuery.split(/\s+/).filter(w => w.length > 0);
    
    // Words that should never end a phrase (articles, prepositions, conjunctions)
    const danglingWords = ['a', 'an', 'the', 'of', 'with', 'in', 'on', 'at', 'to', 'for', 'by', 'from', 'as', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'that', 'which', 'who', 'being', 'this', 'its'];
    
    // Remove dangling words from the end
    while (words.length > 0 && danglingWords.includes(words[words.length - 1])) {
      words.pop();
    }
    
    // Remove dangling words from the start (except articles can sometimes start)
    const startDangling = ['of', 'with', 'in', 'on', 'at', 'to', 'for', 'by', 'from', 'as', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'that', 'which', 'who', 'being', 'this'];
    while (words.length > 0 && startDangling.includes(words[0])) {
      words.shift();
    }

    // Limit to 8 words max, then trim dangling again
    if (words.length > 8) {
      words = words.slice(0, 8);
      while (words.length > 0 && danglingWords.includes(words[words.length - 1])) {
        words.pop();
      }
    }
    
    searchQuery = words.join(" ");
    
    // If still empty after cleanup, create a short fallback from description
    if (!searchQuery || searchQuery.length < 3) {
      const fallbackWords = description
        .replace(/[^\w\s]/g, " ")
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2 && !danglingWords.includes(w) && !['image', 'picture', 'photo', 'shows', 'depicts'].includes(w));
      
      words = fallbackWords.slice(0, 6);
      while (words.length > 0 && danglingWords.includes(words[words.length - 1])) {
        words.pop();
      }
      searchQuery = words.join(" ");
    }

    return Response.json({ searchQuery });
  } catch (error) {
    console.error("Query rewriting failed:", error);
    return Response.json(
      { error: "Failed to rewrite query" },
      { status: 500 }
    );
  }
}
