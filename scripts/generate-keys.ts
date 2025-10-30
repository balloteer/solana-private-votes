import { Keypair } from "@solana/web3.js";
import fs from "fs";
import path from "path";

/**
 * Generate MPC keypairs for testing
 *
 * In production, these would be generated via Arcium's DKG protocol.
 * For hackathon/testing, we generate them locally.
 */

function generateElGamalKeyPair() {
  // Generate a random 32-byte secret key
  const secretKey = new Uint8Array(32);
  crypto.getRandomValues(secretKey);

  // For demonstration, we'll derive a "public key" from the secret
  // In production, this would be: publicKey = secretKey * G (on Curve25519)
  // For now, we'll hash it as a placeholder
  const crypto = require("crypto");
  const hash = crypto.createHash("sha256");
  hash.update(secretKey);
  const publicKey = new Uint8Array(hash.digest());

  return {
    secretKey: Array.from(secretKey),
    publicKey: Array.from(publicKey),
  };
}

async function generateKeys() {
  console.log("🔑 Generating MPC Keypairs for Testing\n");

  // Generate election keypair
  const electionKeypair = generateElGamalKeyPair();

  // Generate voter secrets (for testing)
  const numVoters = 10;
  const voterSecrets = [];

  for (let i = 0; i < numVoters; i++) {
    const secret = new Uint8Array(32);
    crypto.getRandomValues(secret);
    voterSecrets.push({
      id: i,
      secret: Array.from(secret),
    });
  }

  // Generate voter merkle tree root (mock)
  const merkleRoot = new Uint8Array(32);
  crypto.getRandomValues(merkleRoot);

  const keys = {
    generatedAt: new Date().toISOString(),
    note: "⚠️  FOR TESTING ONLY - In production, use Arcium MPC DKG",
    election: {
      mpcPublicKey: electionKeypair.publicKey,
      mpcSecretKey: electionKeypair.secretKey, // Would be distributed in production
    },
    voters: {
      merkleRoot: Array.from(merkleRoot),
      secrets: voterSecrets,
    },
  };

  // Save keys
  const keysDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(keysDir, "test-keys.json"),
    JSON.stringify(keys, null, 2)
  );

  console.log("✅ Generated:");
  console.log(`   • MPC Public Key: ${electionKeypair.publicKey.slice(0, 8).join(",")}...`);
  console.log(`   • Voter Secrets: ${numVoters} generated`);
  console.log(`   • Merkle Root: ${Array.from(merkleRoot).slice(0, 8).join(",")}...`);
  console.log("\n📝 Keys saved to deployments/test-keys.json");
  console.log("\n⚠️  WARNING: These are test keys only!");
  console.log("   In production, use Arcium's DKG protocol for distributed key generation.\n");
}

generateKeys()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Key generation failed:", error);
    process.exit(1);
  });
