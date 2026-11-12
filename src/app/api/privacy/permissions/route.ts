import { NextResponse } from "next/server";
import { PermissionService } from "@/modules/privacy/permission.service";

export async function GET() {
  try {
    const permissions = PermissionService.getAll();
    return NextResponse.json({ success: true, permissions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipient, purpose, permittedFields, expiresInHours } = body;
    if (!recipient || !permittedFields) {
      return NextResponse.json(
        { success: false, error: "recipient and permittedFields are required" },
        { status: 400 }
      );
    }
    const perm = PermissionService.grant({
      recipient,
      purpose: purpose || "Merchant checkout and delivery verification",
      requestedFields: permittedFields,
      expiresInHours: expiresInHours || 168,
    });
    return NextResponse.json({ success: true, permission: perm }, { status: 201 });
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
    const success = PermissionService.revoke(id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
