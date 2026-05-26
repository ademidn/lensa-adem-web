// src/services/vector/search.ts
//
// Semantic search over embedded regulation chunks.
// Embeds the user query, computes cosine similarity
// against all cached vectors, and returns top-k results.
//
// Reads from in-memory cache via vector-store.ts —
// NOT from disk on every request.

import { generateEmbedding }
  from "../embedding/embed";

import { cosineSimilarity }
  from "./cosine";

import {
  getAllDocuments,
  getDocumentsByType,
} from "./vector-store";

// ─── Search result shape ──────────────────────────────────
export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: {
    fileId: string;
    fileName: string;
    regulationType: string;
    chunkIndex: number;
    article?: string;
    section?: string;
  };
}

// ─── Similarity threshold ─────────────────────────────────
// Chunks scoring below this are considered irrelevant
// and excluded before passing to the LLM.
//
// How to tune this value:
// 1. Set DEBUG_SCORES = true
// 2. Run several queries — both relevant and off-topic
// 3. Note the score of the lowest relevant chunk
//    and the score of the highest irrelevant chunk
// 4. Set threshold between those two values
// 5. Set DEBUG_SCORES = false before deploying
const MIN_SIMILARITY_SCORE = 0.63;

// Set to true temporarily to log top scores per query.
// Always false in production.
const DEBUG_SCORES = false;

// ─── Main search function ─────────────────────────────────
export async function searchDocuments(
  query: string,
  limit = 5,

  // Optional: scope search to one
  // regulation type e.g. "uu", "permen"
  regulationType?: string

): Promise<SearchResult[]> {

  // 1. Embed the query
  const queryEmbedding =
    await generateEmbedding(query);

  // 2. Load documents from cache
  // (filtered by type if provided)
  const documents = regulationType
    ? getDocumentsByType(regulationType)
    : getAllDocuments();

  if (documents.length === 0) {

    console.warn(
      "searchDocuments: No documents in store.",
      regulationType
        ? `Filter: ${regulationType}`
        : "No filter applied."
    );

    return [];
  }

  // 3. Score every document
  const scored = documents.map((doc) => ({
    id: doc.id,
    content: doc.content,
    score: cosineSimilarity(
      queryEmbedding,
      doc.embedding
    ),
    metadata: doc.metadata,
  }));

  // 4. Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // 5. Debug: log top scores to help tune MIN_SIMILARITY_SCORE
  if (DEBUG_SCORES) {
    console.log(
      "[search] Top scores:",
      scored.slice(0, 5).map((d) => ({
        score:   d.score.toFixed(3),
        file:    d.metadata.fileName,
        article: d.metadata.article ?? "—",
      }))
    );
  }

  // 6. Filter by relevance threshold, then take top-k
  const results = scored
    .filter((d) => d.score >= MIN_SIMILARITY_SCORE)
    .slice(0, limit);

  // 7. Warn if threshold eliminated everything
  if (results.length === 0) {
    console.warn(
      `[search] All chunks scored below threshold (${MIN_SIMILARITY_SCORE}).`,
      `Top score was: ${scored[0]?.score.toFixed(3) ?? "n/a"}.`,
      `Query: "${query}"`
    );
  }

  return results;
}