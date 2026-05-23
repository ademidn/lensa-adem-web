export interface VectorDocument {
  id: string;

  content: string;

  embedding: number[];

  metadata: {
    fileId: string;
    fileName: string;
    regulationType: string;
    chunkIndex: number;
  };
}

const vectorStore: VectorDocument[] = [];

export function addDocuments(
  documents: VectorDocument[]
) {
  vectorStore.push(...documents);
}

export function getAllDocuments() {
  return vectorStore;
}

export function clearDocuments() {
  vectorStore.length = 0;
}