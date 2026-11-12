import { NextResponse } from "next/server";
import { PermissionService } from "@/modules/privacy/permission.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipient, fields } = body;
    if (!recipient || !fields || !Array.isArray(fields)) {
      return NextResponse.json(
        { success: false, error: "recipient and fields array are required" },
        { status: 400 }
      );
    }
    const evaluation = PermissionService.check(recipient, fields);
    return NextResponse.json({ success: true, evaluation });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
