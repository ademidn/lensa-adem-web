import { generateEmbedding }
  from "../embedding/embed";

import { cosineSimilarity }
  from "./cosine";

import { loadAllVectors }
  from "./load-all";

export async function searchDocuments(
  query: string,
  limit = 5
) {

  const queryEmbedding =
    await generateEmbedding(query);

  const documents = loadAllVectors();

  const scored = documents.map((doc) => ({
    ...doc,

    score: cosineSimilarity(
      queryEmbedding,
      doc.embedding
    ),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}