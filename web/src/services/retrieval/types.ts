export interface RegulationChunk {
  id: string;

  content: string;

  metadata: {
    fileId: string;
    fileName: string;

    regulationType?: string;

    chunkIndex: number;

    article?: string;

    page?: number;
  };
}