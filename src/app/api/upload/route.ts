import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 转换 File 为 Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 生成唯一文件名
    const timestamp = Date.now();
    const fileExtension = path.extname(file.name);
    const fileNameWithoutExt = path.basename(file.name, fileExtension);
    const uniqueFileName = `${timestamp}_${fileNameWithoutExt}${fileExtension}`;

    // 保存到 public/posters 目录
    const publicPath = path.join(process.cwd(), "public", "posters", uniqueFileName);
    await writeFile(publicPath, buffer);

    // 返回可访问的 URL (public 目录下的文件可以直接通过 / 访问)
    const imageUrl = `/posters/${uniqueFileName}`;
    const fileKey = uniqueFileName;

    return NextResponse.json({ imageUrl, fileKey });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
