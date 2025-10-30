import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PrivacyLayer } from "../target/types/privacy_layer";
import fs from "fs";
import path from "path";

/**
 * Setup a test private election on devnet
 */
async function setupElection() {
  console.log("🗳️  Setting up Test Private Election\n");

  // Setup provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PrivacyLayer as Program<PrivacyLayer>;

  // Load test keys
  const keysPath = path.join(__dirname, "../deployments/test-keys.json");
  if (!fs.existsSync(keysPath)) {
    console.log("❌ Test keys not found. Run: yarn generate-keys");
    process.exit(1);
  }

  const keys = JSON.parse(fs.readFileSync(keysPath, "utf-8"));
  console.log("📋 Loaded test keys");

  // Create a mock election account
  const mockElection = anchor.web3.Keypair.generate();

  // Generate election ID
  const electionId = new Uint8Array(32);
  crypto.getRandomValues(electionId);

  // Election config
  const endsAt = new anchor.BN(Date.now() / 1000 + 86400); // 24 hours from now
  const numOptions = 3; // 3 voting options

  console.log("\n⚙️  Election Configuration:");
  console.log("   Options:", numOptions);
  console.log("   Duration: 24 hours");
  console.log("   Mock Election Account:", mockElection.publicKey.toString());

  // Find PDAs
  const [privateElection, privateElectionBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("private_election"), mockElection.publicKey.toBuffer()],
      program.programId
    );

  const [nullifierSet, nullifierSetBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("nullifier_set"), mockElection.publicKey.toBuffer()],
      program.programId
    );

  console.log("\n📍 PDAs:");
  console.log("   Private Election:", privateElection.toString());
  console.log("   Nullifier Set:", nullifierSet.toString());

  try {
    console.log("\n🚀 Initializing private election...");

    const tx = await program.methods
      .initializePrivateElection(
        Array.from(electionId),
        keys.election.mpcPublicKey,
        keys.voters.merkleRoot,
        endsAt,
        numOptions
      )
      .accounts({
        privateElection,
        nullifierSet,
        election: mockElection.publicKey,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([mockElection])
      .rpc();

    console.log("✅ Transaction successful!");
    console.log("   Signature:", tx);

    // Fetch the created account
    const electionData = await program.account.privateElection.fetch(privateElection);

    console.log("\n📊 Private Election Created:");
    console.log("   Address:", privateElection.toString());
    console.log("   Authority:", electionData.authority.toString());
    console.log("   Status:", Object.keys(electionData.status)[0]);
    console.log("   Total Votes:", electionData.totalEncryptedVotes.toString());
    console.log("   Ends At:", new Date(electionData.endsAt.toNumber() * 1000).toISOString());

    // Save election info
    const electionInfo = {
      network: "devnet",
      privateElection: privateElection.toString(),
      mockElection: mockElection.publicKey.toString(),
      nullifierSet: nullifierSet.toString(),
      electionId: Array.from(electionId),
      createdAt: new Date().toISOString(),
      endsAt: new Date(electionData.endsAt.toNumber() * 1000).toISOString(),
      numOptions,
      transactionSignature: tx,
    };

    fs.writeFileSync(
      path.join(__dirname, "../deployments/test-election.json"),
      JSON.stringify(electionInfo, null, 2)
    );

    console.log("\n📝 Election info saved to deployments/test-election.json");
    console.log("\n🔗 View transaction:");
    console.log(`   https://solscan.io/tx/${tx}?cluster=devnet`);
    console.log("\n🎉 Setup complete!");
  } catch (error) {
    console.log("\n❌ Failed to setup election:", error);
    if (error.logs) {
      console.log("\nProgram Logs:");
      error.logs.forEach((log) => console.log("  ", log));
    }
    process.exit(1);
  }
}

setupElection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });
