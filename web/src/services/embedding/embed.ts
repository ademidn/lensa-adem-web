import { genAI }
  from "./client";

export async function generateEmbedding(
  texts: string[]
): Promise<number[][]> {

  const response =
    await genAI.models.embedContent({

      model:
        "gemini-embedding-001",

      contents: texts,
    });

  console.log(
    JSON.stringify(response, null, 2)
  );

  return response.embeddings.map(
    (e: any) => e.values
  );
}