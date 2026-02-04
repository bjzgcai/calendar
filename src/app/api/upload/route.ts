import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Feature flag for S3 storage (default: false = use local storage)
const USE_S3_STORAGE = process.env.ENABLE_S3_STORAGE === "true";

// Initialize S3 client (only if S3 is enabled)
let s3Client: S3Client | null = null;
let S3_BUCKET = "";

if (USE_S3_STORAGE) {
  s3Client = new S3Client({
    region: process.env.AWS_S3_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });
  S3_BUCKET = process.env.AWS_S3_BUCKET || "";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = path.extname(file.name);
    const fileNameWithoutExt = path.basename(file.name, fileExtension);
    const uniqueFileName = `${timestamp}_${fileNameWithoutExt}${fileExtension}`;

    let imageUrl: string;
    const fileKey = uniqueFileName;

    if (USE_S3_STORAGE) {
      // ========== AWS S3 Storage ==========
      // Validate AWS configuration
      if (!S3_BUCKET || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.error("S3 storage enabled but missing AWS configuration");
        return NextResponse.json(
          { error: "Server configuration error: AWS S3 not configured properly" },
          { status: 500 }
        );
      }

      if (!s3Client) {
        console.error("S3 client not initialized");
        return NextResponse.json(
          { error: "Server configuration error: S3 client not initialized" },
          { status: 500 }
        );
      }

      // Determine content type
      const contentType = file.type || "application/octet-stream";

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: uniqueFileName,
        Body: buffer,
        ContentType: contentType,
        // Make the file publicly readable
        ACL: "public-read",
      });

      await s3Client.send(command);

      // Construct S3 URL
      const region = process.env.AWS_S3_REGION || "us-east-1";
      imageUrl = `https://${S3_BUCKET}.s3.${region}.amazonaws.com/${uniqueFileName}`;
    } else {
      // ========== Local File Storage (Default) ==========
      // Ensure public/posters directory exists
      const postersDir = path.join(process.cwd(), "public", "posters");
      try {
        await mkdir(postersDir, { recursive: true });
      } catch (error) {
        // Directory might already exist, ignore error
      }

      // Save to public/posters directory
      const publicPath = path.join(postersDir, uniqueFileName);
      await writeFile(publicPath, buffer);

      // Return URL accessible via Next.js static serving
      imageUrl = `/posters/${uniqueFileName}`;
    }

    return NextResponse.json({ imageUrl, fileKey });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      {
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
