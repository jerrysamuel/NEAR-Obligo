const rpcUrl = process.env.NEAR_NODE_URL || "https://rpc.mainnet.near.org";
const contractId = process.env.NEAR_CONTRACT_ID || "obligoo.near";

async function query(method: string, args: Record<string, unknown>) {
  const encoded = Buffer.from(JSON.stringify(args)).toString("base64");
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: method,
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: contractId,
        method_name: method,
        args_base64: encoded,
      },
    }),
  });
  const json = await response.json();
  if (json.error) throw new Error(json.error.message || "RPC query failed");
  return JSON.parse(Buffer.from(json.result.result).toString("utf8"));
}

async function run() {
  const missing = await query("get_permission", { permission_id: "perm_smoke_missing" });
  if (missing !== null) throw new Error("Unexpected permission returned from empty registry");

  const valid = await query("verify_permission", { permission_id: "perm_smoke_missing" });
  if (valid !== false) throw new Error("Missing permission should not verify");

  console.log(`✅ Mainnet contract ${contractId} is deployed, initialized, and readable.`);
}

run().catch((error) => {
  console.error(`❌ Mainnet contract check failed: ${error.message}`);
  process.exit(1);
});
