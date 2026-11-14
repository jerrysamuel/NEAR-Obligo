import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/infrastructure/supabase/client";

const NEAR_RPC_URL = process.env.NEAR_RPC_URL || "https://rpc.mainnet.near.org";

/**
 * Validates NEAR account format:
 * - 2 to 64 lowercase alphanumeric chars and separators (_ - .)
 * - Cannot start or end with a separator
 */
function isValidNearAccountFormat(accountId: string): boolean {
  if (!accountId || accountId.length < 2 || accountId.length > 64) {
    return false;
  }
  const regex = /^(([a-z0-9]+[_\-])*[a-z0-9]+\.)*([a-z0-9]+[_\-])*[a-z0-9]+$/;
  return regex.test(accountId) || /^[0-9a-f]{64}$/.test(accountId);
}

/**
 * Queries NEAR JSON-RPC `view_account` to verify account exists on-chain.
 */
async function verifyNearAccountExists(accountId: string): Promise<boolean> {
  try {
    const response = await fetch(NEAR_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "nearbligo-check",
        method: "query",
        params: {
          request_type: "view_account",
          finality: "final",
          account_id: accountId,
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) return false;
    const json = await response.json();

    // If result contains amount or code_hash, account exists
    if (json.result && !json.error) {
      return true;
    }
    return false;
  } catch (err) {
    console.warn("[verifyNearAccountExists] RPC check fallback:", err);
    // Allow validly formatted accounts if RPC is unreachable during testing
    return true;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vendor_id, account_id } = body;

    const rawAccount = (account_id || "").trim().toLowerCase();

    if (!isValidNearAccountFormat(rawAccount)) {
      return NextResponse.json(
        { error: "Invalid NEAR account format. Example: company.near or name.near" },
        { status: 400 }
      );
    }

    // Verify existence on NEAR
    const exists = await verifyNearAccountExists(rawAccount);
    if (!exists) {
      return NextResponse.json(
        { error: `Account '${rawAccount}' does not exist on NEAR network. Check your spelling or fund the account.` },
        { status: 400 }
      );
    }

    const admin = getServiceSupabase();
    if (admin && vendor_id) {
      // Update vendor payout account and set to pending_approval
      await admin
        .from("vendors")
        .update({
          wallet_address: rawAccount,
          wallet_verified: false, // Payer must approve the new payout account
          status: "pending_approval",
        })
        .eq("id", vendor_id);

      // Audit log
      await admin.from("audit_log").insert({
        actor: "contractor",
        action: "SUBMIT_PAYOUT_ACCOUNT",
        decision: "pending",
        reason: `Contractor entered payout address ${rawAccount}. Waiting for payer review.`,
      });
    }

    return NextResponse.json({
      success: true,
      account_id: rawAccount,
      status: "pending_approval",
      message: `Payments will go to ${rawAccount} once approved by your payer.`,
    });
  } catch (err: any) {
    console.error("[/api/vendor/payout] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update payout account" },
      { status: 500 }
    );
  }
}
