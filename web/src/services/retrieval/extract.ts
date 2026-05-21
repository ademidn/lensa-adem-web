import PDFParser from "pdf2json";

export async function extractPdfText(
  buffer: Buffer
): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on(
      "pdfParser_dataError",
      (error) => {
        reject(error);
      }
    );

    pdfParser.on(
      "pdfParser_dataReady",
      (pdfData) => {
        try {
          let text = "";

          for (const page of pdfData.Pages) {
            for (const textItem of page.Texts) {
              for (const run of textItem.R) {
                text += decodeURIComponent(run.T) + " ";
              }

              text += "\n";
            }
          }

          resolve(text);
        } catch (err) {
          reject(err);
        }
      }
    );

    pdfParser.parseBuffer(buffer);
  });
}