// src/app/api/debug/route.ts
//
// Debug endpoint to verify the vector store
// is loaded correctly before running searches.
//
// Usage: GET http://localhost:3000/api/debug
//
// Returns store stats, sample documents,
// and a list of all loaded regulation files.
// Remove or protect this route before
// deploying to production.

import { NextResponse }
  from "next/server";

import {
  getAllDocuments,
  getStoreStats,
} from "@/services/vector/vector-store";

export async function GET() {

  try {

    const stats = getStoreStats();

    const docs = getAllDocuments();

    // Collect unique file names
    const loadedFiles = [
      ...new Set(
        docs.map(
          (d) => d.metadata.fileName
        )
      ),
    ];

    // Sample first 3 documents
    const sample = docs
      .slice(0, 3)
      .map((d) => ({
        id: d.id,
        fileName: d.metadata.fileName,
        regulationType:
          d.metadata.regulationType,
        chunkIndex: d.metadata.chunkIndex,
        contentPreview:
          d.content.slice(0, 150),
        embeddingDimensions:
          d.embedding.length,
      }));

    return NextResponse.json({
      success: true,
      stats,
      loadedFiles,
      sample,
    });

  } catch (error: any) {

    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unknown error",
      },
      { status: 500 }
    );
  }
}