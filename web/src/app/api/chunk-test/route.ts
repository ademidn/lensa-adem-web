import { NextResponse } from "next/server";

import { downloadPdf } from "@/services/drive/files";

import { extractPdfText } from "@/services/retrieval/extract";

import { cleanLegalText } from "@/services/retrieval/clean";

import { chunkLegalText } from "@/services/retrieval/chunk";

export async function GET() {
  try {
    const fileId =
      "1sDAhsmQtEVkO-WE19yYN3bCY5iR83FVc";

    const buffer = await downloadPdf(fileId);

    const rawText =
      await extractPdfText(buffer);

    const cleanText =
      cleanLegalText(rawText);

    const chunks = chunkLegalText(
      cleanText,
      {
        fileId,
        fileName: "uu_32_2009_pplh.pdf",
        regulationType: "uu",
      }
    );

    return NextResponse.json({
      success: true,
      totalChunks: chunks.length,
      firstChunk: chunks[0],
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}