import * as nearAPI from "near-api-js";

const accountId = process.env.NEAR_AUTONOMOUS_ACCOUNT_ID;
const privateKey = process.env.NEAR_AUTONOMOUS_PRIVATE_KEY;
const networkId = process.env.NEAR_NETWORK_ID || "mainnet";
const tokenContract = process.env.NEAR_USDT_CONTRACT || "usdt.tether-token.near";
const nodeUrl = process.env.NEAR_NODE_URL || "https://rpc.mainnet.near.org";

async function run() {
  if (!accountId || !privateKey) throw new Error("Set NEAR_AUTONOMOUS_ACCOUNT_ID and NEAR_AUTONOMOUS_PRIVATE_KEY");
  const keyStore = new nearAPI.keyStores.InMemoryKeyStore();
  const keyPair = nearAPI.KeyPair.fromString(privateKey as any);
  const publicKey = keyPair.getPublicKey().toString();
  await keyStore.setKey(networkId, accountId, keyPair);
  const near = await nearAPI.connect({ networkId, keyStore, nodeUrl });
  const accessKey: any = await (near as any).connection.provider.query({
    request_type: "view_access_key",
    finality: "final",
    account_id: accountId,
    public_key: publicKey,
  });
  const permission = accessKey.permission?.FunctionCall;
  if (!permission) throw new Error("Worker key is not a restricted FunctionCall key");
  if (permission.receiver_id !== tokenContract) throw new Error(`Worker key targets ${permission.receiver_id}, expected ${tokenContract}`);
  const methods = permission.method_names || [];
  if (methods.length !== 1 || methods[0] !== "ft_transfer") {
    throw new Error("Worker key must allow only ft_transfer");
  }
  console.log(`✅ Restricted worker key verified for ${accountId}`);
  console.log(`   receiver: ${permission.receiver_id}`);
  console.log(`   methods: ${methods.join(", ")}`);
}

run().catch((error) => {
  console.error(`❌ Worker key check failed: ${error.message}`);
  process.exit(1);
});
