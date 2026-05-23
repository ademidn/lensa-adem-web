import { genAI } from "./client";

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

export async function generateEmbedding(
  text: string,
  retries = 5
): Promise<number[]> {

  for (let attempt = 1; attempt <= retries; attempt++) {

    try {

      const response =
        await genAI.models.embedContent({
          model: "gemini-embedding-001",
          contents: text,
        });

      return response.embeddings[0].values;

    } catch (error: any) {

      const status =
        error?.status ||
        error?.code;

      console.log(
        `Embedding failed (attempt ${attempt})`
      );

      // Retry only temporary errors
      if (
        status === 429 ||
        status === 500 ||
        status === 503
      ) {

        const waitTime =
          attempt * 5000;

        console.log(
          `Retrying in ${waitTime}ms`
        );

        await sleep(waitTime);

        continue;
      }

      throw error;
    }
  }

  throw new Error(
    "Embedding failed after retries"
  );
}