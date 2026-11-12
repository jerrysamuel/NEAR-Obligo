import { NextResponse } from "next/server";
import { SubscriptionService } from "@/modules/subscriptions/subscription.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get("days") ? Number(searchParams.get("days")) : 30;
    const renewals = SubscriptionService.getUpcomingRenewals(days);
    return NextResponse.json({ success: true, upcomingRenewals: renewals });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
