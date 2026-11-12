import { Product, SavedProduct, PurchaseIntent } from "@/infrastructure/store/persistent-store";
import { CheckoutPreparation } from "./merchant-connectors/connector.interface";

export type { Product, SavedProduct, PurchaseIntent, CheckoutPreparation };

export interface ProductComparisonResult {
  products: Product[];
  recommendedId: string;
  comparisonHighlights: string[];
  specificationMatrix: Record<string, Record<string, string>>;
}

export interface ShoppingIntentExtraction {
  productType: string;
  targetSpecs: Record<string, string>;
  maxBudget?: number;
  currency: string;
  useCase?: string;
}
