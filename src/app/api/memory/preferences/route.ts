import { NextResponse } from "next/server";
import { MemoryService } from "@/modules/memory/memory.service";

export async function GET() {
  try {
    const preferences = MemoryService.getPreferences();
    return NextResponse.json({ success: true, preferences });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const updated = MemoryService.updatePreferences(body);
    return NextResponse.json({ success: true, preferences: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
