// GET /api/ingest
//
// Processes ALL regulation documents in Google Drive.
// Skips files that are already fully embedded.
// Saves progress per-file so crashes don't lose work.
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
  sleep,
  INTER_FILE_DELAY_MS,
  FileResult,
} from "./ingest-shared";

// ─────────────────────────────────────────────────────────

const ROOT_FOLDER_ID =
  process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;

// ─────────────────────────────────────────────────────────

function authorize(req: NextRequest):
  NextResponse | null {

    const secret = 
      req.headers.get("x-ingest-secret");
    
    if (
      !process.env.INGEST_SECRET ||
      secret !== process.env.INGEST_SECRET
    ) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    return null; // authorized
  }

// ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {

  const authError = authorize(req);
  if (authError) return authError;

  const startTime = Date.now();

  try {

    ensureVectorDirs();

    const folders =
      await listAllRegulationFiles(ROOT_FOLDER_ID);

    // Flatten all files across all folders
    const allItems: {
      file: { id: string; name: string };
      folder: string;
    }[] = [];

    for (const folder of folders) {
      for (const file of folder.files) {
        if (file.id && file.name) {
          allItems.push({
            file: { id: file.id, name: file.name },
            folder: folder.folder,
          });
        }
      }
    }

    console.log(`\nFiles found: ${allItems.length}`);

    if (allItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No files found in Drive",
      });
    }

    const fileResults: FileResult[] = [];
    let globalEmbedded = 0;
    let globalFailed   = 0;

    for (let i = 0; i < allItems.length; i++) {

      const result = await ingestFile(allItems[i]);

      fileResults.push(result);
      globalEmbedded += result.embeddedChunks;
      globalFailed   += result.failedChunks;

      // Cooldown between files — skip after the last one
      if (i < allItems.length - 1) {
        console.log(
          `Cooling down ${INTER_FILE_DELAY_MS / 1000}s before next file...`
        );
        await sleep(INTER_FILE_DELAY_MS);
      }
    }

    // Invalidate cache so new vectors are picked up
    // immediately without restarting the server
    invalidateCache();

    const totalDuration =
      (Date.now() - startTime) / 1000;

    console.log(`\n${"=".repeat(50)}`);
    console.log("INGESTION COMPLETE");
    console.log(`Total duration : ${totalDuration.toFixed(1)}s`);
    console.log(`Total embedded : ${globalEmbedded}`);
    console.log(`Total failed   : ${globalFailed}`);
    console.log(`${"=".repeat(50)}`);

    return NextResponse.json({
      success:        true,
      totalEmbedded:  globalEmbedded,
      totalFailed:    globalFailed,
      durationSeconds: totalDuration,
      files:          fileResults,
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