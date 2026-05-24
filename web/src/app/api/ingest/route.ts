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

// Maximum failed batches before
// skipping to the next file
const MAX_FAILED_BATCHES = 3;

// ─────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(
    (resolve) => setTimeout(resolve, ms)
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

      return await generateEmbeddings(texts);

    } catch (error) {

      console.log(
        `Batch embedding failed (attempt ${attempt})`
      );

      if (attempt === retries) {
        throw error;
      }

      const delay = attempt * 10000;

      console.log(
        `Retrying batch in ${delay}ms`
      );

      await sleep(delay);
    }
  }

  throw new Error("Batch embedding failed");
}

// ─────────────────────────────────────────────────────────

// Per-file result shape for the
// final response summary
interface FileResult {
  fileName: string;
  regulationType: string;
  status:
    | "completed"
    | "partial"
    | "skipped"
    | "failed";
  totalChunks: number;
  embeddedChunks: number;
  failedChunks: number;
  durationSeconds: number;
}

// ─────────────────────────────────────────────────────────

export async function GET() {

  const startTime = Date.now();

  try {

    ensureVectorDirs();

    let globalEmbedded = 0;
    let globalFailed = 0;

    // Collects per-file results for
    // the final JSON response
    const fileResults: FileResult[] = [];

    const folders =
      await listAllRegulationFiles(
        ROOT_FOLDER_ID
      );

    // Flatten folder + file list so we
    // can detect the last file easily
    const allItems: {
      file: { id: string; name: string };
      folder: string;
    }[] = [];

    for (const folder of folders) {
      for (const file of folder.files) {
        if (file.id && file.name) {
          allItems.push({
            file: {
              id: file.id,
              name: file.name,
            },
            folder: folder.folder,
          });
        }
      }
    }

    for (
      let itemIndex = 0;
      itemIndex < allItems.length;
      itemIndex++
    ) {

      const { file, folder } =
        allItems[itemIndex];

      const isLastFile =
        itemIndex === allItems.length - 1;

      const fileStartTime = Date.now();

      console.log(
        "\n=========================="
      );

      console.log("INGESTING:", file.name);

      // ── FIX #1: Load existing vectors ──
      // and failed chunks BEFORE downloading
      // so we can skip completed files early
      let documents: VectorDocument[] = [];

      if (
        vectorFileExists(folder, file.name)
      ) {

        documents = loadVectorFile(
          folder,
          file.name
        );

        console.log(
          `Loaded existing vectors: ${documents.length}`
        );
      }

      // ── FIX #1: Load existing failed chunks
      // into the array so new failures are
      // appended correctly — not duplicated
      const failedChunks: any[] =
        loadFailedChunks(folder, file.name);

      const existingIds = new Set(
        documents.map((d) => d.id)
      );

      const failedChunkIds = new Set(
        failedChunks.map((c: any) => c.id)
      );

      // ── FIX #3: Skip cleanly completed
      // files before downloading the PDF
      if (
        documents.length > 0 &&
        failedChunks.length === 0
      ) {

        console.log(
          `Skipping completed file: ${file.name}`
        );

        fileResults.push({
          fileName: file.name,
          regulationType: folder,
          status: "skipped",
          totalChunks: documents.length,
          embeddedChunks: documents.length,
          failedChunks: 0,
          durationSeconds: 0,
        });

        continue;
      }

      // ── DOWNLOAD PDF ──
      const pdfBuffer =
        await downloadPdf(file.id);

      // ── EXTRACT TEXT ──
      const text =
        await extractPdfText(pdfBuffer);

      // ── CREATE CHUNKS ──
      const chunks = chunkLegalText({
        text,
        fileId: file.id,
        fileName: file.name,
        regulationType: folder || "unknown",
      });

      console.log(
        `Total chunks: ${chunks.length}`
      );

      // ── FIX #3: Secondary completion check
      // now that we know total chunk count
      if (documents.length >= chunks.length) {

        console.log(
          `Skipping completed file: ${file.name}`
        );

        fileResults.push({
          fileName: file.name,
          regulationType: folder,
          status: "skipped",
          totalChunks: chunks.length,
          embeddedChunks: documents.length,
          failedChunks: 0,
          durationSeconds:
            (Date.now() - fileStartTime) / 1000,
        });

        continue;
      }

      // ── FILTER PENDING CHUNKS ──
      const pendingChunks = chunks.filter(
        (chunk) => {

          // Already embedded
          if (existingIds.has(chunk.id)) {
            return false;
          }

          // Previously failed — skip to
          // avoid infinite retry loops
          if (failedChunkIds.has(chunk.id)) {
            console.log(
              `Skipping failed chunk: ${chunk.id}`
            );
            return false;
          }

          // Too small to embed meaningfully
          if (
            chunk.content.trim().length < 100
          ) {
            console.log(
              `Skipping small chunk: ${chunk.id}`
            );
            return false;
          }

          return true;
        }
      );

      console.log(
        `Pending chunks   : ${pendingChunks.length}`
      );

      console.log(
        `Already embedded : ${existingIds.size}`
      );

      console.log(
        `Previously failed: ${failedChunkIds.size}`
      );

      // ── FIX #6: Guard empty batch list ──
      const batches = batchArray(
        pendingChunks,
        BATCH_SIZE
      );

      if (batches.length === 0) {

        console.log(
          `No batches to process for ${file.name}`
        );

        continue;
      }

      console.log(
        `Total batches: ${batches.length}`
      );

      let processedChunks = 0;
      let consecutiveFailures = 0;

      // ── FIX #4: Per-file failed batch counter
      let failedBatchCount = 0;

      for (
        let batchIndex = 0;
        batchIndex < batches.length;
        batchIndex++
      ) {

        const batch = batches[batchIndex];

        try {

          const texts = batch.map(
            (chunk) => chunk.content
          );

          // ── GENERATE EMBEDDINGS ──
          const embeddings =
            await generateBatchWithRetry(texts);

          for (
            let i = 0;
            i < batch.length;
            i++
          ) {

            const chunk = batch[i];
            const embedding = embeddings[i];

            // ── FIX #2: Save missing embeddings
            // to disk immediately so they are
            // not lost on crash or restart
            if (!embedding) {

              console.log(
                `Missing embedding for ${chunk.id}`
              );

              failedChunks.push(chunk);

              saveFailedChunks(
                folder,
                file.name,
                failedChunks
              );

              globalFailed++;
              continue;
            }

            documents.push({
              ...chunk,
              embedding,
            });

            processedChunks++;
            globalEmbedded++;
          }

          // Save after every successful batch
          saveVectorFile(
            folder,
            file.name,
            documents
          );

          const progress = (
            (processedChunks /
              pendingChunks.length) *
            100
          ).toFixed(1);

          console.log(
            `[${file.name}] Batch ${batchIndex + 1}/${batches.length}`
          );

          console.log(
            `Progress       : ${progress}%`
          );

          console.log(
            `Global embedded: ${globalEmbedded}`
          );

          consecutiveFailures = 0;

          // Cooldown between batches
          // (skip after last batch)
          if (
            batchIndex < batches.length - 1
          ) {

            const batchDelay =
              20000 + Math.random() * 5000;

            console.log(
              `Cooling down ${Math.round(
                batchDelay / 1000
              )}s before next batch...`
            );

            await sleep(batchDelay);
          }

        } catch (error) {

          console.log(
            `FAILED batch ${batchIndex + 1}`
          );

          console.error(error);

          // ── FIX #1: Push to the already-loaded
          // failedChunks array so saves are
          // cumulative, not duplicated
          failedChunks.push(...batch);

          saveFailedChunks(
            folder,
            file.name,
            failedChunks
          );

          globalFailed += batch.length;
          consecutiveFailures++;

          // ── FIX #4: Stop processing this file
          // if too many batches have failed
          failedBatchCount++;

          if (
            failedBatchCount >= MAX_FAILED_BATCHES
          ) {

            console.log(
              `Max failed batches reached for ${file.name}. Moving to next file.`
            );

            break;
          }

          // Global cooldown on consecutive failures
          if (consecutiveFailures >= 2) {

            console.log(
              "Too many failures. Cooling down 120s..."
            );

            await sleep(120000);

            consecutiveFailures = 0;
          }
        }
      }

      // ── FIX #5: Per-file duration ──
      const fileDuration =
        (Date.now() - fileStartTime) / 1000;

      const fileStatus: FileResult["status"] =
        failedChunks.length === 0
          ? "completed"
          : processedChunks > 0
          ? "partial"
          : "failed";

      fileResults.push({
        fileName: file.name,
        regulationType: folder,
        status: fileStatus,
        totalChunks: chunks.length,
        embeddedChunks: processedChunks,
        failedChunks: failedChunks.length,
        durationSeconds: fileDuration,
      });

      console.log(`Finished   : ${file.name}`);

      console.log(
        `Duration   : ${fileDuration.toFixed(1)}s`
      );

      console.log(
        `Embedded   : ${processedChunks}`
      );

      console.log(
        `Failed     : ${failedChunks.length}`
      );

      // ── FIX #7: Skip cooldown after last file
      if (!isLastFile) {

        console.log(
          "Cooling down 60s before next file..."
        );

        await sleep(60000);
      }
    }

    // ── FINAL SUMMARY ──
    const totalDuration =
      (Date.now() - startTime) / 1000;

    console.log(
      "\n=============================="
    );

    console.log("INGESTION COMPLETE");

    console.log(
      `Total duration : ${totalDuration.toFixed(1)}s`
    );

    console.log(
      `Total embedded : ${globalEmbedded}`
    );

    console.log(
      `Total failed   : ${globalFailed}`
    );

    console.log(
      "=============================="
    );

    // ── FIX #8: Per-file summary in response
    return NextResponse.json({
      success: true,
      totalEmbedded: globalEmbedded,
      totalFailed: globalFailed,
      durationSeconds: totalDuration,
      files: fileResults,
    });

  } catch (error: any) {

    console.error(error);

    return NextResponse.json({
      success: false,
      error: error?.message || "Unknown error",
      durationSeconds:
        (Date.now() - startTime) / 1000,
    });
  }
}