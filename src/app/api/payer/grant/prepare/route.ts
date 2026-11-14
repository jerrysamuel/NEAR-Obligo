import { NextResponse } from "next/server";
import {
  generateIntent,
  createGrantCredential,
  createIdempotencyKey,
} from "@/lib/agentApi";
import { getServiceSupabase } from "@/infrastructure/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { agent_id, durationDays = 90 } = body;

    const admin = getServiceSupabase();
    const cred = createGrantCredential();
    const expiresAt = new Date(Date.now() + durationDays * 86400000).toISOString();
    const idemKey = createIdempotencyKey();

    const intentPayload = {
      type: "grant_issue",
      agent_id: agent_id || "ag_default",
      label: "Nearbligo Auto-Pay AP Assistant",
      credential: cred.commitment,
      expires_at: expiresAt,
    };

    let result: any;
    try {
      result = await generateIntent(intentPayload, { idempotencyKey: idemKey });
    } catch (apiErr: any) {
      throw new Error(`Payment grant intent unavailable: ${apiErr?.message || "request failed"}`);
    }

    // Securely record encrypted grant token on server (never sent to client)
    if (admin) {
      await admin.from("pending_intents").upsert({
        correlation_id: result.correlation_id,
        kind: "grant_issue",
        payload: {
          token: cred.token,
          expires_at: expiresAt,
          agent_id: agent_id || "ag_default",
        },
      });
    }

    return NextResponse.json({
      correlation_id: result.correlation_id,
      intent: result.intent,
      preview: result.preview,
      expires_at: expiresAt,
    });
  } catch (err: any) {
    console.error("[/api/payer/grant/prepare] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to prepare payment permission" },
      { status: 500 }
    );
  }
}
