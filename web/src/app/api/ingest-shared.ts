// Shared logic for both ingest routes.
// ─────────────────────────────────────────────────────────

import { chunkLegalText }
    from "@/services/retrieval/chunk";

import { extractPdfText }
    from "@/services/retrieval/extract";

import { downloadPdf }
    from "@/services/drive/files";

import { generateEmbeddings }
    from "@/services/embedding/embed";

import { batchArray }
    from "@/services/embedding/batch";

import { VectorDocument }
    from "@/services/vector/memory-store";

import {
    saveVectorFile,
    loadVectorFile,
    vectorFileExists,
    saveFailedChunks,
    loadFailedChunks,
} from "@/services/vector/file-store";

// ─── Constants ────────────────────────────────────────────
// BATCH_SIZE controls how many chunks are passed to
// generateEmbeddings per call. Since embed.ts now runs
// sequentially internally, this only affects how often
// we save progress to disk — not API batch behaviour.
export const BATCH_SIZE = 5;

// Cooldown between files (ms) — gives the API breathing
// room when processing multiple documents in sequence.
export const INTER_FILE_DELAY_MS = 5000;

// Max failed batches before skipping to the next file.
export const MAX_FAILED_BATCHES = 3;

// ─── Types ────────────────────────────────────────────────
export interface FileTarget {
    file: { id: string; name: string };
    folder: string;
}

export interface FileResult {
    fileName: string;
    regulationType: string;
    status: "completed" | "partial" | "skipped" | "failed";
    totalChunks: number;
    embeddedChunks: number;
    failedChunks: number;
    durationSeconds: number;
}

// ─── Helpers ──────────────────────────────────────────────
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retries generateEmbeddings up to `retries` times with
// exponential backoff. Throws on final failure.
export async function generateBatchWithRetry(
    texts: string[],
    retries = 3
): Promise<number[][]> {

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await generateEmbeddings(texts);
        } catch (error) {
            console.log(
                `Embedding failed (attempt ${attempt}/${retries})`
            );
            if (attempt === retries) throw error;
            const delay = attempt * 5000;
            console.log(`Retrying in ${delay / 1000}s...`);
            await sleep(delay);
        }
    }

    throw new Error("Embedding failed after all retries");
}

