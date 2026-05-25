// Splits Indonesian legal document text into structured
// sections, preserving BAB and Pasal hierarchy.
// ─────────────────────────────────────────────────────────

// ─── Section shape ────────────────────────────────────────
// Each section carries its own BAB context so chunk.ts
// doesn't need to track document state separately.
export interface LegalSection {
  text: string;
  bab?: string;    // e.g. "BAB II - Ketentuan Umum"
  pasal?: string;  // e.g. "Pasal 6"
}

// ─── BAB extractor ────────────────────────────────────────
// Matches lines like:
//   "BAB I", "BAB II", "BAB IV - Ketentuan Umum"
//   "BAB I\nKETENTUAN UMUM" (title on next line)
function extractBab(line: string): string | undefined {
  const match = line
    .trimStart()
    .match(/^(BAB\s+[IVXLCDM]+)(?:\s*[-–—]\s*(.+))?/i);

  if (!match) return undefined;

  const number = match[1].toUpperCase().replace(/\s+/, " ");
  const title  = match[2]?.trim();

  return title ? `${number} - ${title}` : number;
}

// ─── Pasal extractor ─────────────────────────────────────
// Matches "Pasal 3", "PASAL 12", "Pasal 3A"
function extractPasal(line: string): string | undefined {
  const match = line
    .trimStart()
    .match(/^(PASAL|Pasal)\s+(\d+[A-Za-z]?)/);

  if (!match) return undefined;
  return `Pasal ${match[2]}`;
}

// ─── Main splitter ────────────────────────────────────────
// Returns structured sections instead of raw strings.
// BAB context is carried forward across Pasal sections
// so every section knows which BAB it belongs to.
export function splitByLegalSections(
  text: string
): LegalSection[] {

  const normalized = text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");

  // Split on Pasal boundaries — same as before
  const rawSections = normalized.split(
    /\n(?=\s*(PASAL|Pasal)\s+\d+)/g
  );

  const sections: LegalSection[] = [];
  let currentBab: string | undefined = undefined;

  for (const raw of rawSections) {

    const trimmed = raw.trim();
    if (trimmed.length < 200) continue;

    // Scan every line in the section for a BAB header.
    // BAB lines appear before the Pasal line in the same
    // text block when the document uses this layout:
    //
    //   BAB II - Kewajiban Produsen
    //   Pasal 5
    //   (1) Produsen wajib...
    //
    // When found, update currentBab so all subsequent
    // sections inherit it until the next BAB appears.
    const lines = trimmed.split("\n");
    for (const line of lines) {
      const bab = extractBab(line);
      if (bab) {
        currentBab = bab;
        break; // only one BAB per section block
      }
    }

    // Extract Pasal from the first matching line
    let pasal: string | undefined;
    for (const line of lines) {
      const p = extractPasal(line);
      if (p) {
        pasal = p;
        break;
      }
    }

    sections.push({
      text:  trimmed,
      bab:   currentBab,
      pasal,
    });
  }

  return sections;
}