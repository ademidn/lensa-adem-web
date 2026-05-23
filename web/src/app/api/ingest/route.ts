import { NextResponse }
  from "next/server";

import {
  listAllRegulationFiles,
  downloadPdf,
} from "@/services/drive/files";

import {
  extractPdfText
} from "@/services/retrieval/extract";

import {
  chunkLegalText
} from "@/services/retrieval/chunk";

import {
  generateEmbedding
} from "@/services/embedding/embed";

import {
  VectorDocument
} from "@/services/vector/memory-store";

import {
  ensureVectorDirs,
  saveVectorFile,
  loadVectorFile,
  vectorFileExists,
  saveFailedChunks,
} from "@/services/vector/file-store";

const ROOT_FOLDER_ID =
  process.env
    .GOOGLE_DRIVE_ROOT_FOLDER_ID!;

function sleep(ms: number) {
  return new Promise(
    (resolve) =>
      setTimeout(resolve, ms)
  );
}

async function generateEmbeddingWithRetry(
  text: string,
  retries = 2
) {

  for (
    let attempt = 1;
    attempt <= retries;
    attempt++
  ) {

    try {

      return await generateEmbedding(
        text
      );

    } catch (error) {

      console.log(
        `Embedding failed (attempt ${attempt})`
      );

      if (attempt === retries) {
        throw error;
      }

      const delay =
        attempt * 5000;

      console.log(
        `Retrying in ${delay}ms`
      );

      await sleep(delay);
    }
  }

  throw new Error(
    "Embedding failed after retries"
  );
}

export async function GET() {

  try {

    ensureVectorDirs();

    let globalEmbedded = 0;
    let globalFailed = 0;

    let consecutiveFailures = 0;

    const folders =
      await listAllRegulationFiles(
        ROOT_FOLDER_ID
      );

    for (const folder of folders) {

      for (const file of folder.files) {

        if (
          !file.id ||
          !file.name
        ) {
          continue;
        }

        console.log(
          "\n=========================="
        );

        console.log(
          "INGESTING:",
          file.name
        );

        let documents:
          VectorDocument[] = [];

        // Resume existing vector file
        if (
          vectorFileExists(
            folder.folder,
            file.name
          )
        ) {

          documents =
            loadVectorFile(
              folder.folder,
              file.name
            );

          console.log(
            `Loaded existing vectors: ${documents.length}`
          );
        }

        const existingIds =
          new Set(
            documents.map(
              (d) => d.id
            )
          );

        const failedChunks: any[] =
          [];

        // Download PDF
        const pdfBuffer =
          await downloadPdf(
            file.id
          );

        // Extract text
        const text =
          await extractPdfText(
            pdfBuffer
          );

        // Create chunks
        const chunks =
          chunkLegalText({
            text,
            fileId: file.id,
            fileName: file.name,
            regulationType:
              folder.folder || "unknown",
          });

        console.log(
          `Total chunks: ${chunks.length}`
        );

        let fileEmbedded = 0;

        for (const chunk of chunks) {

          // Skip existing chunk
          if (
            existingIds.has(
              chunk.id
            )
          ) {

            console.log(
              `Skipping existing chunk: ${chunk.id}`
            );

            continue;
          }

          try {

            const embedding =
              await generateEmbeddingWithRetry(
                chunk.content
              );

            const document = {
              ...chunk,
              embedding,
            };

            documents.push(
              document
            );

            // Save immediately
            saveVectorFile(
              folder.folder,
              file.name,
              documents
            );

            fileEmbedded++;
            globalEmbedded++;

            consecutiveFailures = 0;

            console.log(
              `[${file.name}] Chunk ${fileEmbedded}/${chunks.length} embedded`
            );

            console.log(
              `Global embedded: ${globalEmbedded}`
            );

            // Delay between requests
            await sleep(7000);

          } catch (error) {

            console.log(
              `FAILED chunk: ${chunk.id}`
            );

            failedChunks.push(
              chunk
            );

            globalFailed++;
            consecutiveFailures++;

            // Cooldown
            if (
              consecutiveFailures >= 3
            ) {

              console.log(
                "Too many failures. Cooling down for 60s..."
              );

              await sleep(60000);

              consecutiveFailures = 0;
            }
          }
        }

        // Save failed chunks
        if (
          failedChunks.length > 0
        ) {

          saveFailedChunks(
            folder.folder,
            file.name,
            failedChunks
          );

          console.log(
            `Saved failed chunks: ${failedChunks.length}`
          );
        }

        console.log(
          `Finished: ${file.name}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      embedded: globalEmbedded,
      failed: globalFailed,
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