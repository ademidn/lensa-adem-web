import { NextResponse } from "next/server";

import {
  listAllRegulationFiles,
  downloadPdf,
} from "@/services/drive/files";

import { extractPdfText }
  from "@/services/retrieval/extract";

import { chunkLegalText }
  from "@/services/retrieval/chunk";

import { generateEmbedding }
  from "@/services/embedding/embed";

import {
  addDocuments,
  VectorDocument,
} from "@/services/vector/memory-store";

const ROOT_FOLDER_ID =
  process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;

export async function GET() {

  try {

    const folders =
      await listAllRegulationFiles(
        ROOT_FOLDER_ID
      );

    const documents: VectorDocument[] = [];

    for (const folder of folders) {

      for (const file of folder.files) {

        if (!file.id || !file.name) {
          continue;
        }

        console.log(
          "INGESTING:",
          file.name
        );

        // 1. Download PDF
        const pdfBuffer =
          await downloadPdf(file.id);

        // 2. Extract text
        const text =
          await extractPdfText(pdfBuffer);

        // 3. Create chunks
        const chunks =
          chunkLegalText({
            text,
            fileId: file.id!,
            fileName: file.name!,
            regulationType: 
              folder.folder || "unknown",
          });

        // 4. Generate embeddings
        for (const chunk of chunks) {

          const embedding =
            await generateEmbedding(
              chunk.content
            );

            await new Promise((resolve) =>
              setTimeout(resolve, 2000)
            );

          documents.push({
            ...chunk,
            embedding,
          });

          console.log(
            "Chunk embedded:",
            chunk.id
          );
        }
      }
    }

    // 5. Store in memory vector DB
    addDocuments(documents);

    return NextResponse.json({
      success: true,

      totalDocuments:
        documents.length,
    });

  } catch (error: any) {

    console.error(error);

    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}