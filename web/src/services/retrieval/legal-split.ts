export function splitByLegalSections(
  text: string
): string[] {

  // Normalize whitespace
  const normalized =
    text
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n");

  // split by Pasal
  const sections = normalized.split(
    /\n\s*(?=Pasal\s+\d+\s*$)/gm
  );

  // filter chunk which size too small
  return sections.filter(
    (section) =>
      section.trim().length > 100
  );
}