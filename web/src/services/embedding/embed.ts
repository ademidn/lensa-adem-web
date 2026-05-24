import { genAI } from "./client";

const MODEL = "gemini-embedding-2";

// ─── Single Embedding ─────────────────────────────────────
export async function generateEmbedding(
  text: string
): Promise<number[]> {

  const response =
    await genAI.models.embedContent({
      model: MODEL,
      contents: text,
    });

  if (
    !response?.embeddings?.[0]?.values
  ) {
    throw new Error(
      "Invalid single embedding response"
    );
  }

  return response.embeddings[0].values;
}

// ─── Batch Embedding ──────────────────────────────────────
// NOTE: Gemini embedContent may only return 1 embedding
// regardless of input count. We validate the count and
// fall back to sequential if the API behaves that way.
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {

  if (texts.length === 0) {
    return [];
  }

  // Attempt single API call with multiple inputs
  const response =
    await genAI.models.embedContent({
      model: MODEL,
      contents: texts,
    });

  const received =
    response?.embeddings?.length ?? 0;

  // ── CRITICAL: Validate count matches input ──
  if (received !== texts.length) {

    console.warn(
      `Embedding count mismatch: sent ${texts.length}, received ${received}. Falling back to sequential.`
    );

    // Sequential fallback — guaranteed 1:1 mapping
    return sequentialEmbeddings(texts);
  }

  // Validate each embedding value exists
  return response.embeddings.map(
    (embedding: any, index: number) => {

      if (!embedding?.values) {
        throw new Error(
          `Missing embedding values at index ${index}`
        );
      }

      return embedding.values;
    }
  );
}

// ─── Sequential Fallback ──────────────────────────────────
// Used when batch API does not return correct count.
// Adds a small delay between requests to avoid rate limits.
async function sequentialEmbeddings(
  texts: string[]
): Promise<number[][]> {

  const results: number[][] = [];

  for (let i = 0; i < texts.length; i++) {

    const embedding =
      await generateEmbedding(texts[i]);

    results.push(embedding);

    console.log(
      `Sequential embedding: ${i + 1}/${texts.length}`
    );

    // Small delay between sequential requests
    if (i < texts.length - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, 3000)
      );
    }
  }

  return results;
}