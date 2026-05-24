// Main end-to-end RAG endpoint.
// Accepts a user query, retrieves relevant
// regulation chunks, generates a grounded
// answer with citations, and returns both.
//
// Postman body:
// {
//   "query": "Mengapa produsen wajib mengelola sampahnya?",
//   "topK": 5,                 // optional, default 5
//   "regulationType": "permen" // optional, default all
// }
// ─────────────────────────────────────────────────────────
 
import { NextRequest, NextResponse }
  from "next/server";
 
import {
  searchDocuments
} from "@/services/vector/search";
 
import {
  generateAnswer
} from "@/services/answer/generate";
 
const MAX_TOP_K = 10;
const DEFAULT_TOP_K = 5;
const MAX_QUERY_LENGTH = 1000;
const MIN_QUERY_LENGTH = 3;
 
export async function POST(
  req: NextRequest
) {
 
  const startTime = Date.now();
 
  try {
 
    const body = await req.json();
 
    // ── Validate query ──
    const rawQuery = body.query;
 
    if (
      !rawQuery ||
      typeof rawQuery !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Query is required and must be a string",
        },
        { status: 400 }
      );
    }
 
    const query = rawQuery.trim();
 
    if (query.length < MIN_QUERY_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `Query must be at least ${MIN_QUERY_LENGTH} characters`,
        },
        { status: 400 }
      );
    }
 
    if (query.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `Query must not exceed ${MAX_QUERY_LENGTH} characters`,
        },
        { status: 400 }
      );
    }
 
    // ── Configurable topK ──
    const requestedTopK =
      typeof body.topK === "number"
        ? body.topK
        : DEFAULT_TOP_K;
 
    const topK = Math.min(
      Math.max(1, requestedTopK),
      MAX_TOP_K
    );
 
    // ── Optional regulation type filter ──
    const regulationType =
      typeof body.regulationType === "string"
        ? body.regulationType.trim().toLowerCase()
        : undefined;
 
    // ── Step 1: Retrieve relevant chunks ──
    const retrievalStart = Date.now();
 
    const chunks = await searchDocuments(
      query,
      topK,
      regulationType
    );
 
    const retrievalMs =
      Date.now() - retrievalStart;
 
    // ── Step 2: Generate grounded answer ──
    const generationStart = Date.now();
 
    const result = await generateAnswer(
      query,
      chunks
    );
 
    const generationMs =
      Date.now() - generationStart;
 
    const totalMs = Date.now() - startTime;
 
    // ── Return full response ──
    return NextResponse.json({
      success: true,
 
      // The generated answer
      answer: result.answer,
 
      // Source citations for the answer
      citations: result.citations,
 
      // Pipeline metadata
      meta: {
        query,
        topK,
        regulationType: regulationType ?? "all",
        totalChunksUsed: result.totalChunksUsed,
        model: result.model,
        timing: {
          retrievalMs,
          generationMs,
          totalMs,
        },
      },
    });
 
  } catch (error: any) {
 
    console.error(error);
 
    return NextResponse.json(
      {
        success: false,
        error:
          error?.message || "Unknown error",
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}