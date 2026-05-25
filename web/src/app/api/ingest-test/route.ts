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

// ─── TEST CONFIG ──────────────────────────────────────────
// Set this to the exact fileName you want to test.
// Example: "permenLH_75_2019_epr.pdf"
// Leave empty ("") to use the first file found in Drive.
const TEST_FILE_NAME = "permenLH_75_2019_epr.pdf";
// ─────────────────────────────────────────────────────────

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

      const delay = attempt * 10000;

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

  const startTime = Date.now();

  try {

    ensureVectorDirs();

    console.log(
      "\n=============================="
    );

    console.log(
      "TEST INGEST — SINGLE DOCUMENT MODE"
    );

    console.log(
      "=============================="
    );

    // ── STEP 1: Find target file ──
    const folders =
      await listAllRegulationFiles(
        ROOT_FOLDER_ID
      );

    // Flatten all files across folders
    const allFiles: {
      file: { id: string; name: string };
      folder: string;
    }[] = [];

    for (const folder of folders) {
      for (const file of folder.files) {
        if (file.id && file.name) {
          allFiles.push({
            file: {
              id: file.id,
              name: file.name,
            },
            folder: folder.folder,
          });
        }
      }
    }

    if (allFiles.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No files found in Drive",
      });
    }

    // Pick target file
    const target =
      TEST_FILE_NAME
        ? allFiles.find(
            (f) =>
              f.file.name === TEST_FILE_NAME
          )
        : allFiles[0];

    if (!target) {
      return NextResponse.json({
        success: false,
        error: `File not found: ${TEST_FILE_NAME}`,
      });
    }

    const { file, folder } = target;

    console.log(
      `\nTarget file : ${file.name}`
    );

    console.log(
      `Regulation  : ${folder}`
    );

    console.log(
      `File ID     : ${file.id}`
    );

    // ── STEP 2: Load existing vectors ──
    let documents: VectorDocument[] = [];

    if (vectorFileExists(folder, file.name)) {

      documents = loadVectorFile(
        folder,
        file.name
      );

      console.log(
        `\nLoaded existing vectors: ${documents.length}`
      );
    }

    const existingIds = new Set(
      documents.map((d) => d.id)
    );

    const failedChunkIds = new Set(
      loadFailedChunks(folder, file.name)
        .map((chunk: any) => chunk.id)
    );

    const failedChunks: any[] = [];

    // ── STEP 3: Download & extract ──
    console.log("\nDownloading PDF...");

    const pdfBuffer =
      await downloadPdf(file.id);

    console.log("Download success");

    const text =
      await extractPdfText(pdfBuffer);

    console.log(
      `Extracted text length: ${text.length} chars`
    );

    // ── STEP 4: Chunk ──
    const chunks = chunkLegalText({
      text,
      fileId: file.id,
      fileName: file.name,
      regulationType: folder || "unknown",
    });

    console.log(
      `\nTotal chunks     : ${chunks.length}`
    );

    // ── STEP 5: Filter pending chunks ──
    const pendingChunks = chunks.filter(
      (chunk) => {

        if (existingIds.has(chunk.id)) {
          return false;
        }

        if (failedChunkIds.has(chunk.id)) {
          console.log(
            `Skipping failed chunk: ${chunk.id}`
          );
          return false;
        }

        if (chunk.content.trim().length < 100) {
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

    // ── STEP 6: Skip if already complete ──
    if (documents.length >= chunks.length) {
      console.log(
        "\nFile already fully embedded. Skipping."
      );

      return NextResponse.json({
        success: true,
        fileName: file.name,
        status: "already_complete",
        totalChunks: chunks.length,
        embeddedChunks: documents.length,
        duration: Date.now() - startTime,
      });
    }

    // ── STEP 7: Batch embed ──
    const batches = batchArray(
      pendingChunks,
      BATCH_SIZE
    );

    console.log(
      `Total batches    : ${batches.length}`
    );

    let processedChunks = 0;
    let consecutiveFailures = 0;

    for (
      let batchIndex = 0;
      batchIndex < batches.length;
      batchIndex++
    ) {

      const batch = batches[batchIndex];

      console.log(
        `\n── Batch ${batchIndex + 1}/${batches.length} ──`
      );

      console.log(
        `Chunks in batch: ${batch.map((c) => c.id).join(", ")}`
      );

      try {

        const texts = batch.map(
          (chunk) => chunk.content
        );

        const embeddings =
          await generateBatchWithRetry(texts);

        // Validate count match
        console.log(
          `Embeddings received: ${embeddings.length} / ${texts.length}`
        );

        for (let i = 0; i < batch.length; i++) {

          const chunk = batch[i];
          const embedding = embeddings[i];

          if (!embedding) {
            console.log(
              `Missing embedding for ${chunk.id}`
            );
            failedChunks.push(chunk);
            continue;
          }

          documents.push({
            ...chunk,
            embedding,
          });

          processedChunks++;
        }

        // Save after every batch
        saveVectorFile(
          folder,
          file.name,
          documents
        );

        const progress = (
          (processedChunks / pendingChunks.length) *
          100
        ).toFixed(1);

        console.log(
          `Progress : ${progress}% (${processedChunks}/${pendingChunks.length})`
        );

        consecutiveFailures = 0;

        // Cooldown between batches
        if (batchIndex < batches.length - 1) {

          const batchDelay =
            20000 + Math.random() * 5000;

          console.log(
            `Cooling down ${Math.round(batchDelay / 1000)}s before next batch...`
          );

          await sleep(batchDelay);
        }

      } catch (error) {

        console.log(
          `FAILED batch ${batchIndex + 1}`
        );

        console.error(error);

        failedChunks.push(...batch);

        saveFailedChunks(
          folder,
          file.name,
          failedChunks
        );

        consecutiveFailures++;

        if (consecutiveFailures >= 2) {
          console.log(
            "Too many consecutive failures. Aborting test."
          );
          break;
        }

        // Cooldown after failure
        console.log("Cooling down 60s after failure...");
        await sleep(60000);
      }
    }

    // ── STEP 8: Save failed chunks ──
    if (failedChunks.length > 0) {

      saveFailedChunks(
        folder,
        file.name,
        failedChunks
      );

      console.log(
        `\nSaved failed chunks: ${failedChunks.length}`
      );
    }

    const duration = Date.now() - startTime;

    console.log(
      "\n=============================="
    );

    console.log("TEST INGEST COMPLETE");

    console.log(
      `Duration      : ${(duration / 1000).toFixed(1)}s`
    );

    console.log(
      `Embedded      : ${processedChunks}`
    );

    console.log(
      `Failed        : ${failedChunks.length}`
    );

    console.log(
      "=============================="
    );

    // ── STEP 9: Return detailed result ──
    return NextResponse.json({
      success: true,
      fileName: file.name,
      regulationType: folder,
      totalChunks: chunks.length,
      pendingChunks: pendingChunks.length,
      embeddedChunks: processedChunks,
      failedChunks: failedChunks.length,

      // Sample of first 3 chunks for quality inspection
      chunkSample: chunks.slice(0, 3).map((c) => ({
        id: c.id,
        length: c.content.length,
        preview: c.content.slice(0, 200),
        metadata: c.metadata,
      })),

      duration,
    });

  } catch (error: any) {

    console.error(error);

    return NextResponse.json({
      success: false,
      error: error?.message || "Unknown error",
      duration: Date.now() - startTime,
    });
  }
}