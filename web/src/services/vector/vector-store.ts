// src/services/vector/load-all.ts
//
// Loads all vector JSON files from disk
// into memory. Scans recursively through
// subdirectories so the structure:
//
//   /data/vectors/permen/file.json
//   /data/vectors/uu/file.json
//   /data/vectors/perpres/file.json
//
// is fully covered.
//
// Called once at startup via vector-store.ts
// NOT on every search request.

import fs from "fs";
import path from "path";

import { VectorDocument }
  from "./memory-store";

const VECTOR_DIR = path.join(
  process.cwd(),
  "data",
  "vectors"
);

// ─── Recursive file collector ─────────────────────────────
// Returns all .json file paths under
// a given directory at any depth.
function collectJsonFiles(
  dir: string
): string[] {

  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries =
    fs.readdirSync(dir, {
      withFileTypes: true,
    });

  const filePaths: string[] = [];

  for (const entry of entries) {

    const fullPath =
      path.join(dir, entry.name);

    if (entry.isDirectory()) {

      // Recurse into subdirectory
      filePaths.push(
        ...collectJsonFiles(fullPath)
      );

    } else if (
      entry.isFile() &&
      entry.name.endsWith(".json") &&
      !entry.name.endsWith(".tmp")
    ) {

      filePaths.push(fullPath);
    }
  }

  return filePaths;
}

// ─── Main loader ──────────────────────────────────────────
export function loadAllVectors():
  VectorDocument[] {

  const jsonFiles =
    collectJsonFiles(VECTOR_DIR);

  if (jsonFiles.length === 0) {

    console.warn(
      "loadAllVectors: No vector files found in",
      VECTOR_DIR
    );

    return [];
  }

  const allDocuments: VectorDocument[] =
    [];

  for (const filePath of jsonFiles) {

    try {

      const raw = fs.readFileSync(
        filePath,
        "utf-8"
      );

      const documents =
        JSON.parse(raw) as VectorDocument[];

      if (!Array.isArray(documents)) {

        console.warn(
          `Skipping malformed file: ${filePath}`
        );

        continue;
      }

      allDocuments.push(...documents);

      console.log(
        `Loaded ${documents.length} vectors from ${path.basename(filePath)}`
      );

    } catch (error) {

      // Skip corrupted files without
      // crashing the entire load
      console.error(
        `Failed to load vector file: ${filePath}`,
        error
      );
    }
  }

  console.log(
    `Total vectors loaded: ${allDocuments.length}`
  );

  return allDocuments;
}