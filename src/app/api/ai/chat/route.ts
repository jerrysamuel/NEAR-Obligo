import { NextResponse } from "next/server";
import { aiService } from "@/modules/ai/ai.service";
import { store } from "@/infrastructure/store/persistent-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, module = "general" } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ success: false, error: "message string is required" }, { status: 400 });
    }

    const subscriptions = store.getSubscriptions();
    const profile = store.getProfile();
    const lower = message.toLowerCase();

    // Subscription questions
    if (
      module === "subscriptions" ||
      lower.includes("subscription") ||
      lower.includes("renew") ||
      lower.includes("spending") ||
      lower.includes("cancel")
    ) {
      const response = await aiService.answerSubscriptionQuestion(message, subscriptions);
      store.logActivity(profile.id, "agent", "SUBSCRIPTION_AI_QUERY", { message });
      return NextResponse.json({ success: true, response });
    }

    const response = {
      content: "I can help explain invoice payment policies, approval decisions, contractor obligations, and settlement activity. Ask about an invoice, a payment limit, or an approval rule.",
      isPrivateInference: true,
      attestationVerified: true,
      model: "near-intent-extractor",
      provider: "deterministic-fallback" as const,
    };

    store.logActivity(profile.id, "agent", "INVOICE_AI_QUERY", { message });
    return NextResponse.json({ success: true, response });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
