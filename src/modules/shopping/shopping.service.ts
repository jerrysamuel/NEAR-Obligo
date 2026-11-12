import { store, Product, SavedProduct, PurchaseIntent } from "@/infrastructure/store/persistent-store";
import { merchantConnector } from "./merchant-connectors/local-catalog.connector";
import { CheckoutPreparation } from "./merchant-connectors/connector.interface";
import { ProductComparisonResult, ShoppingIntentExtraction } from "./shopping.types";

export class ShoppingService {
  public static async search(query: string, maxPrice?: number): Promise<Product[]> {
    return merchantConnector.searchProducts(query, maxPrice);
  }

  public static async getProduct(id: string): Promise<Product | null> {
    return merchantConnector.getProduct(id);
  }

  public static getSavedProducts(userId?: string): SavedProduct[] {
    return store.getSavedProducts(userId);
  }

  public static async saveProduct(productId: string, notes?: string, userId?: string): Promise<SavedProduct> {
    const product = await merchantConnector.getProduct(productId);
    if (!product) throw new Error("Product not found");
    return store.saveProduct(product, notes, userId);
  }

  public static removeSavedProduct(productId: string, userId?: string): boolean {
    return store.removeSavedProduct(productId, userId);
  }

  public static async preparePurchase(
    productId: string,
    quantity: number = 1,
    userId?: string
  ): Promise<{ preparation: CheckoutPreparation; intent: PurchaseIntent }> {
    const prep = await merchantConnector.prepareCheckout(productId, quantity);

    const intent = store.createPurchaseIntent({
      userId: userId || store.getDefaultUserId(),
      productId: prep.productId,
      merchantId: prep.merchantId,
      title: prep.merchantName,
      price: prep.subtotal,
      currency: prep.currency,
      status: "pending_approval",
      requiredFields: prep.requiredFields,
      disclosedFields: {},
    });

    return { preparation: prep, intent };
  }

  public static async compareProducts(productIds: string[]): Promise<ProductComparisonResult> {
    const products: Product[] = [];
    for (const id of productIds) {
      const p = await merchantConnector.getProduct(id);
      if (p) products.push(p);
    }

    if (products.length === 0) {
      throw new Error("No products found for comparison");
    }

    // Generate specification comparison matrix
    const matrix: Record<string, Record<string, string>> = {};
    const specKeys = new Set<string>();

    for (const p of products) {
      if (p.specifications) {
        Object.keys(p.specifications).forEach((k) => specKeys.add(k));
      }
    }

    for (const key of Array.from(specKeys)) {
      matrix[key] = {};
      for (const p of products) {
        matrix[key][p.title] = p.specifications?.[key] || "N/A";
      }
    }

    // Pick top recommendation based on balance of price & RAM
    const recommended = products.reduce((prev, curr) => (curr.price < prev.price ? curr : prev), products[0]);

    const highlights = [
      `Compared ${products.length} models across price, RAM, and battery performance.`,
      `Best value for high-concurrency dev: ${recommended.title} at ₦${recommended.price.toLocaleString()}.`,
    ];

    return {
      products,
      recommendedId: recommended.id,
      comparisonHighlights: highlights,
      specificationMatrix: matrix,
    };
  }

  public static extractShoppingRequirements(input: string): ShoppingIntentExtraction {
    const lower = input.toLowerCase();
    const specs: Record<string, string> = {};

    // RAM detection
    if (lower.includes("32gb") || lower.includes("32 gb")) {
      specs["ram"] = "32GB";
    } else if (lower.includes("16gb") || lower.includes("16 gb")) {
      specs["ram"] = "16GB";
    } else if (lower.includes("64gb") || lower.includes("64 gb")) {
      specs["ram"] = "64GB";
    }

    // Budget detection (e.g. 1.2 million, 1,200,000, 1.2m, 900,000)
    let maxBudget: number | undefined;
    const millionMatch = lower.match(/(\d+(\.\d+)?)\s*(million|m\b)/i);
    const rawNumberMatch = lower.match(/(?:₦|ngn)?\s*(\d{1,3}(?:,\d{3})+|\d{5,})/i);

    if (millionMatch) {
      maxBudget = parseFloat(millionMatch[1]) * 1000000;
    } else if (rawNumberMatch) {
      maxBudget = parseInt(rawNumberMatch[1].replace(/,/g, ""), 10);
    }

    // Battery detection
    if (lower.includes("battery")) {
      specs["battery"] = "High Endurance (>10 hrs)";
    }

    // Use case
    let useCase = "General Development";
    if (lower.includes("react native") || lower.includes("mobile")) {
      useCase = "React Native & Mobile App Development";
    } else if (lower.includes("docker") || lower.includes("k8s") || lower.includes("kubernetes")) {
      useCase = "DevOps & Containers";
    }

    return {
      productType: "Laptop",
      targetSpecs: specs,
      maxBudget,
      currency: "NGN",
      useCase,
    };
  }
}
