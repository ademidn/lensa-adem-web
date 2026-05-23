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
  loadFailedChunks,
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
  retries = 3
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

        const failedChunkIds =
          new Set(
            loadFailedChunks(
              folder.folder,
              file.name
            ).map(
              (chunk: any) => chunk.id
            )
          );

        const failedChunks: any[] =
          [];

        // Download PDF
        const pdfBuffer =
          await downloadPdf(file.id);

        // Extract text
        const text =
          await extractPdfText(pdfBuffer);

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

        // FULLY COMPLETED FILE CHECK
        if (
          documents.length >= chunks.length
        ) {

          console.log(
            `Skipping completed file: ${file.name}`
          );

          continue;
        }

        let fileEmbedded = 0;

        let fileFailed = 0;

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

          // Skip permanently failed chunk
          if (
            failedChunkIds.has(
              chunk.id
            )
          ) {

            console.log(
              `Skipping failed chunk: ${chunk.id}`
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

            // Force garbage collection hint
            if (documents.length % 50 === 0) {

              console.log(
                "Checkpoint save completed"
              );
            }

            fileEmbedded++;
            globalEmbedded++;

            consecutiveFailures = 0;

            const progress =
              (
                (fileEmbedded / chunks.length)
                * 100
              ).toFixed(1);

            console.log(
              `[${file.name}] ${progress}% (${fileEmbedded}/${chunks.length})`
            );

            console.log(
              `Global embedded: ${globalEmbedded}`
            );

            // Delay between requests
            const requestDelay =
              15000 + Math.random() * 3000;

            await sleep(requestDelay);

          } catch (error) {

            console.log(
              `FAILED chunk: ${chunk.id}`
            );

            failedChunks.push(
              chunk
            );

            fileFailed++;

            // SAVE FAILED CHUNKS IMMEDIATELY
            saveFailedChunks(
              folder.folder,
              file.name,
              failedChunks
            );

            globalFailed++;
            consecutiveFailures++;

            // Cooldown
            if (
              consecutiveFailures >= 2
            ) {

              console.log(
                "Too many failures. Cooling down for 60s..."
              );

              await sleep(60000);

              consecutiveFailures = 0;
            }

            // Skip problematic file
            if (fileFailed >= 10) {

              console.log(
                `Too many failed chunks for ${file.name}. Skipping remaining chunks.`
              );

              break;
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

        console.log(
          "Cooling down before next file..."
        );

        await sleep(120000);
      }
    }

    return NextResponse.json({
      success: true,
      embedded: globalEmbedded,
      failed: globalFailed,
      duration: Date.now() - startTime,
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