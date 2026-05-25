import { RegulationChunk } from "./types";
import {
  splitByLegalSections,
  LegalSection,
} from "./legal-split";

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

// ─── Ayat Extractor ───────────────────────────────────────
// Returns the first ayat marker found in the text,
// e.g. "(1)", "(2)". Used as sub-article granularity.
// Returns undefined if the section has no ayat structure.
function extractAyat(text: string): string | undefined {
  const match = text.match(/^\s*\((\d+)\)/m);
  return match ? `(${match[1]})` : undefined;
}

// ─── Structural guard ────────────────────────────────────────
// Returns true if the section has legal structure markers.
// Unstructured short blocks (preambles, reference lists)
// are filtered out to reduce noise in the vector store.
function isStructural(section: LegalSection): boolean {
  return !!(section.bab || section.pasal);
}

// ─── Chunk Builder ────────────────────────────────────────
// Single source of truth for creating a RegulationChunk.
// Spreads only defined metadata fields — avoids storing
// `undefined` keys in the JSON output.
function makeChunk(
  content: string,
  section: LegalSection,
  ayat: string | undefined,
  fileId: string,
  fileName: string,
  regulationType: string,
  index: number
): RegulationChunk {
  return {
    id: `${fileId}_${index}`,
    content,
    metadata: {
      fileId,
      fileName,
      regulationType,
      chunkIndex: index,
      ...(section.bab !== undefined && { bab: section.bab }),
      ...(section.pasal !== undefined && { pasal: section.pasal }),
      ...(ayat !== undefined && { ayat }),
    },
  };
}

// ─── Main Chunker ─────────────────────────────────────────
export function chunkLegalText({
  text,
  fileId,
  fileName,
  regulationType,
}: ChunkInput): RegulationChunk[] {

  const MAX_CHUNK_SIZE = 2000;

  // Minimum size for unstructured blocks (no Bab/Pasal).
  // Structured blocks keep the existing 200-char floor.
  const MIN_UNSTRUCTURED_SIZE = 400;

  const chunks: RegulationChunk[] = [];

  // Step 1: Split by legal sections with BAB/Pasal context
  const sections = splitByLegalSections(text);

  for (const section of sections) {

    // Extract ayat BEFORE cleanContent — whitespace around
    // "(1)" markers is more reliable in the raw text
    const ayat = extractAyat(section.text);
    const cleaned = cleanContent(section.text);

    // Short unstructured blocks are skipped
    const minSize = isStructural(section)
      ? 200
      : MIN_UNSTRUCTURED_SIZE;
    if (cleaned.length < minSize) {
      console.log(
        `Skipping chunk (${cleaned.length} chars),`,
        isStructural(section)
          ? `${section.pasal ?? section.bab}`
          : "unstructured"
      );
      continue;
    }

    // Step 2: Section fits within limit — use as-is
    if (cleaned.length <= MAX_CHUNK_SIZE) {
      chunks.push(
        makeChunk(
          cleaned, section, ayat,
          fileId, fileName, regulationType,
          chunks.length
        )
      );
      continue;
    }

    // Step 3: Section too large — split by paragraph.
    // All sub-chunks inherit the parent BAB and Pasal so
    // citations stay accurate across the split boundary.
    const paragraphs = cleaned.split(/\n\n+/);
    let buffer = "";

    for (const paragraph of paragraphs) {

      if (
        buffer.length + paragraph.length > MAX_CHUNK_SIZE &&
        buffer.length > 0
      ) {
        chunks.push(
          makeChunk(
            buffer.trim(), section, extractAyat(buffer),
            fileId, fileName, regulationType,
            chunks.length
          )
        );
        buffer = "";
      }

      buffer += (buffer ? "\n\n" : "") + paragraph;
    }

    if (buffer.trim().length >= 200) {
      chunks.push(
        makeChunk(
          buffer.trim(), section, extractAyat(buffer),
          fileId, fileName, regulationType,
          chunks.length
        )
      );
    }
  }

  return chunks;
}