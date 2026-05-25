import { resolve } from "path";
import { genAI } from "./client";

const MODEL = "gemini-embedding-2";

// Delay between sequential embedding requests (ms).
// Free tier is rate limited per minute
const SEQUENTIAL_DELAY = 1000; // (ms)

// ─── Single Embedding ─────────────────────────────────────
export async function generateEmbedding(
  text: string
): Promise<number[]> {

  const response =
    await genAI.models.embedContent({
      model: MODEL,
      contents: text,
    });

  if (!response?.embeddings?.[0]?.values) {
    throw new Error(
      "Invalid single embedding response: missing values"
    );
  }

  return response.embeddings[0].values;
}

// ─── Batch Embedding ──────────────────────────────────────
// NOTE: Gemini free tier only returns 1 embedding per call
// regardless of input count (batch API is not supported).
// This runs sequentially with a small delay between requests
// to stay within rate limits.
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {

  if (texts.length === 0) return [];

  const results: number[][] = [];

  for (let i = 0; i < texts.length; i++) {
    results.push(await generateEmbedding(texts[i]));

    console.log(
      `Embedding: ${i + 1}/${texts.length}`
    );

    // Skip delay after the last item
    if (i < texts.length - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, SEQUENTIAL_DELAY)
      );
    }
  }

  return results;
}