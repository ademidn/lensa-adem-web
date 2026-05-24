export function splitByLegalSections(
  text: string
): string[] {

  const normalized = text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");

  const sections = normalized.split(
    // Matches "Pasal 1" or "PASAL 1" at start of line
    // Works even if followed by text on the same line
    /\n(?=\s*(PASAL|Pasal)\s+\d+)/g
  );

  // Minimum 200 chars — filters out headers and noise
  return sections.filter(
    (section) => section.trim().length > 200
  );
}