export function splitByLegalSections(
  text: string
): string[] {
  const sections = text.split(
    /\n(?=Pasal\s+\d+)/g
  );

  return sections.filter(
    (section) =>
      section.trim().length > 100
  );
}