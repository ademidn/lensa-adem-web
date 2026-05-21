export function cleanLegalText(
  text: string
): string {
  return text
    .replace(/\r/g, "")

    // remove excessive spaces
    .replace(/[ ]{2,}/g, " ")

    // normalize newlines
    .replace(/\n{3,}/g, "\n\n")

    // remove page indicators
    .replace(/-- \d+ of \d+ --/g, "")

    // remove repeated government headers
    .replace(/PRESIDEN\s+REPUBLIK INDONESIA/g, "")

    // remove page number markers
    .replace(/- \d+ -/g, "")

    // normalize dotted references
    .replace(/\. \. \./g, "")

    .trim();
}