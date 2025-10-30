import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PrivacyLayer } from "../target/types/privacy_layer";

/**
 * Benchmark the privacy layer performance
 */

interface BenchmarkResult {
  operation: string;
  computeUnits: number;
  transactionSize: number;
  estimatedCost: number; // in SOL
}

async function benchmark() {
  console.log("📊 Privacy Layer Performance Benchmarks\n");
  console.log("=" .repeat(70));
  console.log("");

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PrivacyLayer as Program<PrivacyLayer>;

  const results: BenchmarkResult[] = [];

  // 1. Initialize Private Election
  console.log("🔧 Benchmarking: Initialize Private Election");

  const mockElection = anchor.web3.Keypair.generate();
  const electionId = Array.from(new Uint8Array(32));
  const mpcPublicKey = Array.from(new Uint8Array(32));
  const merkleRoot = Array.from(new Uint8Array(32));
  const endsAt = new anchor.BN(Date.now() / 1000 + 86400);

  const [privateElection] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("private_election"), mockElection.publicKey.toBuffer()],
    program.programId
  );

  const [nullifierSet] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("nullifier_set"), mockElection.publicKey.toBuffer()],
    program.programId
  );

  try {
    const tx = await program.methods
      .initializePrivateElection(electionId, mpcPublicKey, merkleRoot, endsAt, 3)
      .accounts({
        privateElection,
        nullifierSet,
        election: mockElection.publicKey,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([mockElection])
      .rpc({ commitment: "confirmed" });

    const txDetails = await provider.connection.getTransaction(tx, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (txDetails && txDetails.meta) {
      const computeUnits = txDetails.meta.computeUnitsConsumed || 0;
      const fee = txDetails.meta.fee / anchor.web3.LAMPORTS_PER_SOL;

      results.push({
        operation: "Initialize Private Election",
        computeUnits,
        transactionSize: txDetails.transaction.message.serialize().length,
        estimatedCost: fee,
      });

      console.log(`   ✅ Compute Units: ${computeUnits.toLocaleString()}`);
      console.log(`   💰 Cost: ${fee.toFixed(9)} SOL`);
    }
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
  }

  console.log("");

  // 2. Cast Encrypted Vote
  console.log("🗳️  Benchmarking: Cast Encrypted Vote");

  const nullifier = Array.from(new Uint8Array(32));
  const ciphertextC1 = Array.from(new Uint8Array(32));
  const ciphertextC2 = Array.from(new Uint8Array(32));
  const commitment = Array.from(new Uint8Array(32));

  const [encryptedVote] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("encrypted_vote"), privateElection.toBuffer(), Buffer.from(nullifier)],
    program.programId
  );

  try {
    const tx = await program.methods
      .castEncryptedVote(ciphertextC1, ciphertextC2, nullifier, commitment, null, null, null)
      .accounts({
        privateElection,
        encryptedVote,
        nullifierSet,
        voter: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ commitment: "confirmed" });

    const txDetails = await provider.connection.getTransaction(tx, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (txDetails && txDetails.meta) {
      const computeUnits = txDetails.meta.computeUnitsConsumed || 0;
      const fee = txDetails.meta.fee / anchor.web3.LAMPORTS_PER_SOL;

      results.push({
        operation: "Cast Encrypted Vote",
        computeUnits,
        transactionSize: txDetails.transaction.message.serialize().length,
        estimatedCost: fee,
      });

      console.log(`   ✅ Compute Units: ${computeUnits.toLocaleString()}`);
      console.log(`   💰 Cost: ${fee.toFixed(9)} SOL`);
    }
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
  }

  console.log("");
  console.log("=" .repeat(70));
  console.log("");

  // Summary table
  console.log("📊 BENCHMARK SUMMARY\n");
  console.log("Operation                      | Compute Units | TX Size | Cost (SOL)");
  console.log("-------------------------------|---------------|---------|-------------");

  results.forEach((result) => {
    const operation = result.operation.padEnd(30);
    const cu = result.computeUnits.toLocaleString().padStart(13);
    const size = `${result.transactionSize}B`.padStart(7);
    const cost = result.estimatedCost.toFixed(9).padStart(11);
    console.log(`${operation} | ${cu} | ${size} | ${cost}`);
  });

  console.log("");

  // Cost projections
  const voteCount = 1000;
  const voteCost = results.find((r) => r.operation === "Cast Encrypted Vote")?.estimatedCost || 0;
  const totalCost = voteCost * voteCount;

  console.log("💰 Cost Projections:\n");
  console.log(`   Per Vote:        ${voteCost.toFixed(9)} SOL (~$${(voteCost * 100).toFixed(4)})`);
  console.log(`   Per 100 Votes:   ${(voteCost * 100).toFixed(9)} SOL (~$${(voteCost * 100 * 100).toFixed(2)})`);
  console.log(`   Per 1000 Votes:  ${totalCost.toFixed(6)} SOL (~$${(totalCost * 100).toFixed(2)})`);
  console.log("");

  // Comparison
  const publicVoteCost = 0.000005; // Estimated
  const privacyPremium = voteCost / publicVoteCost;

  console.log("📈 Comparison with Public Voting:\n");
  console.log(`   Public Vote Cost:    ~${publicVoteCost.toFixed(9)} SOL`);
  console.log(`   Private Vote Cost:   ~${voteCost.toFixed(9)} SOL`);
  console.log(`   Privacy Premium:     ${privacyPremium.toFixed(1)}x`);
  console.log(`   Trade-off:           Privacy vs Cost (acceptable for sensitive elections)`);
  console.log("");
}

benchmark()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Benchmark failed:", error);
    process.exit(1);
  });
