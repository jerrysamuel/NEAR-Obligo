import { KeyPair } from "near-api-js";

const keyPair = KeyPair.fromRandom("ed25519");
console.log("Create a restricted FunctionCall access key for this public key:");
console.log(`PUBLIC_KEY=${keyPair.getPublicKey().toString()}`);
console.log("");
console.log("After the payer wallet authorizes it, store the private key only in the backend:");
console.log(`NEAR_AUTONOMOUS_PRIVATE_KEY=${keyPair.toString()}`);
console.log("");
console.log("Required restriction:");
console.log("receiver_id: usdt.tether-token.near");
console.log("method_names: ft_transfer");
console.log("Never use a full-access key for the autonomous worker.");
