import { RegulationChunk } from "./types";

interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
}

export function chunkLegalText(
  text: string,
  metadata: {
    fileId: string;
    fileName: string;
    regulationType?: string;
  },
  options: ChunkOptions = {}
): RegulationChunk[] {
  const chunkSize = options.chunkSize || 1500;
  const overlap = options.overlap || 300;

  const chunks: RegulationChunk[] = [];

  let start = 0;
  let chunkIndex = 0;

  while (start < text.length) {
    const end = Math.min(
      start + chunkSize,
      text.length
    );

    const content = text.slice(start, end);

    chunks.push({
      id: `${metadata.fileId}_${chunkIndex}`,

      content,

      metadata: {
        ...metadata,
        chunkIndex,
      },
    });

    start += chunkSize - overlap;

    chunkIndex++;
  }

  return chunks;
}