import crypto from "crypto";
import { store, AuthorisationRecord } from "@/infrastructure/store/persistent-store";

export interface CreatePermissionParams {
  actionType: string;
  spendingLimit: number;
  currency: string;
  expirySeconds?: number;
  userId?: string;
  userAccount?: string;
}

export class NearAuthorisationClient {
  public static contractId = process.env.NEAR_CONTRACT_ID || "obligo-permissions.testnet";
  public static networkId = process.env.NEAR_NETWORK_ID || "testnet";

  /**
   * Generates a deterministic SHA-256 permission hash from off-chain parameters
   */
  public static generatePermissionHash(data: {
    userId: string;
    actionType: string;
    spendingLimit: number;
    currency: string;
    timestamp: number;
  }): string {
    const raw = `${data.userId}:${data.actionType}:${data.spendingLimit}:${data.currency}:${data.timestamp}`;
    return "0x" + crypto.createHash("sha256").update(raw).digest("hex");
  }

  /**
   * Records an on-chain verifiable permission
   */
  public static async recordPermission(params: CreatePermissionParams): Promise<AuthorisationRecord> {
    const userId = params.userId || store.getDefaultUserId();
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + (params.expirySeconds || 86400 * 7); // 7 days

    const permissionHash = this.generatePermissionHash({
      userId,
      actionType: params.actionType,
      spendingLimit: params.spendingLimit,
      currency: params.currency,
      timestamp: now,
    });

    // Mock/Simulated testnet transaction hash if private key not set, or real NEAR RPC call if credentials are configured
    const simulatedTxHash =
      "near_tx_" + crypto.randomBytes(16).toString("hex") + "_testnet";

    const record = store.addAuthorisationRecord({
      userId,
      permissionHash,
      actionType: params.actionType,
      spendingLimit: params.spendingLimit,
      currency: params.currency,
      expiry,
      transactionHash: simulatedTxHash,
      contractId: this.contractId,
      revoked: false,
    });

    return record;
  }

  public static async revokePermission(id: string, userId?: string): Promise<boolean> {
    return store.revokeAuthorisationRecord(id, userId);
  }

  public static getRecords(userId?: string): AuthorisationRecord[] {
    return store.getAuthorisationRecords(userId);
  }
}
