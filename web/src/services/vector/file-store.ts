import fs from "fs";
import path from "path";

import { VectorDocument }
  from "./memory-store";

const DATA_DIR =
  path.join(process.cwd(), "data");

const VECTOR_DIR =
  path.join(DATA_DIR, "vectors");

const FAILED_DIR =
  path.join(DATA_DIR, "failed");

export function ensureVectorDirs() {

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
  }

  if (!fs.existsSync(VECTOR_DIR)) {
    fs.mkdirSync(VECTOR_DIR);
  }

  if (!fs.existsSync(FAILED_DIR)) {
    fs.mkdirSync(FAILED_DIR);
  }
}

function sanitizeFileName(
  fileName: string
) {
  return fileName
    .replace(".pdf", "")
    .replace(/[^a-zA-Z0-9-_]/g, "_");
}

export function getVectorFilePath(
  regulationType: string,
  fileName: string
) {

  const safeName =
    sanitizeFileName(fileName);

  return path.join(
    VECTOR_DIR,
    `${regulationType}_${safeName}.json`
  );
}

export function getFailedFilePath(
  regulationType: string,
  fileName: string
) {

  const safeName =
    sanitizeFileName(fileName);

  return path.join(
    FAILED_DIR,
    `${regulationType}_${safeName}.failed.json`
  );
}

export function vectorFileExists(
  regulationType: string,
  fileName: string
) {

  return fs.existsSync(
    getVectorFilePath(
      regulationType,
      fileName
    )
  );
}

export function saveVectorFile(
  regulationType: string,
  fileName: string,
  documents: VectorDocument[]
) {

  const filePath =
    getVectorFilePath(
      regulationType,
      fileName
    );

  fs.writeFileSync(
    filePath,
    JSON.stringify(
      documents,
      null,
      2
    )
  );
}

export function loadVectorFile(
  regulationType: string,
  fileName: string
): VectorDocument[] {

  const filePath =
    getVectorFilePath(
      regulationType,
      fileName
    );

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const raw =
    fs.readFileSync(
      filePath,
      "utf-8"
    );

  return JSON.parse(raw);
}

export function saveFailedChunks(
  regulationType: string,
  fileName: string,
  chunks: any[]
) {

  const filePath =
    getFailedFilePath(
      regulationType,
      fileName
    );

  fs.writeFileSync(
    filePath,
    JSON.stringify(
      chunks,
      null,
      2
    )
  );
}