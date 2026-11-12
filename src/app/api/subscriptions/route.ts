import { NextResponse } from "next/server";
import { SubscriptionService } from "@/modules/subscriptions/subscription.service";
import { SubscriptionSchema } from "@/modules/subscriptions/subscription.schema";

export async function GET() {
  try {
    const subscriptions = SubscriptionService.getAll();
    const stats = SubscriptionService.getStats();
    return NextResponse.json({ success: true, subscriptions, stats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = SubscriptionSchema.parse(body);
    const newSub = SubscriptionService.create({
      ...parsed,
      userId: "", // Set by service to default or session
    });
    return NextResponse.json({ success: true, subscription: newSub }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
