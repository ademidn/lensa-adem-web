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

    // ─── Legal Structure ──────────────
    // All optional — not every document uses all levels.
    // BAB carries forward across Pasal sections.
    bab?: string;               // e.g. "BAB I - Ketentuan Umum"
    pasal?: string;            // e.g. "Pasal 6"
    ayat?: string;              // e.g. "(1)", "(2)"

    // ─── Source Traceability ──────────
    page?: number;               // source PDF page if extractable
  };
}