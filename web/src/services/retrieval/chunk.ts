import { RegulationChunk } from "./types";

type ChunkInput = {
  text: string;
  fileId: string;
  fileName: string;
  regulationType: string;
};

export function chunkLegalText({
  text,
  fileId,
  fileName,
  regulationType,
}: ChunkInput): RegulationChunk[] {

  const chunkSize = 1500;

  const overlap = 200;

  const chunks: RegulationChunk[] = [];

  for (
    let i = 0;
    i < text.length;
    i += chunkSize - overlap
  ) {

    const content =
      text.slice(i, i + chunkSize);

    chunks.push({
      id: `${fileId}_${chunks.length}`,

      content,

      metadata: {
        fileId,
        fileName,
        regulationType,
        chunkIndex: chunks.length,
      },
    });
  }

  return chunks;
}