import { RegulationChunk } from "./types";
import { splitByLegalSections } from "./legal-split";

type ChunkInput = {
  text: string;
  fileId: string;
  fileName: string;
  regulationType: string;
};

// ─── OCR Noise Cleaner ────────────────────────────────────
function cleanContent(text: string): string {
  return text
    // Remove page markers: "-- 6 of 54 --"
    .replace(/--\s*\d+\s*of\s*\d+\s*--/g, "")
    // Remove section dividers: "-2-", "-7-"
    .replace(/^\s*-\d+-\s*$/gm, "")
    // Collapse excessive newlines
    .replace(/\n{3,}/g, "\n\n")
    // Trim each line
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

// ─── Main Chunker ─────────────────────────────────────────
export function chunkLegalText({
  text,
  fileId,
  fileName,
  regulationType,
}: ChunkInput): RegulationChunk[] {

  const MAX_CHUNK_SIZE = 2000;
  const chunks: RegulationChunk[] = [];

  // Step 1: Split by legal sections (Pasal boundaries)
  const sections = splitByLegalSections(text);

  for (const section of sections) {

    const cleaned = cleanContent(section);

    // Skip sections that are too small after cleaning
    if (cleaned.length < 200) {
      console.log(
        `Skipping small chunk (${cleaned.length} chars)`
      );
      continue;
    }

    // Step 2: If section fits within limit, use as-is
    if (cleaned.length <= MAX_CHUNK_SIZE) {
      chunks.push({
        id: `${fileId}_${chunks.length}`,
        content: cleaned,
        metadata: {
          fileId,
          fileName,
          regulationType,
          chunkIndex: chunks.length,
        },
      });
      continue;
    }

    // Step 3: If section is too large, split by paragraph
    // instead of blind character slicing
    const paragraphs = cleaned.split(/\n\n+/);
    let buffer = "";

    for (const paragraph of paragraphs) {

      if (
        buffer.length + paragraph.length >
        MAX_CHUNK_SIZE &&
        buffer.length > 0
      ) {
        // Save current buffer as chunk
        chunks.push({
          id: `${fileId}_${chunks.length}`,
          content: buffer.trim(),
          metadata: {
            fileId,
            fileName,
            regulationType,
            chunkIndex: chunks.length,
          },
        });
        buffer = "";
      }

      buffer += (buffer ? "\n\n" : "") + paragraph;
    }

    // Save remaining buffer
    if (buffer.trim().length > 200) {
      chunks.push({
        id: `${fileId}_${chunks.length}`,
        content: buffer.trim(),
        metadata: {
          fileId,
          fileName,
          regulationType,
          chunkIndex: chunks.length,
        },
      });
    }
  }

  return chunks;
}