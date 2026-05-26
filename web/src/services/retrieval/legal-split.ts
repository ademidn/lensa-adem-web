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
// Only scan the first 3 lines of a block to avoid 
// matching BAB references inside prose content.
// Matches lines like:
//   "BAB I", "BAB II", "BAB IV - Ketentuan Umum"
//   "BAB I\nKETENTUAN UMUM" (title on next line)
function extractBab(text: string): string | undefined {
  const firstLines = text
    .trimStart()
    .split("\n")
    .slice(0, 3)
    .join("\n");

  const match = firstLines.match(
    /^(BAB\s+[IVXLCDM]+)(?:\s*[-–—]\s*(.+))?/im
  );

  if (!match) return undefined;

  const number = match[1].toUpperCase().replace(/\s+/, " ");
  const title = match[2]?.trim();

  return title ? `${number} - ${title}` : number;
}

// ─── Pasal extractor ─────────────────────────────────────
// Matches "Pasal 3", "PASAL 12", "Pasal 3A"
function extractPasal(text: string): string | undefined {
  // Only look at the first 3 lines — Pasal header is always
  // at the top of the section if it exists.
  // Prevents matching "Pasal 5" inside prose citations.

  const firstLines = text
    .trimStart()
    .split("\n")
    .slice(0, 3)
    .join("\n");

  const match = firstLines.match(
    /^(PASAL|Pasal)\s+(\d+[A-Za-z]?)/m
  );

  return match ? `Pasal ${match[2]}` : undefined;
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

    // Scan first 3 lines for a BAB header.
    // Update currentBab so subsequent sections inherit it.
    const bab = extractBab(trimmed);
    if (bab) currentBab = bab;

    // Pasal is extracted from the first 3 lines only.
    // prevents false matches on prose citations.
    const pasal = extractPasal(trimmed);

    sections.push({
      text: trimmed,
      bab: currentBab,
      pasal,
    });
  }

  return sections;
}