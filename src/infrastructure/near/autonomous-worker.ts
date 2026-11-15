import * as nearAPI from "near-api-js";

const { connect, keyStores, KeyPair } = nearAPI;

const USDT_CONTRACT = process.env.NEAR_USDT_CONTRACT || "usdt.tether-token.near";
const PAYMENT_ROUTER = process.env.NEAR_PAYMENT_ROUTER_ACCOUNT_ID;
const NETWORK_ID = process.env.NEAR_NETWORK_ID || "mainnet";
const NODE_URL = process.env.NEAR_NODE_URL || "https://rpc.mainnet.near.org";

export interface DirectTransferResult {
  transactionHash: string;
  sender: string;
  recipient: string;
  amount: string;
}

/**
 * Executes a direct USDT payout using a restricted FunctionCall access key.
 * The key must be scoped on-chain to USDT's ft_transfer method; full-access
 * keys are rejected deliberately.
 */
export async function directUsdtTransfer(input: {
  recipient: string;
  amount: string;
  invoiceId: string;
}): Promise<DirectTransferResult> {
  const accountId = process.env.NEAR_AUTONOMOUS_ACCOUNT_ID;
  const privateKey = process.env.NEAR_AUTONOMOUS_PRIVATE_KEY;
  if (!accountId || !privateKey || !privateKey.startsWith("ed25519:")) {
    throw new Error("Autonomous worker credentials are not configured");
  }
  const routerId = PAYMENT_ROUTER || accountId;

  const keyStore = new keyStores.InMemoryKeyStore();
  const keyPair = KeyPair.fromString(privateKey as any);
  const publicKey = keyPair.getPublicKey().toString();
  await keyStore.setKey(NETWORK_ID, accountId, keyPair);

  const connection = await connect({ networkId: NETWORK_ID, keyStore, nodeUrl: NODE_URL });
  const accessKey: any = await (connection as any).connection.provider.query({
    request_type: "view_access_key",
    finality: "final",
    account_id: accountId,
    public_key: publicKey,
  });
  const permission = accessKey.permission;
  if (!permission?.FunctionCall) {
    throw new Error("Autonomous worker key must be a restricted FunctionCall key");
  }
  if (permission.FunctionCall.receiver_id !== routerId) {
    throw new Error(`Worker key must target payment router ${routerId}`);
  }
  const methods = permission.FunctionCall.method_names || [];
  if (methods.length !== 1 || methods[0] !== "pay") {
    throw new Error("Worker key must allow only the payment router pay method");
  }

  const account = await connection.account(accountId);
  const outcome: any = await (account as any).signAndSendTransaction({
    receiverId: routerId,
    actions: [
      nearAPI.transactions.functionCall(
        "pay",
        {
          receiver_id: input.recipient,
          amount: input.amount,
          memo: `Obligo invoice ${input.invoiceId}`,
        },
        // The router performs the token transfer and attaches 1 yoctoNEAR
        // internally, so the restricted worker key attaches no deposit.
        // The router needs its own execution gas in addition to the
        // 30-Tgas cross-contract USDT transfer.
        BigInt("60000000000000"),
        BigInt("0")
      ),
    ],
    // Return the final outcome so we can expose the actual contract failure
    // instead of near-api-js reducing it to an empty "{}" error.
    returnError: true,
  });

  if (outcome?.status?.Failure) {
    throw new Error(`NEAR ft_transfer failed: ${JSON.stringify(outcome.status.Failure)}`);
  }

  if (!outcome?.transaction?.hash) {
    throw new Error("NEAR ft_transfer returned no transaction hash");
  }

  return {
    transactionHash: outcome.transaction.hash,
    sender: accountId,
    recipient: input.recipient,
    amount: input.amount,
  };
}
