import { NextResponse } from "next/server";
import { downloadPdf } from "@/services/drive/files";
import { extractPdfText } from "@/services/retrieval/extract";

export async function GET() {
  try {
    const fileId = "1LJz3YRuwqUkcrA_y0kcwqnZdNXFKR4iK";

    const pdfBuffer = await downloadPdf(fileId);

    const text = await extractPdfText(pdfBuffer);

    return NextResponse.json({
      success: true,
      preview: text.slice(0, 3000),
    });
  } catch (error: any) {
      console.error(error);

      return NextResponse.json(
        {
          success: false,
          error: error?.message || "Unknown error",
        },
        {
          status: 500,
        }
      );
    }
}