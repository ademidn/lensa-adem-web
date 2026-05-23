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
  getDocuments,
  VectorDocument,
} from "@/services/vector/memory-store";

const ROOT_FOLDER_ID =
  process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;

export async function GET() {

  try {

    // Load existing vector docs
    const existingDocs =
      getDocuments();

    // Create fast lookup set
    const existingIds =
      new Set(
        existingDocs.map((d) => d.id)
      );

    const documents: VectorDocument[] = [];

    let embeddedCount = 0;

    // Get all folders + files
    const folders =
      await listAllRegulationFiles(
        ROOT_FOLDER_ID
      );

    for (const folder of folders) {

      for (const file of folder.files) {

        if (!file.id || !file.name) {
          continue;
        }

        console.log(
          "\n=============================="
        );

        console.log(
          "INGESTING:",
          file.name
        );

        // 1. Download PDF
        const pdfBuffer =
          await downloadPdf(file.id);

        // 2. Extract text
        const text =
          await extractPdfText(
            pdfBuffer
          );

        // 3. Create chunks
        const chunks =
          chunkLegalText({
            text,
            fileId: file.id,
            fileName: file.name,
            regulationType:
              folder.folder || "unknown",
          });

        const totalChunks =
          chunks.length;

        let fileChunkCount = 0;

        console.log(
          `Total chunks: ${totalChunks}`
        );

        // 4. Generate embeddings
        for (const chunk of chunks) {

          // Skip already embedded chunks
          if (
            existingIds.has(chunk.id)
          ) {

            console.log(
              "Skipping existing chunk:",
              chunk.id
            );

            continue;
          }

          // Generate embedding
          const embedding =
            await generateEmbedding(
              chunk.content
            );

          // Delay to avoid rate limits
          await new Promise(
            (resolve) =>
              setTimeout(resolve, 4000)
          );

          const document = {
            ...chunk,
            embedding,
          };

          documents.push(document);

          // 5. Persist vector docs
          addDocuments([document]);

          fileChunkCount++;
          embeddedCount++;

          console.log(
            `[${file.name}] Chunk ${fileChunkCount}/${totalChunks} embedded`
          );

          console.log(
            `Global embedded chunks: ${embeddedCount}`
          );

          console.log(
            "Chunk embedded:",
            chunk.id
          );
        }

        console.log(
          `Finished ingesting ${file.name}`
        );
      }
    }


    return NextResponse.json({
      success: true,

      totalDocuments:
        documents.length,

      embeddedCount,
    });

  } catch (error: any) {

    console.error(error);

    return NextResponse.json({
      success: false,

      error:
        error?.message ||
        "Unknown error",
    });
  }
}