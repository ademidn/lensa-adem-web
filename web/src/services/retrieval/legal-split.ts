export function splitByLegalSections(
  text: string
): string[] {

  // split by Pasal
  const sections = text.split(
    /\n\s*(?=Pasal\s+\d+\s*$)/gm
  );

  // filter chunk which size too small
  return sections.filter(
    (section) =>
      section.trim().length > 100
  );
}