import { NextResponse } from "next/server";
import { eventManager } from "@/storage/database/eventManager";

export async function GET() {
  try {
    const organizers = await eventManager.getOrganizers();
    return NextResponse.json(organizers);
  } catch (error) {
    console.error("Error fetching organizers:", error);
    return NextResponse.json({ error: "Failed to fetch organizers" }, { status: 500 });
  }
}
