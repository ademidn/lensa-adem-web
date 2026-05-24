// src/services/vector/vector-store.ts
//
// In-memory vector store with startup loader.
// Loads all vectors from disk ONCE at startup
// and keeps them in memory for fast search.
//
// This replaces the old memory-store.ts
// single-file architecture.

import { loadAllVectors }
  from "./load-all";

import { VectorDocument }
  from "./memory-store";

// ─── In-memory cache ──────────────────────────────────────
let cachedDocuments:
  VectorDocument[] | null = null;

// ─── Get all documents ────────────────────────────────────
// Loads from disk on first call,
// returns cached copy on subsequent calls.
export function getAllDocuments():
  VectorDocument[] {

  if (cachedDocuments !== null) {
    return cachedDocuments;
  }

  console.log(
    "Vector store: loading from disk..."
  );

  cachedDocuments = loadAllVectors();

  console.log(
    `Vector store: ${cachedDocuments.length} documents cached`
  );

  return cachedDocuments;
}

// ─── Invalidate cache ─────────────────────────────────────
// Call this after new vectors are ingested
// so the next search reloads from disk.
export function invalidateCache() {

  cachedDocuments = null;

  console.log(
    "Vector store: cache invalidated"
  );
}

// ─── Get documents by regulation type ────────────────────
// Filters cached documents by regulationType
// without reloading from disk.
export function getDocumentsByType(
  regulationType: string
): VectorDocument[] {

  return getAllDocuments().filter(
    (doc) =>
      doc.metadata.regulationType
        ?.toLowerCase() ===
      regulationType.toLowerCase()
  );
}

// ─── Get store stats ──────────────────────────────────────
// Useful for debug endpoints.
export function getStoreStats() {

  const docs = getAllDocuments();

  const byType: Record<string, number> =
    {};

  for (const doc of docs) {

    const type =
      doc.metadata.regulationType ??
      "unknown";

    byType[type] =
      (byType[type] ?? 0) + 1;
  }

  return {
    totalDocuments: docs.length,
    byRegulationType: byType,
  };
}