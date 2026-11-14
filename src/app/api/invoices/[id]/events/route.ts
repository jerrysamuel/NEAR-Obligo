import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/infrastructure/supabase/client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ events: [] });
  }

  const { data, error } = await admin
    .from("invoice_events")
    .select("id, invoice_id, event_type, status, payload, created_at")
    .eq("invoice_id", params.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data || [] });
}
