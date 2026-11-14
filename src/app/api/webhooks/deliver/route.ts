import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/infrastructure/supabase/client";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = getServiceSupabase();
  if (!admin) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { data: deliveries } = await admin
    .from("webhook_deliveries")
    .select("id, endpoint, attempts, event:invoice_events(id, invoice_id, event_type, status, payload, created_at)")
    .eq("status", "pending")
    .lt("attempts", 5)
    .order("created_at", { ascending: true })
    .limit(25);

  let delivered = 0;
  for (const delivery of deliveries || []) {
    const payload = JSON.stringify(delivery.event);
    const signature = process.env.NEARBLIGO_WEBHOOK_SECRET
      ? crypto.createHmac("sha256", process.env.NEARBLIGO_WEBHOOK_SECRET).update(payload).digest("hex")
      : "";
    try {
      const response = await fetch(delivery.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", "x-obligo-signature": `sha256=${signature}` },
        body: payload,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await admin.from("webhook_deliveries").update({ status: "delivered", attempts: (delivery.attempts || 0) + 1, delivered_at: new Date().toISOString(), last_error: null }).eq("id", delivery.id);
      delivered++;
    } catch (error: any) {
      await admin.from("webhook_deliveries").update({ status: (delivery.attempts || 0) + 1 >= 5 ? "failed" : "pending", attempts: (delivery.attempts || 0) + 1, last_error: error.message }).eq("id", delivery.id);
    }
  }
  return NextResponse.json({ processed: deliveries?.length || 0, delivered });
}
