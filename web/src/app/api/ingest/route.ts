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
  generateEmbeddings
} from "@/services/embedding/embed";

import {
  batchArray
} from "@/services/embedding/batch";

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

const BATCH_SIZE = 5;

function sleep(ms: number) {

  return new Promise(
    (resolve) =>
      setTimeout(resolve, ms)
  );
}

async function generateBatchWithRetry(
  texts: string[],
  retries = 3
): Promise<number[][]> {

  for (
    let attempt = 1;
    attempt <= retries;
    attempt++
  ) {

    try {

      return await generateEmbeddings(
        texts
      );

    } catch (error) {

      console.log(
        `Batch embedding failed (attempt ${attempt})`
      );

      if (attempt === retries) {
        throw error;
      }

      const delay =
        attempt * 10000;

      console.log(
        `Retrying batch in ${delay}ms`
      );

      await sleep(delay);
    }
  }

  throw new Error(
    "Batch embedding failed"
  );
}

export async function GET() {

  const startTime =
    Date.now();

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

        // Resume existing vectors
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
              (chunk: any) =>
                chunk.id
            )
          );

        const failedChunks: any[] =
          [];

        // DOWNLOAD PDF
        const pdfBuffer =
          await downloadPdf(
            file.id
          );

        // EXTRACT TEXT
        const text =
          await extractPdfText(
            pdfBuffer
          );

        // CREATE CHUNKS
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

        // SKIP COMPLETED FILE
        if (
          documents.length >=
          chunks.length
        ) {

          console.log(
            `Skipping completed file: ${file.name}`
          );

          continue;
        }

        // FILTER PENDING CHUNKS
        const pendingChunks =
          chunks.filter((chunk) => {

            // Skip embedded
            if (
              existingIds.has(
                chunk.id
              )
            ) {
              return false;
            }

            // Skip permanently failed
            if (
              failedChunkIds.has(
                chunk.id
              )
            ) {
              return false;
            }

            // Skip garbage chunks
            if (
              chunk.content
                .trim()
                .length < 100
            ) {

              console.log(
                `Skipping small chunk: ${chunk.id}`
              );

              return false;
            }

            return true;
          });

        console.log(
          `Pending chunks: ${pendingChunks.length}`
        );

        // CREATE BATCHES
        const batches =
          batchArray(
            pendingChunks,
            BATCH_SIZE
          );

        console.log(
          `Total batches: ${batches.length}`
        );

        let processedChunks = 0;

        for (
          let batchIndex = 0;
          batchIndex < batches.length;
          batchIndex++
        ) {

          const batch =
            batches[batchIndex];

          try {

            const texts =
              batch.map(
                (chunk) =>
                  chunk.content
              );

            // GENERATE EMBEDDINGS
            const embeddings =
              await generateBatchWithRetry(
                texts
              );

            for (
              let i = 0;
              i < batch.length;
              i++
            ) {

              const chunk =
                batch[i];

              const embedding =
                embeddings[i];

              if (!embedding) {

                console.log(
                  `Missing embedding for ${chunk.id}`
                );

                failedChunks.push(
                  chunk
                );

                continue;
              }

              const document = {
                ...chunk,
                embedding,
              };

              documents.push(
                document
              );

              processedChunks++;

              globalEmbedded++;
            }

            // SAVE IMMEDIATELY
            saveVectorFile(
              folder.folder,
              file.name,
              documents
            );

            const progress =
              (
                (
                  processedChunks /
                  pendingChunks.length
                ) * 100
              ).toFixed(1);

            console.log(
              `[${file.name}] Batch ${
                batchIndex + 1
              }/${batches.length}`
            );

            console.log(
              `Progress: ${progress}%`
            );

            console.log(
              `Global embedded: ${globalEmbedded}`
            );

            consecutiveFailures = 0;

            // COOLDOWN BETWEEN BATCHES
            const batchDelay =
              20000 +
              Math.random() * 5000;

            console.log(
              `Cooling down ${Math.round(batchDelay / 1000)}s`
            );

            await sleep(
              batchDelay
            );

          } catch (error) {

            console.log(
              `FAILED batch ${batchIndex + 1}`
            );

            console.error(error);

            failedChunks.push(
              ...batch
            );

            saveFailedChunks(
              folder.folder,
              file.name,
              failedChunks
            );

            globalFailed +=
              batch.length;

            consecutiveFailures++;

            // GLOBAL COOLDOWN
            if (
              consecutiveFailures >= 2
            ) {

              console.log(
                "Too many failures. Cooling down 120s..."
              );

              await sleep(
                120000
              );

              consecutiveFailures = 0;
            }
          }
        }

        // SAVE FAILED CHUNKS
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

        await sleep(60000);
      }
    }

    return NextResponse.json({
      success: true,
      embedded:
        globalEmbedded,
      failed:
        globalFailed,
      duration:
        Date.now() - startTime,
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