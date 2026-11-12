import { NextResponse } from "next/server";
import { SubscriptionInsightsEngine } from "@/modules/subscriptions/subscription-insights";

export async function GET() {
  try {
    const report = SubscriptionInsightsEngine.generateInsights();
    return NextResponse.json({ success: true, insights: report });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
