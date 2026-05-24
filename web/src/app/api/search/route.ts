import { NextRequest, NextResponse }
  from "next/server";
 
import {
  searchDocuments
} from "@/services/vector/search";
 
// Maximum results the caller can request
const MAX_TOP_K = 20;
 
// Default results if not specified
const DEFAULT_TOP_K = 5;
 
// Maximum allowed query length in characters
const MAX_QUERY_LENGTH = 1000;
 
// Minimum meaningful query length
const MIN_QUERY_LENGTH = 3;
 
export async function POST(
  req: NextRequest
) {
 
  const startTime = Date.now();
 
  try {
 
    const body = await req.json();
 
    // ── FIX #1 + #2: Sanitize and validate query ──
    const rawQuery = body.query;
 
    if (!rawQuery || typeof rawQuery !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Query is required and must be a string",
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
 
    // ── FIX #3: Configurable topK with cap ──
    const requestedTopK =
      typeof body.topK === "number"
        ? body.topK
        : DEFAULT_TOP_K;
 
    const topK = Math.min(
      Math.max(1, requestedTopK),
      MAX_TOP_K
    );
 
    // ── FIX #4: Optional regulation type filter ──
    const regulationType =
      typeof body.regulationType === "string"
        ? body.regulationType.trim().toLowerCase()
        : undefined;
 
    // ── SEARCH ──
    const results = await searchDocuments(
      query,
      topK,
      regulationType
    );
 
    const durationMs = Date.now() - startTime;
 
    // ── FIX #5: Enriched response metadata ──
    return NextResponse.json({
      success: true,
      query,
      topK,
      regulationType: regulationType ?? "all",
      totalResults: results.length,
      durationMs,
      results,
    });
 
  } catch (error: any) {
 
    console.error(error);
 
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unknown error",
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}