import fs from "fs";
import path from "path";

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  preferredCurrency: string;
  monthlyBudget: number;
  createdAt: string;
}

export interface ShoppingPreference {
  id: string;
  userId: string;
  preferredBrands: string[];
  productSpecifications: Record<string, string>;
  preferredMerchants: string[];
  shoppingRestrictions: string[];
  spendingLimit: number;
  approvalRequirements: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  name: string;
  provider: string;
  category: string;
  amount: number;
  currency: string;
  billingCycle: "weekly" | "monthly" | "quarterly" | "yearly";
  startDate?: string;
  nextBillingDate: string;
  status: "active" | "paused" | "cancelled";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  merchantId: string;
  externalId?: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  productUrl: string;
  availability?: string;
  specifications?: Record<string, string>;
  lastVerifiedAt?: string;
}

export interface SavedProduct extends Product {
  userId: string;
  savedAt: string;
  notes?: string;
}

export interface PurchaseIntent {
  id: string;
  userId: string;
  productId: string;
  merchantId: string;
  title: string;
  price: number;
  currency: string;
  status: "draft" | "pending_approval" | "authorised" | "completed" | "cancelled";
  requiredFields: string[];
  disclosedFields: Record<string, string>;
  nearPermissionHash?: string;
  createdAt: string;
}

