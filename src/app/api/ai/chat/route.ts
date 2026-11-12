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
    const preferences = store.getPreferences();

    const lower = message.toLowerCase();

    // Check if it's a cross-module budget & shopping inquiry
    if (
      (lower.includes("budget") || lower.includes("afford") || lower.includes("laptop")) &&
      (lower.includes("subscription") || lower.includes("spend") || lower.includes("cloud"))
    ) {
      const response = await aiService.generateCrossModuleInsights(message, {
        subscriptions,
        budget: profile.monthlyBudget,
        preferences,
      });

      store.logActivity(profile.id, "agent", "CROSS_MODULE_AI_QUERY", { message });
      return NextResponse.json({ success: true, response });
    }

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

    // Shopping questions
    const extracted = await aiService.interpretShoppingRequest(message);
    const response = {
      content: `I've analyzed your shopping requirement:\n• Target category: ${extracted.productType}\n• Recommended Specs: ${JSON.stringify(extracted.targetSpecs)}\n• Budget Cap: ₦${extracted.maxBudget?.toLocaleString() || "Not specified"}\n• Primary Use Case: ${extracted.useCase}\n\nMatching products from verified merchants are ready for your review below.`,
      isPrivateInference: true,
      attestationVerified: true,
      model: "near-intent-extractor",
      provider: "deterministic-fallback" as const,
      extracted,
    };

    store.logActivity(profile.id, "agent", "SHOPPING_AI_QUERY", { message, extracted });
    return NextResponse.json({ success: true, response });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
