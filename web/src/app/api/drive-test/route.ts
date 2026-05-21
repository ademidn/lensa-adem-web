import { NextResponse } from "next/server";
import { listRegulationFiles } from "@/services/drive/files";

export async function GET() {
  try {
    const files = await listRegulationFiles(
      "1CH54mJJ2AAy4P4xqjGKIbYpnjpM8Shsl"
    );

    return NextResponse.json({
      success: true,
      data: files,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}