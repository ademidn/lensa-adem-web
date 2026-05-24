// src/app/api/search-test/route.ts
//
// Test version of the search route.
// Designed for Postman — accepts POST
// with JSON body, returns extended
// debug info for retrieval inspection.
//
// Example Postman body:
// {
//   "query": "kewajiban produsen sampah",
//   "topK": 5,                            // opsional
//   "regulationType": "permen"            // opsional
// }

import { NextRequest, NextResponse }
    from "next/server";

import {
    searchDocuments
} from "@/services/vector/search";

const MAX_TOP_K = 20;
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

        // ── Configurable topK with cap ──
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

        console.log(
            "\n=============================="
        );

        console.log(
            `SEARCH TEST: "${query}"`
        );

        console.log(
            `topK           : ${topK}`
        );

        console.log(
            `regulationType : ${regulationType ?? "all"}`
        );

        console.log(
            "=============================="
        );

        // ── Execute search ──
        const results = await searchDocuments(
            query,
            topK,
            regulationType
        );

        const durationMs =
            Date.now() - startTime;

        // ── Log result summary to console ──
        console.log(
            `Results found : ${results.length}`
        );

        console.log(
            `Duration      : ${durationMs}ms`
        );

        results.forEach((result, index) => {

            console.log(
                `\n[${index + 1}] Score   : ${result.score?.toFixed(4)}`
            );

            console.log(
                `     File    : ${result.metadata?.fileName}`
            );

            console.log(
                `     Type    : ${result.metadata?.regulationType}`
            );

            console.log(
                `     Article : ${result.metadata?.article ?? "unknown"}`
            );

            console.log(
                `     Preview : ${result.content?.slice(0, 150)}...`
            );
        });

        // ── Return extended debug response ──
        return NextResponse.json({
            success: true,
            query,
            topK,
            regulationType: regulationType ?? "all",
            totalResults: results.length,
            durationMs,

            results: results.map(
                (result, index) => ({

                    // Position in ranked results
                    rank: index + 1,

                    id: result.id,

                    // Similarity score from
                    // cosine search — higher is better
                    score: result.score,

                    // Metadata breakdown for
                    // easy inspection in Postman
                    fileName:
                        result.metadata?.fileName,
                    regulationType:
                        result.metadata?.regulationType,
                    article:
                        result.metadata?.article,
                    section:
                        result.metadata?.section,
                    chunkIndex:
                        result.metadata?.chunkIndex,

                    // Content fields
                    contentLength:
                        result.content?.length,

                    // Short preview for quick scanning
                    preview:
                        result.content?.slice(0, 300),

                    // Full content for deep inspection
                    fullContent: result.content,
                })
            ),
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