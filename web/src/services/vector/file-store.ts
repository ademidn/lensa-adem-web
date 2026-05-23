import fs from "fs";
import path from "path";

import { VectorDocument }
  from "./memory-store";

const DATA_DIR = path.join(
  process.cwd(),
  "data",
  "vectors"
);

export function ensureVectorDirs() {

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
      recursive: true,
    });
  }
}

export function getVectorFilePath(
  regulationType: string,
  fileName: string
) {

  const folderPath = path.join(
    DATA_DIR,
    regulationType
  );

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, {
      recursive: true,
    });
  }

  const cleanName =
    fileName.replace(".pdf", ".json");

  return path.join(
    folderPath,
    cleanName
  );
}

export function vectorFileExists(
  regulationType: string,
  fileName: string
) {

  const filePath = getVectorFilePath(
    regulationType,
    fileName
  );

  return fs.existsSync(filePath);
}

export function saveVectorFile(
  regulationType: string,
  fileName: string,
  documents: VectorDocument[]
) {

  const filePath = getVectorFilePath(
    regulationType,
    fileName
  );

  fs.writeFileSync(
    filePath,
    JSON.stringify(documents, null, 2),
    "utf-8"
  );
}