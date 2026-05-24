export interface RegulationChunk {
  id: string;

  content: string;

  metadata: {
    // ─── Identity ─────────────────────
    fileId: string;
    fileName: string;
    regulationType: string;      // required — always known at ingestion

    // ─── Position ─────────────────────
    chunkIndex: number;
    totalChunks?: number;        // total chunks in this document

    // ─── Legal Structure ──────────────
    article?: string;            // e.g. "Pasal 6"
    section?: string;            // e.g. "BAB II"

    // ─── Source Traceability ──────────
    page?: number;               // source PDF page if extractable
  };
}