export interface DisclosurePermission {
  id: string;
  userId: string;
  recipient: string;
  purpose: string;
  permittedFields: string[];
  expiresAt: string;
  revokedAt?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface AuthorisationRecord {
  id: string;
  userId: string;
  permissionHash: string;
  actionType: string;
  spendingLimit: number;
  currency: string;
  expiry: number;
  transactionHash?: string;
  contractId: string;
  revoked: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  actor: "user" | "agent" | "mcp";
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface StoreData {
  profiles: Profile[];
  shoppingPreferences: ShoppingPreference[];
  subscriptions: Subscription[];
  savedProducts: SavedProduct[];
  purchaseIntents: PurchaseIntent[];
  disclosurePermissions: DisclosurePermission[];
  authorisationRecords: AuthorisationRecord[];
  activityLogs: ActivityLog[];
}

const DEFAULT_USER_ID = "usr_demo_techpal_01";

// Seed data based on prompt requirements (e.g. ₦48,500 monthly subscriptions, upcoming renewals, laptop search preferences)
const SEED_DATA: StoreData = {
  profiles: [
    {
      id: DEFAULT_USER_ID,
      email: "techpal@obligo.ai",
      fullName: "Jerry Samuel",
      preferredCurrency: "NGN",
      monthlyBudget: 1500000,
      createdAt: new Date().toISOString(),
    },
  ],
  shoppingPreferences: [
    {
      id: "pref_01",
      userId: DEFAULT_USER_ID,
      preferredBrands: ["Apple", "Dell", "Lenovo", "Framework"],
      productSpecifications: {
        ram: "32GB",
        processor: "Apple Silicon or Intel Core i7/i9",
        storage: "1TB SSD",
        battery: "High Endurance (>10 hrs)",
      },
      preferredMerchants: ["Konga Tech", "Jumia Express", "Slot Systems", "Scan Computers"],
      shoppingRestrictions: ["No refurbished without 1-year warranty", "Verify seller rating > 4.5"],
      spendingLimit: 1300000,
      approvalRequirements: "Explicit approval required before disclosing recipient name, phone or delivery address",
      updatedAt: new Date().toISOString(),
    },
  ],
  subscriptions: [
    {
      id: "sub_01",
      userId: DEFAULT_USER_ID,
      name: "Netflix Premium",
      provider: "Netflix Inc.",
      category: "Entertainment",
      amount: 7000,
      currency: "NGN",
      billingCycle: "monthly",
      nextBillingDate: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0], // renewing soon
      status: "active",
      notes: "4K UHD Family Plan",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "sub_02",
      userId: DEFAULT_USER_ID,
      name: "Spotify Premium Duo",
      provider: "Spotify AB",
      category: "Entertainment",
      amount: 3500,
      currency: "NGN",
      billingCycle: "monthly",
      nextBillingDate: new Date(Date.now() + 6 * 86400000).toISOString().split("T")[0],
      status: "active",
      notes: "Music streaming",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "sub_03",
      userId: DEFAULT_USER_ID,
      name: "Cloud Hosting VPS",
      provider: "Hetzner / Cloud",
      category: "Infrastructure",
      amount: 12000,
      currency: "NGN",
      billingCycle: "monthly",
      nextBillingDate: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
      status: "active",
      notes: "Production API nodes",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "sub_04",
      userId: DEFAULT_USER_ID,
      name: "GitHub Copilot Enterprise",
      provider: "GitHub / Microsoft",
      category: "Developer Tools",
      amount: 19000,
      currency: "NGN",
      billingCycle: "monthly",
      nextBillingDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      status: "active",
      notes: "AI pair programming",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "sub_05",
      userId: DEFAULT_USER_ID,
      name: "Figma Professional",
      provider: "Figma Inc.",
      category: "Design",
      amount: 7000,
      currency: "NGN",
      billingCycle: "monthly",
      nextBillingDate: new Date(Date.now() + 20 * 86400000).toISOString().split("T")[0],
      status: "active",
      notes: "UI/UX workspace",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  savedProducts: [
    {
      id: "prod_macbook_m3_pro",
      merchantId: "konga_official",
      title: "MacBook Pro 14\" (M3 Pro, 36GB Unified Memory, 512GB SSD)",
      description: "Liquid Retina XDR, Space Black, 18-hour battery life. Perfect for mobile React Native and Docker builds.",
      price: 1850000,
      currency: "NGN",
      imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=60",
      productUrl: "https://konga.com/product/macbook-pro-14-m3-pro-36gb",
      availability: "In Stock (3 left)",
      specifications: {
        RAM: "36GB Unified",
        Storage: "512GB SSD",
        Processor: "Apple M3 Pro (12-core CPU)",
        Battery: "Up to 18 hours",
        Weight: "1.61 kg",
      },
      lastVerifiedAt: new Date().toISOString(),
      userId: DEFAULT_USER_ID,
      savedAt: new Date().toISOString(),
      notes: "Above ₦1.2M budget, but high durability",
    },
    {
      id: "prod_dell_xps_15",
      merchantId: "slot_systems",
      title: "Dell XPS 15 9530 (Intel Core i7-13700H, 32GB DDR5, 1TB SSD)",
      description: "15.6\" FHD+ 500 nits, RTX 4050 6GB. Built for heavy development stacks.",
      price: 1195000,
      currency: "NGN",
      imageUrl: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&auto=format&fit=crop&q=60",
      productUrl: "https://slot.ng/dell-xps-15-32gb-1tb",
      availability: "In Stock",
      specifications: {
        RAM: "32GB DDR5 4800MHz",
        Storage: "1TB PCIe NVMe",
        Processor: "Intel Core i7-13700H (14-core)",
        Battery: "86Wh (Up to 10 hours)",
        Weight: "1.86 kg",
      },
      lastVerifiedAt: new Date().toISOString(),
      userId: DEFAULT_USER_ID,
      savedAt: new Date().toISOString(),
      notes: "Fits within the ₦1.2M budget perfectly with 32GB RAM",
    },
  ],
  purchaseIntents: [],
  disclosurePermissions: [
    {
      id: "perm_01",
      userId: DEFAULT_USER_ID,
      recipient: "Slot Systems Checkout Rail",
      purpose: "Delivery verification and logistics contact for Dell XPS 15",
      permittedFields: ["recipient_name", "delivery_phone"],
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  ],
  authorisationRecords: [
    {
      id: "auth_01",
      userId: DEFAULT_USER_ID,
      permissionHash: "0x8fae89c09d318357493a384f8849b72d24491024849202bb91f93847291a92cf",
      actionType: "PREPARE_CHECKOUT_DELL_XPS",
      spendingLimit: 1200000,
      currency: "NGN",
      expiry: Math.floor(Date.now() / 1000) + 86400 * 3,
      transactionHash: "7bY8b6W3pQ1vR8mC6xZ7T4nL9kM2sP5wJ8qH4vK3dF9x",
      contractId: "obligoo.near",
      revoked: false,
      createdAt: new Date().toISOString(),
    },
  ],
  activityLogs: [
    {
      id: "act_01",
      userId: DEFAULT_USER_ID,
      actor: "user",
      action: "PROFILE_INITIALISED",
      details: { currency: "NGN", monthlyBudget: 1500000 },
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "act_02",
      userId: DEFAULT_USER_ID,
      actor: "agent",
      action: "SHOPPING_INTENT_ANALYZED",
      details: { query: "laptop 32GB RAM under ₦1.2M", matchedCount: 3 },
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
  ],
};

const DB_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DB_DIR, "db.json");

class PersistentStore {
  private data: StoreData;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): StoreData {
    try {
      if (typeof window === "undefined") {
        if (!fs.existsSync(DB_DIR)) {
          fs.mkdirSync(DB_DIR, { recursive: true });
        }
        if (fs.existsSync(DB_FILE)) {
          const raw = fs.readFileSync(DB_FILE, "utf-8");
          return JSON.parse(raw);
        } else {
          fs.writeFileSync(DB_FILE, JSON.stringify(SEED_DATA, null, 2), "utf-8");
          return SEED_DATA;
        }
      }
      return SEED_DATA;
    } catch (e) {
      console.warn("Failed to read persistent db file, using in-memory store:", e);
      return SEED_DATA;
    }
  }

  private persist() {
    try {
      if (typeof window === "undefined") {
        if (!fs.existsSync(DB_DIR)) {
          fs.mkdirSync(DB_DIR, { recursive: true });
        }
        fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
      }
    } catch (e) {
      console.error("Failed to persist data to disk:", e);
    }
  }

  public getDefaultUserId(): string {
    return DEFAULT_USER_ID;
  }

  // --- Subscriptions ---
  public getSubscriptions(userId: string = DEFAULT_USER_ID): Subscription[] {
    return this.data.subscriptions.filter((s) => s.userId === userId);
  }

  public getSubscriptionById(id: string, userId: string = DEFAULT_USER_ID): Subscription | null {
    return this.data.subscriptions.find((s) => s.id === id && s.userId === userId) || null;
  }

  public addSubscription(sub: Omit<Subscription, "id" | "createdAt" | "updatedAt">): Subscription {
    const newSub: Subscription = {
      ...sub,
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.subscriptions.unshift(newSub);
    this.logActivity(newSub.userId, "user", "SUBSCRIPTION_CREATED", { name: newSub.name, amount: newSub.amount });
    this.persist();
    return newSub;
  }

  public updateSubscription(id: string, updates: Partial<Subscription>, userId: string = DEFAULT_USER_ID): Subscription | null {
    const index = this.data.subscriptions.findIndex((s) => s.id === id && s.userId === userId);
    if (index === -1) return null;

    this.data.subscriptions[index] = {
      ...this.data.subscriptions[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.logActivity(userId, "user", "SUBSCRIPTION_UPDATED", { id, updates });
    this.persist();
    return this.data.subscriptions[index];
  }

  public deleteSubscription(id: string, userId: string = DEFAULT_USER_ID): boolean {
    const initialLen = this.data.subscriptions.length;
    this.data.subscriptions = this.data.subscriptions.filter((s) => !(s.id === id && s.userId === userId));
    const deleted = this.data.subscriptions.length < initialLen;
    if (deleted) {
      this.logActivity(userId, "user", "SUBSCRIPTION_DELETED", { id });
      this.persist();
    }
    return deleted;
  }

  // --- Shopping & Saved Products ---
  public getSavedProducts(userId: string = DEFAULT_USER_ID): SavedProduct[] {
    return this.data.savedProducts.filter((p) => p.userId === userId);
  }

  public saveProduct(product: Product, notes?: string, userId: string = DEFAULT_USER_ID): SavedProduct {
    const existing = this.data.savedProducts.find((p) => p.id === product.id && p.userId === userId);
    if (existing) return existing;

    const saved: SavedProduct = {
      ...product,
      userId,
      savedAt: new Date().toISOString(),
      notes,
    };
    this.data.savedProducts.unshift(saved);
    this.logActivity(userId, "user", "PRODUCT_SAVED", { productId: product.id, title: product.title });
    this.persist();
    return saved;
  }

  public removeSavedProduct(id: string, userId: string = DEFAULT_USER_ID): boolean {
    const initialLen = this.data.savedProducts.length;
    this.data.savedProducts = this.data.savedProducts.filter((p) => !(p.id === id && p.userId === userId));
    const deleted = this.data.savedProducts.length < initialLen;
    if (deleted) {
      this.persist();
    }
    return deleted;
  }

  // --- Purchase Intents ---
  public getPurchaseIntents(userId: string = DEFAULT_USER_ID): PurchaseIntent[] {
    return this.data.purchaseIntents.filter((p) => p.userId === userId);
  }

  public createPurchaseIntent(intent: Omit<PurchaseIntent, "id" | "createdAt">): PurchaseIntent {
    const newIntent: PurchaseIntent = {
      ...intent,
      id: `intent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.purchaseIntents.unshift(newIntent);
    this.logActivity(newIntent.userId, "agent", "PURCHASE_INTENT_PREPARED", {
      intentId: newIntent.id,
      productId: newIntent.productId,
      price: newIntent.price,
    });
    this.persist();
    return newIntent;
  }

  // --- Preferences & Memory ---
  public getPreferences(userId: string = DEFAULT_USER_ID): ShoppingPreference {
    const pref = this.data.shoppingPreferences.find((p) => p.userId === userId);
    if (pref) return pref;

    const defaultPref: ShoppingPreference = {
      id: `pref_${Date.now()}`,
      userId,
      preferredBrands: ["Apple", "Dell"],
      productSpecifications: {},
      preferredMerchants: ["Konga Tech", "Slot Systems"],
      shoppingRestrictions: [],
      spendingLimit: 1000000,
      approvalRequirements: "Require approval for all checkout details",
      updatedAt: new Date().toISOString(),
    };
    this.data.shoppingPreferences.push(defaultPref);
    this.persist();
    return defaultPref;
  }

  public updatePreferences(updates: Partial<ShoppingPreference>, userId: string = DEFAULT_USER_ID): ShoppingPreference {
    const pref = this.getPreferences(userId);
    const updated = {
      ...pref,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    const index = this.data.shoppingPreferences.findIndex((p) => p.userId === userId);
    if (index !== -1) {
      this.data.shoppingPreferences[index] = updated;
    } else {
      this.data.shoppingPreferences.push(updated);
    }
    this.logActivity(userId, "user", "PREFERENCES_UPDATED", { updates });
    this.persist();
    return updated;
  }

  public getProfile(userId: string = DEFAULT_USER_ID): Profile {
    const p = this.data.profiles.find((x) => x.id === userId);
    if (p) return p;
    return {
      id: userId,
      email: "user@obligo.ai",
      fullName: "Obligo User",
      preferredCurrency: "NGN",
      monthlyBudget: 1500000,
      createdAt: new Date().toISOString(),
    };
  }

  public updateProfile(updates: Partial<Profile>, userId: string = DEFAULT_USER_ID): Profile {
    const p = this.getProfile(userId);
    const updated = { ...p, ...updates };
    const index = this.data.profiles.findIndex((x) => x.id === userId);
    if (index !== -1) {
      this.data.profiles[index] = updated;
    } else {
      this.data.profiles.push(updated);
    }
    this.persist();
    return updated;
  }

  // --- Disclosure Permissions ---
  public getDisclosurePermissions(userId: string = DEFAULT_USER_ID): DisclosurePermission[] {
    return this.data.disclosurePermissions.filter((d) => d.userId === userId);
  }

  public addDisclosurePermission(permission: Omit<DisclosurePermission, "id" | "createdAt">): DisclosurePermission {
    const newPerm: DisclosurePermission = {
      ...permission,
      id: `perm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.disclosurePermissions.unshift(newPerm);
    this.logActivity(newPerm.userId, "user", "PERMISSION_GRANTED", {
      recipient: newPerm.recipient,
      fields: newPerm.permittedFields,
    });
    this.persist();
    return newPerm;
  }

  public revokeDisclosurePermission(id: string, userId: string = DEFAULT_USER_ID): boolean {
    const perm = this.data.disclosurePermissions.find((p) => p.id === id && p.userId === userId);
    if (perm) {
      perm.revokedAt = new Date().toISOString();
      this.logActivity(userId, "user", "PERMISSION_REVOKED", { id });
      this.persist();
      return true;
    }
    return false;
  }

  // --- Authorisation Records (NEAR Testnet) ---
  public getAuthorisationRecords(userId: string = DEFAULT_USER_ID): AuthorisationRecord[] {
    return this.data.authorisationRecords.filter((a) => a.userId === userId);
  }

  public addAuthorisationRecord(record: Omit<AuthorisationRecord, "id" | "createdAt">): AuthorisationRecord {
    const newAuth: AuthorisationRecord = {
      ...record,
      id: `auth_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.authorisationRecords.unshift(newAuth);
    this.logActivity(newAuth.userId, "user", "NEAR_AUTHORISATION_RECORDED", {
      permissionHash: newAuth.permissionHash,
      txHash: newAuth.transactionHash,
    });
    this.persist();
    return newAuth;
  }

  public revokeAuthorisationRecord(id: string, userId: string = DEFAULT_USER_ID): boolean {
    const auth = this.data.authorisationRecords.find((a) => a.id === id && a.userId === userId);
    if (auth) {
      auth.revoked = true;
      this.logActivity(userId, "user", "NEAR_AUTHORISATION_REVOKED", { id, permissionHash: auth.permissionHash });
      this.persist();
      return true;
    }
    return false;
  }

  // --- Activity Logs ---
  public getActivityLogs(userId: string = DEFAULT_USER_ID): ActivityLog[] {
    return this.data.activityLogs.filter((a) => a.userId === userId);
  }

  public logActivity(userId: string, actor: "user" | "agent" | "mcp", action: string, details: Record<string, unknown> = {}) {
    this.data.activityLogs.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      actor,
      action,
      details,
      createdAt: new Date().toISOString(),
    });
    if (this.data.activityLogs.length > 100) {
      this.data.activityLogs = this.data.activityLogs.slice(0, 100);
    }
  }
}

// Global singleton instance
export const store = new PersistentStore();
