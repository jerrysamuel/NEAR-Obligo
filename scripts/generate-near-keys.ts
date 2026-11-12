import { KeyPair } from "near-api-js";

function generate() {
  const keyPair = KeyPair.fromRandom("ed25519");
  const publicKey = keyPair.getPublicKey().toString();
  const privateKey = keyPair.toString();

  console.log("\n=======================================================");
  console.log("       NEAR TESTNET KEYPAIR GENERATED SUCCESSFULLY     ");
  console.log("=======================================================\n");
  console.log("Public Key (use in faucet/account setup):");
  console.log(`  ${publicKey}\n`);
  console.log("Private Key (add to .env.local as NEAR_PRIVATE_KEY):");
  console.log(`  ${privateKey}\n`);
  console.log("-------------------------------------------------------");
  console.log("Steps to link an account:");
  console.log("1. Create or claim an account at: https://testnet.mynearwallet.com");
  console.log("   OR use the testnet faucet: https://docs.near.org/getting-started/faucet.md");
  console.log("2. Add to your .env.local:");
  console.log(`   NEAR_ACCOUNT_ID=your-account.testnet`);
  console.log(`   NEAR_PRIVATE_KEY=${privateKey}`);
  console.log("=======================================================\n");
}

generate();
