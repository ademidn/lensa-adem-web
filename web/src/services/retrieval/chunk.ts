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

// ─── Article Extractor ────────────────────────────────────
// Parses "Pasal 3" or "PASAL 12" from the start of a
// section string. Returns undefined if not found.
//
// Called on the RAW section (before cleanContent) because
// the header is always the first meaningful line.
function extractArticle(
  sectionText: string
): string | undefined {

  // Match "Pasal 3", "PASAL 12", "Pasal 3A", etc.
  const match = sectionText
    .trimStart()
    .match(/^(PASAL|Pasal)\s+(\d+[A-Za-z]?)/m);

  if (!match) return undefined;

  // Normalise to title case: "Pasal 3"
  return `Pasal ${match[2]}`;
}

// ─── Section Extractor ────────────────────────────────────
// Parses the first ayat label from the section text,
// e.g. "(1)", "(2)" — used as a sub-article marker.
// Returns undefined if the section has no ayat structure.
function extractSection(
  sectionText: string
): string | undefined {

  const match = sectionText.match(/\(\d+\)/);
  return match ? match[0] : undefined;
}

// ─── Chunk Builder ────────────────────────────────────────
// Creates a RegulationChunk with all metadata populated.
function makeChunk(
  content: string,
  article: string | undefined,
  section: string | undefined,
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
      // Only include defined values — keeps JSON clean
      ...(article  !== undefined && { article }),
      ...(section  !== undefined && { section }),
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
  const chunks: RegulationChunk[] = [];

  // Step 1: Split by legal sections (Pasal boundaries)
  const sections = splitByLegalSections(text);

  for (const section of sections) {

    // Extract article/section BEFORE cleaning —
    // cleanContent may alter whitespace around headers
    const article = extractArticle(section);
    const sec     = extractSection(section);

    const cleaned = cleanContent(section);

    // Skip sections that are too small after cleaning
    if (cleaned.length < 200) {
      console.log(
        `Skipping small chunk (${cleaned.length} chars)`
      );
      continue;
    }

    // Step 2: Section fits within limit — use as-is
    if (cleaned.length <= MAX_CHUNK_SIZE) {
      chunks.push(
        makeChunk(
          cleaned, article, sec,
          fileId, fileName, regulationType,
          chunks.length
        )
      );
      continue;
    }

    // Step 3: Section too large — split by paragraph.
    // All sub-chunks inherit the parent article metadata
    // so citations stay accurate even after splitting.
    const paragraphs = cleaned.split(/\n\n+/);
    let buffer = "";
    let subIndex = 0;

    for (const paragraph of paragraphs) {

      if (
        buffer.length + paragraph.length > MAX_CHUNK_SIZE &&
        buffer.length > 0
      ) {
        chunks.push(
          makeChunk(
            buffer.trim(),
            article,
            // Label sub-chunks: "(1) bagian 1", "(1) bagian 2"
            sec ? `${sec} bagian ${++subIndex}` : undefined,
            fileId, fileName, regulationType,
            chunks.length
          )
        );
        buffer = "";
      }

      buffer += (buffer ? "\n\n" : "") + paragraph;
    }

    // Save remaining buffer
    if (buffer.trim().length > 200) {
      chunks.push(
        makeChunk(
          buffer.trim(),
          article,
          sec ? `${sec} bagian ${++subIndex}` : undefined,
          fileId, fileName, regulationType,
          chunks.length
        )
      );
    }
  }

  return chunks;
}