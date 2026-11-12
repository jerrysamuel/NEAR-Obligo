import { NextResponse } from "next/server";
import { SuperfluidStreamConnector } from "@/modules/subscriptions/crypto-stream.connector";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address") || undefined;
    const streams = await SuperfluidStreamConnector.discoverStreams(address);
    return NextResponse.json({ success: true, streams });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
