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

// ─── Global singleton ─────────────────────────────────────
// Module-level `let` is reset on every Next.js
// hot reload. Attaching to `global` survives
// route re-evaluation across requests in dev mode.
declare global {
  // eslint-disable-next-line no-var
  var __vectorCache: VectorDocument[] | undefined;
}

// ─── In-memory cache ──────────────────────────────────────
// Proxy through global so the reference persists
// across Next.js module re-evaluations.
function getCached(): VectorDocument[] | null {
  return global.__vectorCache ?? null;
}

function setCached(docs: VectorDocument[]): void {
  global.__vectorCache = docs;
}

function clearCached(): void {
  global.__vectorCache = undefined;
}

// ─── Get all documents ────────────────────────────────────
// Loads from disk on first call,
// returns cached copy on subsequent calls.
export function getAllDocuments():
  VectorDocument[] {

  const cached = getCached();

  if (cached !== null) {
    return cached;
  }

  console.log(
    "Vector store: loading from disk..."
  );

  const docs = loadAllVectors();
  setCached(docs);

  console.log(
    `Vector store: ${docs.length} documents cached`
  );

  return docs;
}

// ─── Invalidate cache ─────────────────────────────────────
// Call this after new vectors are ingested
// so the next search reloads from disk.
export function invalidateCache() {

  clearCached();

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