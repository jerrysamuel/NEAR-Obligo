import { Product } from "@/infrastructure/store/persistent-store";

export interface CheckoutPreparation {
  productId: string;
  merchantId: string;
  merchantName: string;
  quantity: number;
  subtotal: number;
  currency: string;
  requiredFields: string[];
  checkoutHandoffUrl: string;
  disclosureNotice: string;
}

export interface MerchantConnector {
  id: string;
  name: string;
  searchProducts(query: string, maxPrice?: number): Promise<Product[]>;
  getProduct(productId: string): Promise<Product | null>;
  prepareCheckout(productId: string, quantity: number): Promise<CheckoutPreparation>;
}