// ─── Core ingest ─────────────────────────────────────────
// Processes a single file: download → extract → chunk →
// embed → save. Returns a FileResult summary.
//
// Skips already-embedded chunks and previously failed ones.
// Saves progress to disk after every successful batch so
// a crash mid-ingestion doesn't lose completed work.
export async function ingestFile(
    target: FileTarget,
    opts: { verbose?: boolean } = {}
): Promise<FileResult> {

    const { file, folder } = target;
    const { verbose = false } = opts;
    const fileStartTime = Date.now();

    const log = (...args: any[]) => console.log(...args);
    const detail = (...args: any[]) =>
        verbose && console.log(...args);

    log(`\n${"─".repeat(50)}`);
    log(`Ingesting: ${file.name} [${folder}]`);

    // ── Load existing state ──────────────────────────────
    let documents: VectorDocument[] = [];

    if (vectorFileExists(folder, file.name)) {
        documents = loadVectorFile(folder, file.name);
        log(`Existing vectors: ${documents.length}`);
    }

    const failedChunks: any[] =
        loadFailedChunks(folder, file.name);

    const existingIds = new Set(documents.map((d) => d.id));
    const failedIds = new Set(failedChunks.map((c: any) => c.id));

    // ── Early skip: already complete ────────────────────
    if (documents.length > 0 && failedChunks.length === 0) {
        log(`Already complete — skipping`);
        return {
            fileName: file.name,
            regulationType: folder,
            status: "skipped",
            totalChunks: documents.length,
            embeddedChunks: documents.length,
            failedChunks: 0,
            durationSeconds: 0,
        };
    }

    // ── Download & extract ───────────────────────────────
    log("Downloading PDF...");
    const pdfBuffer = await downloadPdf(file.id);

    log("Extracting text...");
    const text = await extractPdfText(pdfBuffer);
    detail(`Extracted: ${text.length} chars`);

    // ── Chunk ────────────────────────────────────────────
    const chunks = chunkLegalText({
        text,
        fileId: file.id,
        fileName: file.name,
        regulationType: folder || "unknown",
    });

    log(`Total chunks: ${chunks.length}`);

    // ── Secondary skip: chunk count matches ─────────────
    if (documents.length >= chunks.length) {
        log(`Already complete (chunk count match) — skipping`);
        return {
            fileName: file.name,
            regulationType: folder,
            status: "skipped",
            totalChunks: chunks.length,
            embeddedChunks: documents.length,
            failedChunks: 0,
            durationSeconds: (Date.now() - fileStartTime) / 1000,
        };
    }

    // ── Filter pending chunks ────────────────────────────
    const pendingChunks = chunks.filter((chunk) => {

        if (existingIds.has(chunk.id)) return false;

        if (failedIds.has(chunk.id)) {
            detail(`Skipping failed: ${chunk.id}`);
            return false;
        }

        if (chunk.content.trim().length < 100) {
            detail(`Skipping small: ${chunk.id}`);
            return false;
        }

        return true;
    });

    log(`Pending  : ${pendingChunks.length}`);
    log(`Embedded : ${existingIds.size}`);
    log(`Failed   : ${failedIds.size}`);

    if (pendingChunks.length === 0) {
        log("Nothing to embed");
        return {
            fileName: file.name,
            regulationType: folder,
            status: "skipped",
            totalChunks: chunks.length,
            embeddedChunks: documents.length,
            failedChunks: failedChunks.length,
            durationSeconds: (Date.now() - fileStartTime) / 1000,
        };
    }

    // ── Embed in batches ─────────────────────────────────
    // Batching here controls save frequency, not API calls.
    // generateEmbeddings always runs sequentially internally.
    const batches = batchArray(pendingChunks, BATCH_SIZE);
    log(`Batches: ${batches.length}`);

    let processedChunks = 0;
    let failedBatchCount = 0;

    for (let i = 0; i < batches.length; i++) {

        const batch = batches[i];

        try {
            const texts = batch.map((c) => c.content);
            const embeddings = await generateBatchWithRetry(texts);

            for (let j = 0; j < batch.length; j++) {
                const embedding = embeddings[j];

                if (!embedding) {
                    detail(`Missing embedding: ${batch[j].id}`);
                    failedChunks.push(batch[j]);
                    saveFailedChunks(folder, file.name, failedChunks);
                    continue;
                }

                documents.push({ ...batch[j], embedding });
                processedChunks++;
            }

            // Save progress after every batch
            saveVectorFile(folder, file.name, documents);

            const pct = ((processedChunks / pendingChunks.length) * 100)
                .toFixed(1);

            log(`Batch ${i + 1}/${batches.length} — ${pct}% (${processedChunks}/${pendingChunks.length})`);

        } catch (error) {

            log(`Batch ${i + 1} FAILED`);
            console.error(error);

            failedChunks.push(...batch);
            saveFailedChunks(folder, file.name, failedChunks);

            failedBatchCount++;

            if (failedBatchCount >= MAX_FAILED_BATCHES) {
                log(`Max failed batches reached — stopping file`);
                break;
            }
        }
    }

    const durationSeconds = (Date.now() - fileStartTime) / 1000;
    const status: FileResult["status"] =
        failedChunks.length === 0
            ? "completed"
            : processedChunks > 0
                ? "partial"
                : "failed";

    log(`Done: ${file.name}`);
    log(`Status   : ${status}`);
    log(`Embedded : ${processedChunks}`);
    log(`Failed   : ${failedChunks.length}`);
    log(`Duration : ${durationSeconds.toFixed(1)}s`);

    return {
        fileName: file.name,
        regulationType: folder,
        status,
        totalChunks: chunks.length,
        embeddedChunks: processedChunks,
        failedChunks: failedChunks.length,
        durationSeconds,
    };
}