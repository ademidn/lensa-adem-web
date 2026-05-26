import fs from "fs";
import path from "path";

export interface VectorDocument {
  id: string;
  content: string;

  metadata: {
    fileId: string;
    fileName: string;
    regulationType: string;
    chunkIndex: number;
  };

  embedding: number[];
}

const STORE_PATH = path.join(
  process.cwd(),
  "data",
  "vector-store.json"
);

let documents: VectorDocument[] = [];

export function loadDocuments() {

  if (!fs.existsSync(STORE_PATH)) {
    documents = [];
    return;
  }

  const raw =
    fs.readFileSync(STORE_PATH, "utf-8");

  documents = JSON.parse(raw);
}

export function saveDocuments() {

  fs.mkdirSync(
    path.dirname(STORE_PATH),
    { recursive: true }
  );

  fs.writeFileSync(
    STORE_PATH,
    JSON.stringify(documents, null, 2)
  );
}

export function addDocuments(
  newDocs: VectorDocument[]
) {

  documents.push(...newDocs);

  saveDocuments();
}

export function getDocuments() {
  return documents;
}

loadDocuments();