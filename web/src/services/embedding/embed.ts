import { genAI }
  from "./client";

const MODEL =
  "gemini-embedding-2";

// SINGLE EMBEDDING
export async function generateEmbedding(
  text: string
): Promise<number[]> {

  const response =
    await genAI.models.embedContent({

      model: MODEL,

      contents: text,
    });

  // DEBUG LOG
  console.log(
    "Embedding response received"
  );

  // VALIDATION
  if (
    !response ||
    !response.embeddings ||
    !response.embeddings[0]
  ) {

    console.error(
      "Invalid embedding response:",
      JSON.stringify(
        response,
        null,
        2
      )
    );

    throw new Error(
      "Embedding response invalid"
    );
  }

  return response
    .embeddings[0]
    .values;
}

// BATCH EMBEDDING
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {

  // SAFETY CHECK
  if (texts.length === 0) {
    return [];
  }

  const response =
    await genAI.models.embedContent({

      model: MODEL,

      contents: texts,
    });

  // DEBUG LOG
  console.log(
    `Batch embedding success: ${texts.length} chunks`
  );

  // VALIDATION
  if (
    !response ||
    !response.embeddings
  ) {

    console.error(
      "Invalid batch embedding response:",
      JSON.stringify(
        response,
        null,
        2
      )
    );

    throw new Error(
      "Batch embedding response invalid"
    );
  }

  return response.embeddings.map(
    (embedding: any) => {

      if (!embedding.values) {

        throw new Error(
          "Missing embedding values"
        );
      }

      return embedding.values;
    }
  );
}