import { Subscription, ShoppingPreference } from "@/infrastructure/store/persistent-store";

export interface AIResponse {
  content: string;
  isPrivateInference: boolean;
  attestationVerified: boolean;
  model: string;
  provider: "near-ai-cloud" | "deterministic-fallback";
}

export interface AIService {
  answerSubscriptionQuestion(question: string, subscriptions: Subscription[]): Promise<AIResponse>;
  generateCrossModuleInsights(
    query: string,
    context: {
      subscriptions: Subscription[];
      budget: number;
      preferences: ShoppingPreference;
    }
  ): Promise<AIResponse>;
}
