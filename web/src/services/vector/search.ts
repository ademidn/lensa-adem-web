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

  // 5. Return top-k results
  return scored.slice(0, limit);
}