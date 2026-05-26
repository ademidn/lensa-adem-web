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

  ensureDir(DATA_DIR);

  ensureDir(VECTOR_DIR);

  ensureDir(FAILED_DIR);
}

function ensureDir(dir: string) {

  if (!fs.existsSync(dir)) {

    fs.mkdirSync(dir, {
      recursive: true,
    });
  }
}

function sanitizeFileName(
  fileName: string
) {

  return fileName
    .replace(".pdf", "")
    .replace(/[^a-zA-Z0-9-_]/g, "_");
}

function getVectorTypeDir(
  regulationType: string
) {

  const dir =
    path.join(
      VECTOR_DIR,
      regulationType
    );

  ensureDir(dir);

  return dir;
}

function getFailedTypeDir(
  regulationType: string
) {

  const dir =
    path.join(
      FAILED_DIR,
      regulationType
    );

  ensureDir(dir);

  return dir;
}

export function getVectorFilePath(
  regulationType: string,
  fileName: string
) {

  const safeName =
    sanitizeFileName(fileName);

  return path.join(
    getVectorTypeDir(
      regulationType
    ),
    `${safeName}.json`
  );
}

export function getFailedFilePath(
  regulationType: string,
  fileName: string
) {

  const safeName =
    sanitizeFileName(fileName);

  return path.join(
    getFailedTypeDir(
      regulationType
    ),
    `${safeName}.failed.json`
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

  atomicWriteJson(
    filePath,
    documents
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

  try {

    const raw =
      fs.readFileSync(
        filePath,
        "utf-8"
      );

    return JSON.parse(raw);

  } catch (error) {

    console.error(
      "Failed loading vector file:",
      filePath
    );

    return [];
  }
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

  atomicWriteJson(
    filePath,
    chunks
  );
}

export function loadFailedChunks(
  regulationType: string,
  fileName: string
) {

  const filePath =
    getFailedFilePath(
      regulationType,
      fileName
    );

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {

    const raw =
      fs.readFileSync(
        filePath,
        "utf-8"
      );

    return JSON.parse(raw);

  } catch (error) {

    console.error(
      "Failed loading failed chunks:",
      filePath
    );

    return [];
  }
}

function atomicWriteJson(
  filePath: string,
  data: unknown
) {

  const tempPath =
    `${filePath}.tmp`;

  fs.writeFileSync(
    tempPath,
    JSON.stringify(
      data,
      null,
      2
    )
  );

  fs.renameSync(
    tempPath,
    filePath
  );
}