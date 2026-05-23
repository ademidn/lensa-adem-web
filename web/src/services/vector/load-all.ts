import fs from "fs";
import path from "path";

import { VectorDocument }
  from "./memory-store";

const VECTOR_DIR =
  path.join(
    process.cwd(),
    "data",
    "vectors"
  );

export function loadAllVectors():
  VectorDocument[] {

  if (!fs.existsSync(VECTOR_DIR)) {
    return [];
  }

  const files =
    fs.readdirSync(VECTOR_DIR);

  const documents:
    VectorDocument[] = [];

  for (const file of files) {

    if (!file.endsWith(".json")) {
      continue;
    }

    const filePath =
      path.join(VECTOR_DIR, file);

    const raw =
      fs.readFileSync(
        filePath,
        "utf-8"
      );

    const parsed =
      JSON.parse(raw);

    documents.push(...parsed);
  }

  return documents;
}