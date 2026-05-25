// GET /api/ingest-test
//
// Processes a SINGLE regulation document for testing.
// Set TEST_FILE_NAME to the exact fileName in Drive,
// or leave empty to use the first file found.
//
// Returns a detailed result including a chunk sample
// for quality inspection.
// ─────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

import {
  listAllRegulationFiles,
} from "@/services/drive/files";

import {
  ensureVectorDirs,
} from "@/services/vector/file-store";

import { invalidateCache }
  from "@/services/vector/vector-store";

import {
  ingestFile,
} from "@/app/api/ingest/ingest-shared";

import {
  chunkLegalText,
} from "@/services/retrieval/chunk";

import {
  extractPdfText,
} from "@/services/retrieval/extract";

import {
  downloadPdf,
} from "@/services/drive/files";

// ─── Test config ──────────────────────────────────────────
// Set to the exact fileName you want to test.
// Leave empty ("") to use the first file found in Drive.
const TEST_FILE_NAME = "permenLH_75_2019_epr.pdf";
// ─────────────────────────────────────────────────────────

const ROOT_FOLDER_ID =
  process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;

// ─────────────────────────────────────────────────────────

export async function GET() {

  const startTime = Date.now();

  try {

    ensureVectorDirs();

    // ── Find target file ─────────────────────────────
    const folders =
      await listAllRegulationFiles(ROOT_FOLDER_ID);

    const allFiles: {
      file: { id: string; name: string };
      folder: string;
    }[] = [];

    for (const folder of folders) {
      for (const file of folder.files) {
        if (file.id && file.name) {
          allFiles.push({
            file: { id: file.id, name: file.name },
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

    const target = TEST_FILE_NAME
      ? allFiles.find((f) => f.file.name === TEST_FILE_NAME)
      : allFiles[0];

    if (!target) {
      return NextResponse.json({
        success: false,
        error: `File not found: ${TEST_FILE_NAME}`,
      });
    }

    console.log(`\nTest target: ${target.file.name}`);
    console.log(`Folder     : ${target.folder}`);

    // ── Run ingest with verbose logging ──────────────
    const result = await ingestFile(target, {
      verbose: true,
    });

    invalidateCache();

    // ── Build chunk sample for quality inspection ────
    // Re-extract and chunk to get the sample — this is
    // test-only so the extra processing is acceptable.
    let chunkSample: object[] = [];

    try {
      const pdfBuffer = await downloadPdf(target.file.id);
      const text = await extractPdfText(pdfBuffer);
      const chunks = chunkLegalText({
        text,
        fileId: target.file.id,
        fileName: target.file.name,
        regulationType: target.folder || "unknown",
      });

      chunkSample = chunks.slice(0, 3).map((c) => ({
        id: c.id,
        length: c.content.length,
        preview: c.content.slice(0, 200),
        metadata: c.metadata,
      }));
    } catch {
      // Non-fatal — result is still returned
      console.log("Chunk sample generation failed");
    }

    return NextResponse.json({
      success: true,
      fileName: result.fileName,
      regulationType: result.regulationType,
      status: result.status,
      totalChunks: result.totalChunks,
      embeddedChunks: result.embeddedChunks,
      failedChunks: result.failedChunks,
      durationSeconds: result.durationSeconds,
      chunkSample,
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unknown error",
        durationSeconds: (Date.now() - startTime) / 1000,
      },
      { status: 500 }
    );
  }
}