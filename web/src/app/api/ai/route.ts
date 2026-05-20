import { NextResponse } from "next/server";
import { generateText } from "@/services/ai/generate";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const response = await generateText(body.message);

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "AI generation failed",
      },
      {
        status: 500,
      }
    );
  }
}