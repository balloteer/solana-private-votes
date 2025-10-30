/**
 * Simple Voting Example
 *
 * Shows the minimal code needed to:
 * 1. Initialize a private election
 * 2. Cast an encrypted vote
 * 3. Verify the vote was cast
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { PrivacyLayerClient, generateVoterSecret } from "../sdk/src";

async function main() {
  // Setup connection
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Setup provider (you need a wallet with SOL)
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load the program
  const programId = new PublicKey("APdSGnQuogNbYga3CZUZfSRpAz4agdufXbEPbGCCt9by");
  const program = anchor.workspace.PrivacyLayer as Program;

  // Create privacy layer client
  const client = new PrivacyLayerClient(program, connection, provider);

  console.log("🗳️  Simple Voting Example\n");

  // Step 1: Create a mock election account
  const mockElection = anchor.web3.Keypair.generate();

  // Step 2: Initialize private election
  console.log("📋 Initializing private election...");

  const electionConfig = {
    electionId: new Uint8Array(32), // Random election ID
    mpcPublicKey: new Uint8Array(32), // Mock MPC public key
    voterMerkleRoot: new Uint8Array(32), // Mock voter registry
    endsAt: Date.now() / 1000 + 3600, // Ends in 1 hour
    numOptions: 3, // 3 voting options
  };

  const privateElection = await client.initializePrivateElection(
    mockElection.publicKey,
    electionConfig
  );

  console.log("✅ Election created!");
  console.log("   Address:", privateElection.toString());
  console.log("");

  // Step 3: Generate voter secret
  console.log("🔑 Generating voter secret...");
  const voterSecret = generateVoterSecret();
  console.log("✅ Voter secret generated (keep this private!)");
  console.log("");

  // Step 4: Cast vote
  console.log("🗳️  Casting vote for Option 1...");

  const voteChoice = 0; // Vote for option 0
  const signature = await client.prepareAndCastVote(
    privateElection,
    voteChoice,
    voterSecret
  );

  console.log("✅ Vote cast successfully!");
  console.log("   Transaction:", signature);
  console.log("");

  // Step 5: Verify vote was recorded
  console.log("🔍 Verifying vote...");

  const electionData = await client.getPrivateElection(privateElection);
  console.log("✅ Vote verified!");
  console.log("   Total votes:", electionData.totalEncryptedVotes.toString());
  console.log("");

  console.log("🎉 Complete!");
  console.log("");
  console.log("🔗 View on Solscan:");
  console.log(`   https://solscan.io/account/${privateElection.toString()}?cluster=devnet`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
