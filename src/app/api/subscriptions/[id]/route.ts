import { NextResponse } from "next/server";
import { SubscriptionService } from "@/modules/subscriptions/subscription.service";
import { SubscriptionUpdateSchema } from "@/modules/subscriptions/subscription.schema";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sub = SubscriptionService.getById(params.id);
    if (!sub) {
      return NextResponse.json({ success: false, error: "Subscription not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, subscription: sub });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = SubscriptionUpdateSchema.parse(body);
    const updated = SubscriptionService.update(params.id, parsed);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Subscription not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, subscription: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const deleted = SubscriptionService.delete(params.id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Subscription not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
