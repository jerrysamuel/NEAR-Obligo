import { NextResponse } from "next/server";
import { MemoryService } from "@/modules/memory/memory.service";

export async function GET() {
  try {
    const profile = MemoryService.getProfile();
    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const updated = MemoryService.updateProfile(body);
    return NextResponse.json({ success: true, profile: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
