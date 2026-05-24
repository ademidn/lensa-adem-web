import { genAI }
  from "./client";

export async function generateEmbedding(
  text: string
): Promise<number[]> {

  const response =
    await genAI.models.embedContent({

      model:
        "gemini-embedding-2",

      contents: text,
    });

  return response.embeddings?.[0]
    ?.values || [];
}