import { Product } from "@/infrastructure/store/persistent-store";
import { MerchantConnector, CheckoutPreparation } from "./connector.interface";

const MOCK_MERCHANT_CATALOG: Product[] = [
  {
    id: "prod_dell_xps_15",
    merchantId: "slot_systems",
    externalId: "SLOT-XPS-9530",
    title: "Dell XPS 15 9530 (Intel Core i7-13700H, 32GB DDR5, 1TB SSD, RTX 4050)",
    description: "15.6\" FHD+ 500 nits, 86Wh battery, high thermal ceiling. Ideal for heavy mobile and React Native compilation.",
    price: 1195000,
    currency: "NGN",
    imageUrl: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&auto=format&fit=crop&q=60",
    productUrl: "https://slot.ng/dell-xps-15-32gb-1tb",
    availability: "In Stock (Lagos & Abuja Hubs)",
    specifications: {
      RAM: "32GB DDR5 4800MHz",
      Storage: "1TB PCIe NVMe SSD",
      Processor: "Intel Core i7-13700H (14 cores, up to 5.0GHz)",
      Battery: "86Wh (10.5 hrs estimated runtime)",
      Display: "15.6 inch FHD+ InfinityEdge (1920x1200)",
      Weight: "1.86 kg",
    },
    lastVerifiedAt: new Date().toISOString(),
  },
  {
    id: "prod_thinkpad_t14_gen4",
    merchantId: "konga_tech",
    externalId: "KGA-TP-T14G4",
    title: "Lenovo ThinkPad T14 Gen 4 (AMD Ryzen 7 PRO 7840U, 32GB LPDDR5X, 1TB SSD)",
    description: "Legendary ThinkPad keyboard, military-grade durability, exceptional battery efficiency for Linux & mobile coders.",
    price: 1140000,
    currency: "NGN",
    imageUrl: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=60",
    productUrl: "https://konga.com/product/lenovo-thinkpad-t14-gen4-32gb",
    availability: "In Stock",
    specifications: {
      RAM: "32GB LPDDR5X 6400MHz",
      Storage: "1TB SSD M.2 2280",
      Processor: "AMD Ryzen 7 PRO 7840U (8 cores / 16 threads)",
      Battery: "52.5Wh (12+ hrs developer runtime)",
      Display: "14 inch WUXGA IPS Low Power 400 nits",
      Weight: "1.37 kg",
    },
    lastVerifiedAt: new Date().toISOString(),
  },
  {
    id: "prod_macbook_air_m3_15",
    merchantId: "konga_tech",
    externalId: "KGA-MBA-M3-15",
    title: "Apple MacBook Air 15\" (M3 Chip, 16GB Unified Memory, 512GB SSD)",
    description: "Fanless silent powerhouse, 18 hours battery life, Liquid Retina display. Great portability for iOS / Android simulation.",
    price: 1220000,
    currency: "NGN",
    imageUrl: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop&q=60",
    productUrl: "https://konga.com/product/apple-macbook-air-15-m3-midnight",
    availability: "In Stock",
    specifications: {
      RAM: "16GB Unified Memory",
      Storage: "512GB SSD",
      Processor: "Apple M3 (8-core CPU / 10-core GPU)",
      Battery: "66.5Wh (Up to 18 hours)",
      Display: "15.3 inch Liquid Retina 500 nits",
      Weight: "1.51 kg",
    },
    lastVerifiedAt: new Date().toISOString(),
  },
  {
    id: "prod_framework_13",
    merchantId: "jumia_express",
    externalId: "JUM-FRM-13AMD",
    title: "Framework Laptop 13 (AMD Ryzen 7 7840U, 32GB RAM, 1TB SSD)",
    description: "Fully modular, repairable laptop with user-swappable ports, high-res 3:2 screen and great developer ergonomics.",
    price: 1180000,
    currency: "NGN",
    imageUrl: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&auto=format&fit=crop&q=60",
    productUrl: "https://jumia.com.ng/framework-13-ryzen7-32gb",
    availability: "Limited Stock (2 units)",
    specifications: {
      RAM: "32GB DDR5 (2x16GB upgradeable)",
      Storage: "1TB WD Black SN850X NVMe",
      Processor: "AMD Ryzen 7 7840U",
      Battery: "61Wh (Up to 11 hours)",
      Display: "13.5 inch 2256x1504 (3:2 aspect ratio)",
      Weight: "1.3 kg",
    },
    lastVerifiedAt: new Date().toISOString(),
  },
  {
    id: "prod_macbook_pro_14_m3pro",
    merchantId: "konga_tech",
    externalId: "KGA-MBP-14-M3PRO",
    title: "Apple MacBook Pro 14\" (M3 Pro, 36GB Unified Memory, 512GB SSD)",
    description: "Liquid Retina XDR, ProMotion 120Hz, Space Black. Heavy-duty engineering beast.",
    price: 1850000,
    currency: "NGN",
    imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=60",
    productUrl: "https://konga.com/product/macbook-pro-14-m3-pro-36gb",
    availability: "In Stock",
    specifications: {
      RAM: "36GB Unified",
      Storage: "512GB SSD",
      Processor: "Apple M3 Pro (12-core CPU / 18-core GPU)",
      Battery: "70Wh (Up to 18 hours)",
      Display: "14.2 inch Liquid Retina XDR",
      Weight: "1.61 kg",
    },
    lastVerifiedAt: new Date().toISOString(),
  },
];

export class LocalMerchantConnector implements MerchantConnector {
  public id = "unified_tech_connector";
  public name = "Unified Merchant Catalog (Slot, Konga, Jumia Express)";

  async searchProducts(query: string, maxPrice?: number): Promise<Product[]> {
    const q = query.toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);

    return MOCK_MERCHANT_CATALOG.filter((p) => {
      if (maxPrice && p.price > maxPrice) return false;

      // Expand searchable text with synonyms
      const searchableText = `${p.title} ${p.description} laptop notebook computer macbook ${Object.values(
        p.specifications || {}
      ).join(" ")}`.toLowerCase();

      // If empty query, match all
      if (words.length === 0) return true;

      // Check if any word matches
      return words.some((w) => searchableText.includes(w));
    });
  }

  async getProduct(productId: string): Promise<Product | null> {
    return MOCK_MERCHANT_CATALOG.find((p) => p.id === productId) || null;
  }

  async prepareCheckout(productId: string, quantity: number = 1): Promise<CheckoutPreparation> {
    const product = await this.getProduct(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found.`);
    }

    const merchantNames: Record<string, string> = {
      slot_systems: "Slot Systems Nigeria",
      konga_tech: "Konga Tech Store",
      jumia_express: "Jumia Express Mall",
    };

    return {
      productId: product.id,
      merchantId: product.merchantId,
      merchantName: merchantNames[product.merchantId] || "Verified Merchant",
      quantity,
      subtotal: product.price * quantity,
      currency: product.currency,
      requiredFields: ["recipient_name", "delivery_address", "phone_number"],
      checkoutHandoffUrl: product.productUrl,
      disclosureNotice:
        "The merchant requires your recipient name, delivery address, and phone number to route dispatch. Your private preferences, subscription records, and other financial data remain sealed.",
    };
  }
}

export const merchantConnector = new LocalMerchantConnector();
