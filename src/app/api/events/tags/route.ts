import { NextResponse } from "next/server";
import { eventManager } from "@/storage/database/eventManager";

export async function GET() {
  try {
    const tags = await eventManager.getTags();
    return NextResponse.json(tags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}
