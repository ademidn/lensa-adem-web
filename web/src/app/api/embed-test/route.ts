import { NextResponse } from "next/server";

import { generateEmbedding } from "@/services/embedding/embed";

export async function GET() {
  try {
    const embedding =
      await generateEmbedding(
        "Apa itu AMDAL?"
      );

    return NextResponse.json({
      success: true,
      dimensions: embedding.length,
      preview: embedding.slice(0, 10),
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
      {
        status: 500,
      }
    );
  }
}