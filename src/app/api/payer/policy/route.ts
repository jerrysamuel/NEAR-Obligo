import { NextRequest, NextResponse } from "next/server";
import { SpendingPolicyEngine } from "@/modules/policy/policy-engine";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") || "usr_default";
    return NextResponse.json({ success: true, policy: SpendingPolicyEngine.getPolicy(userId) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId || "usr_default";
    const policy = await SpendingPolicyEngine.updatePolicy(userId, body);
    return NextResponse.json({ success: true, policy });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
