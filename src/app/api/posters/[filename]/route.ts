import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

// Storage directory for posters
const POSTERS_DIR = process.env.POSTERS_STORAGE_PATH || path.join(process.cwd(), "storage", "posters");

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;

    // Security: prevent directory traversal attacks
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    // Construct file path
    const filePath = path.join(POSTERS_DIR, filename);

    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Read file
    const fileBuffer = await readFile(filePath);

    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
    };
    const contentType = contentTypeMap[ext] || "application/octet-stream";

    // Return file with proper headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving poster file:", error);
    return NextResponse.json(
      { error: "Failed to serve file", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
