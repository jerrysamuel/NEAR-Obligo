import * as nearAPI from "near-api-js";

const { connect, keyStores, KeyPair } = nearAPI;

const USDT_CONTRACT = process.env.NEAR_USDT_CONTRACT || "usdt.tether-token.near";
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
  if (permission.FunctionCall.receiver_id !== USDT_CONTRACT) {
    throw new Error(`Worker key must target ${USDT_CONTRACT}`);
  }
  const methods = permission.FunctionCall.method_names || [];
  if (methods.length !== 1 || methods[0] !== "ft_transfer") {
    throw new Error("Worker key must allow only the ft_transfer method");
  }

  const account = await connection.account(accountId);
  const outcome: any = await account.functionCall({
    contractId: USDT_CONTRACT,
    methodName: "ft_transfer",
    args: {
      receiver_id: input.recipient,
      amount: input.amount,
      memo: `Obligo invoice ${input.invoiceId}`,
    },
    gas: BigInt("10000000000000"),
    attachedDeposit: BigInt("1"),
  });

  return {
    transactionHash: outcome.transaction.hash,
    sender: accountId,
    recipient: input.recipient,
    amount: input.amount,
  };
}
