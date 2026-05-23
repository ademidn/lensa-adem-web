import { NextRequest }
  from "next/server";

import {
  searchDocuments
} from "@/services/vector/search";

export async function POST(
  req: NextRequest
) {

  try {

    const body =
      await req.json();

    const query =
      body.query;

    if (!query) {

      return Response.json(
        {
          success: false,
          error: "Query required",
        },
        { status: 400 }
      );
    }

    const results =
      await searchDocuments(
        query,
        5
      );

    return Response.json({
      success: true,
      query,
      results,
    });

  } catch (error: any) {

    console.error(error);

    return Response.json(
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