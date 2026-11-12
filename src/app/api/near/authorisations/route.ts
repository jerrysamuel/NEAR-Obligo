import { NextResponse } from "next/server";
import { NearAuthorisationClient } from "@/infrastructure/near/near-client";

export async function GET() {
  try {
    const records = NearAuthorisationClient.getRecords();
    return NextResponse.json({
      success: true,
      records,
      contractId: NearAuthorisationClient.contractId,
      networkId: NearAuthorisationClient.networkId,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { actionType, spendingLimit, currency = "NGN", expirySeconds } = body;

    if (!actionType || spendingLimit === undefined) {
      return NextResponse.json(
        { success: false, error: "actionType and spendingLimit are required" },
        { status: 400 }
      );
    }

    const record = await NearAuthorisationClient.recordPermission({
      actionType,
      spendingLimit: Number(spendingLimit),
      currency,
      expirySeconds: expirySeconds ? Number(expirySeconds) : undefined,
    });

    return NextResponse.json({ success: true, record }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "id parameter is required" }, { status: 400 });
    }
    const success = await NearAuthorisationClient.revokePermission(id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
