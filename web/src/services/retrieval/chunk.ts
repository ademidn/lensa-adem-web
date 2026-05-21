import { RegulationChunk } from "./types";

import { splitByLegalSections } from "./legal-split";

interface ChunkOptions {
  chunkSize?: number;
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
  const sections =
    splitByLegalSections(text);

  const chunkSize =
    options.chunkSize || 2000;

  const chunks: RegulationChunk[] = [];

  let chunkIndex = 0;

  for (const section of sections) {
    if (section.length <= chunkSize) {
      chunks.push({
        id: `${metadata.fileId}_${chunkIndex}`,

        content: section,

        metadata: {
          ...metadata,
          chunkIndex,
        },
      });

      chunkIndex++;

      continue;
    }

    let start = 0;

    while (start < section.length) {
      const end = Math.min(
        start + chunkSize,
        section.length
      );

      const content =
        section.slice(start, end);

      chunks.push({
        id: `${metadata.fileId}_${chunkIndex}`,

        content,

        metadata: {
          ...metadata,
          chunkIndex,
        },
      });

      start += chunkSize;

      chunkIndex++;
    }
  }

  return chunks;
}