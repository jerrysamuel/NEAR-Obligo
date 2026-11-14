import { whoami, getNetwork } from "../src/lib/agentApi";

async function main() {
  console.log("Calling NEAR Intents Agent API whoami & getNetwork...");
  try {
    const net = await getNetwork();
    console.log("Network info:", JSON.stringify(net, null, 2));

    const res = await whoami();
    console.log("Whoami result:", JSON.stringify(res, null, 2));
  } catch (err: any) {
    if (err?.code || err?.status) {
      console.log(`Agent API responded with: ${err.code || err.status} - ${err.title || err.message}`);
    } else {
      console.log("Agent API call result:", err?.message || err);
    }
  }
}

main();
