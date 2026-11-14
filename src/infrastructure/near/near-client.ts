import crypto from "crypto";
import * as nearAPI from "near-api-js";
import { store, AuthorisationRecord } from "@/infrastructure/store/persistent-store";

const { connect, keyStores, KeyPair } = nearAPI;

export interface CreatePermissionParams {
  actionType: string;
  spendingLimit: number;
  currency: string;
  expirySeconds?: number;
  userId?: string;
  userAccount?: string;
}

export class NearAuthorisationClient {
  public static contractId = process.env.NEAR_CONTRACT_ID || "obligoo.near";
  public static networkId = process.env.NEAR_NETWORK_ID || "mainnet";
  public static nodeUrl = process.env.NEAR_NODE_URL || "https://rpc.mainnet.near.org";

  public static async getOnchainPermission(permissionId: string) {
    const argsBase64 = Buffer.from(JSON.stringify({ permission_id: permissionId })).toString("base64");
    const response = await fetch(this.nodeUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: `permission-${permissionId}`,
        method: "query",
        params: {
          request_type: "call_function",
          finality: "final",
          account_id: this.contractId,
          method_name: "get_permission",
          args_base64: argsBase64,
        },
      }),
    });
    const json = await response.json();
    if (!response.ok || json.error) {
      throw new Error(json.error?.message || "NEAR permission query failed");
    }
    return JSON.parse(Buffer.from(json.result.result).toString("utf8"));
  }

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
   * Records an on-chain verifiable permission.
   * A missing key or failed broadcast is an error: we must never represent an
   * off-chain placeholder as an on-chain authorization.
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

    let txHash: string | undefined;

    const accountId = process.env.NEAR_ACCOUNT_ID;
    const privateKey = process.env.NEAR_PRIVATE_KEY;

    if (accountId && privateKey && privateKey.startsWith("ed25519:")) {
      try {
        const keyStore = new keyStores.InMemoryKeyStore();
        const keyPair = KeyPair.fromString(privateKey as any);
        await keyStore.setKey(this.networkId, accountId, keyPair);

        const nearConnection = await connect({
          networkId: this.networkId,
          keyStore,
          nodeUrl: this.nodeUrl,
        });

        const account = await nearConnection.account(accountId);
        
        // Execute function call on the configured NEAR network and contract.
        const outcome = await account.functionCall({
          contractId: this.contractId,
          methodName: "create_permission",
          args: {
            permission_hash: permissionHash,
            action_type: params.actionType,
            spending_limit: params.spendingLimit.toString(),
            currency: params.currency,
            expiry,
          },
          gas: BigInt("30000000000000"), // 30 Tgas
        });

        txHash = outcome.transaction.hash;
        console.log(`[NEAR ${this.networkId}] Permission broadcasted on-chain. Tx: ${txHash}`);
      } catch (err) {
        throw new Error(
          `NEAR permission transaction failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    } else {
      throw new Error(
        "NEAR_ACCOUNT_ID and NEAR_PRIVATE_KEY are required to create an on-chain permission"
      );
    }

    const record = store.addAuthorisationRecord({
      userId,
      permissionHash,
      actionType: params.actionType,
      spendingLimit: params.spendingLimit,
      currency: params.currency,
      expiry,
      transactionHash: txHash,
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
