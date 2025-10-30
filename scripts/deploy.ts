import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PrivacyLayer } from "../target/types/privacy_layer";
import fs from "fs";
import path from "path";

/**
 * Deploy the privacy layer program to devnet
 */
async function deploy() {
  console.log("🚀 Deploying Privacy Layer to Devnet...\n");

  // Setup
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const programId = new anchor.web3.PublicKey(
    "APdSGnQuogNbYga3CZUZfSRpAz4agdufXbEPbGCCt9by"
  );

  console.log("📍 Configuration:");
  console.log("   Network:", provider.connection.rpcEndpoint);
  console.log("   Wallet:", provider.wallet.publicKey.toString());
  console.log("   Program ID:", programId.toString());
  console.log("");

  // Check wallet balance
  const balance = await provider.connection.getBalance(provider.wallet.publicKey);
  console.log("💰 Wallet Balance:", balance / anchor.web3.LAMPORTS_PER_SOL, "SOL");

  if (balance === 0) {
    console.log("❌ Wallet has no SOL! Request airdrop:");
    console.log(`   solana airdrop 2 ${provider.wallet.publicKey.toString()} --url devnet`);
    process.exit(1);
  }

  // Load the program
  let program: Program<PrivacyLayer>;
  try {
    program = anchor.workspace.PrivacyLayer as Program<PrivacyLayer>;
    console.log("✅ Program loaded successfully\n");
  } catch (error) {
    console.log("❌ Failed to load program:", error);
    process.exit(1);
  }

  // Verify deployment
  try {
    const accountInfo = await provider.connection.getAccountInfo(programId);
    if (accountInfo) {
      console.log("✅ Program is deployed!");
      console.log("   Executable:", accountInfo.executable);
      console.log("   Owner:", accountInfo.owner.toString());
      console.log("   Data Length:", accountInfo.data.length, "bytes");
    } else {
      console.log("❌ Program not found on chain");
      console.log("   Deploy with: anchor deploy --provider.cluster devnet");
      process.exit(1);
    }
  } catch (error) {
    console.log("❌ Error checking program:", error);
    process.exit(1);
  }

  // Save deployment info
  const deployment = {
    network: "devnet",
    programId: programId.toString(),
    deployedAt: new Date().toISOString(),
    deployer: provider.wallet.publicKey.toString(),
    rpcEndpoint: provider.connection.rpcEndpoint,
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deploymentsDir, "devnet.json"),
    JSON.stringify(deployment, null, 2)
  );

  console.log("\n📝 Deployment info saved to deployments/devnet.json");
  console.log("\n🎉 Deployment complete!");
  console.log("\n🔗 View on Solscan:");
  console.log(`   https://solscan.io/account/${programId.toString()}?cluster=devnet`);
}

deploy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
