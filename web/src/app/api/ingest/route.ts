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

import { VectorDocument }
  from "@/services/vector/memory-store";

import {
  ensureVectorDirs,
  saveVectorFile,
  vectorFileExists,
} from "@/services/vector/file-store";

const ROOT_FOLDER_ID =
  process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;

export async function GET() {

  try {

    // Ensure vector directories exist
    ensureVectorDirs();

    let embeddedCount = 0;
    let processedFiles = 0;
    let skippedFiles = 0;

    // Get all regulation folders + files
    const folders =
      await listAllRegulationFiles(
        ROOT_FOLDER_ID
      );

    for (const folder of folders) {

      for (const file of folder.files) {

        if (!file.id || !file.name) {
          continue;
        }

        // Skip already ingested files
        if (
          vectorFileExists(
            folder.folder,
            file.name
          )
        ) {

          skippedFiles++;

          console.log(
            "\n=============================="
          );

          console.log(
            "SKIPPING:",
            file.name
          );

          continue;
        }

        console.log(
          "\n=============================="
        );

        console.log(
          "INGESTING:",
          file.name
        );

        const documents: VectorDocument[] = [];

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

        console.log(
          `Total chunks: ${totalChunks}`
        );

        let fileChunkCount = 0;

        // 4. Generate embeddings
        for (const chunk of chunks) {

          try {

            const embedding =
              await generateEmbedding(
                chunk.content
              );

            // Delay to avoid rate limits
            await new Promise(
              (resolve) =>
                setTimeout(resolve, 2000)
            );

            const document: VectorDocument = {
              ...chunk,
              embedding,
            };

            documents.push(document);

            fileChunkCount++;
            embeddedCount++;

            console.log(
              `[${file.name}] Chunk ${fileChunkCount}/${totalChunks} embedded`
            );

            console.log(
              `Global embedded chunks: ${embeddedCount}`
            );

          } catch (embeddingError: any) {

            console.error(
              `Embedding failed for chunk ${chunk.id}`
            );

            console.error(
              embeddingError?.message
            );

            // Continue ingestion
            continue;
          }
        }

        // 5. Save vector file
        saveVectorFile(
          folder.folder,
          file.name,
          documents
        );

        console.log(
          "SAVED VECTOR FILE:",
          file.name
        );

        console.log(
          `Finished ingesting ${file.name}`
        );

        processedFiles++;
      }
    }

    console.log(
      "\n=============================="
    );

    console.log(
      "INGESTION COMPLETED"
    );

    console.log(
      `Processed files: ${processedFiles}`
    );

    console.log(
      `Skipped files: ${skippedFiles}`
    );

    console.log(
      `Embedded chunks: ${embeddedCount}`
    );

    return NextResponse.json({
      success: true,

      processedFiles,

      skippedFiles,

      embeddedChunks:
        embeddedCount,

      message:
        "Ingestion completed",
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