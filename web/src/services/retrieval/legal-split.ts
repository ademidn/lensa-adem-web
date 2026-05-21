export function splitByLegalSections(
  text: string
): string[] {
  const sections = text.split(
    /\n\s*(?=Pasal\s+\d+\s*$)/gm
  );

  return sections.filter(
    (section) =>
      section.trim().length > 100
  );
}