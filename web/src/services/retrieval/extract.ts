import * as pdfjsLib from "pdfjs-dist";

export async function extractPdfText(
  buffer: Buffer
) {
  const uint8Array = new Uint8Array(buffer);

  const pdf = await pdfjsLib.getDocument({
    data: uint8Array,
  }).promise;

  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);

    const content = await page.getTextContent();

    const strings = content.items
      .map((item: any) => item.str)
      .join(" ");

    fullText += strings + "\n";
  }

  return fullText;
}