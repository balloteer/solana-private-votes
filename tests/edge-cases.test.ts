import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PrivacyLayer } from "../target/types/privacy_layer";
import { expect } from "chai";
import {
  generateElectionData,
  generateNullifier,
  generateCiphertext,
  generateCommitment,
  findPrivateElectionPda,
  findNullifierSetPda,
  findEncryptedVotePda,
  initializeTestElection,
  castTestVote,
} from "./test-helpers";

describe("Edge Cases & Stress Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PrivacyLayer as Program<PrivacyLayer>;

  describe("Boundary Conditions", () => {
    it("Should handle election with minimum options (1)", async () => {
      const mockElection = anchor.web3.Keypair.generate();

      const { privateElection } = await initializeTestElection(
        program,
        mockElection,
        provider.wallet.publicKey,
        { numOptions: 1 }
      );

      const electionData = await program.account.privateElection.fetch(privateElection);
      expect(electionData.numOptions).to.equal(1);
    });

    it("Should handle election with many options (255)", async () => {
      const mockElection = anchor.web3.Keypair.generate();

      const { privateElection } = await initializeTestElection(
        program,
        mockElection,
        provider.wallet.publicKey,
        { numOptions: 255 }
      );

      const electionData = await program.account.privateElection.fetch(privateElection);
      expect(electionData.numOptions).to.equal(255);
    });

    it("Should handle zero bytes in nullifier", async () => {
      const mockElection = anchor.web3.Keypair.generate();

      const { privateElection, nullifierSet } = await initializeTestElection(
        program,
        mockElection,
        provider.wallet.publicKey
      );

      // Create nullifier with all zeros
      const nullifier = Array.from(new Uint8Array(32).fill(0));
      const { c1, c2 } = generateCiphertext(0, 100);
      const commitment = generateCommitment(1);

      const [encryptedVote] = findEncryptedVotePda(
        privateElection,
        nullifier,
        program.programId
      );

      await program.methods
        .castEncryptedVote(c1, c2, nullifier, commitment, null, null, null)
        .accounts({
          privateElection,
          encryptedVote,
          nullifierSet,
          voter: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const voteData = await program.account.encryptedVote.fetch(encryptedVote);
      expect(voteData.nullifier).to.deep.equal(nullifier);
    });

    it("Should handle max bytes in nullifier", async () => {
      const mockElection = anchor.web3.Keypair.generate();

      const { privateElection, nullifierSet } = await initializeTestElection(
        program,
        mockElection,
        provider.wallet.publicKey
      );

      // Create nullifier with all 255s
      const nullifier = Array.from(new Uint8Array(32).fill(255));
      const { c1, c2 } = generateCiphertext(0, 200);
      const commitment = generateCommitment(2);

      const [encryptedVote] = findEncryptedVotePda(
        privateElection,
        nullifier,
        program.programId
      );

      await program.methods
        .castEncryptedVote(c1, c2, nullifier, commitment, null, null, null)
        .accounts({
          privateElection,
          encryptedVote,
          nullifierSet,
          voter: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const voteData = await program.account.encryptedVote.fetch(encryptedVote);
      expect(voteData.nullifier).to.deep.equal(nullifier);
    });
  });

  describe("Multiple Elections", () => {
    it("Should handle multiple elections independently", async () => {
      // Create 3 separate elections
      const elections = [];

      for (let i = 0; i < 3; i++) {
        const mockElection = anchor.web3.Keypair.generate();
        const result = await initializeTestElection(
          program,
          mockElection,
          provider.wallet.publicKey,
          { seed: i * 100 }
        );
        elections.push(result);
      }

      // Cast vote in each election
      for (let i = 0; i < 3; i++) {
        const { privateElection, nullifierSet } = elections[i];
        await castTestVote(
          program,
          privateElection,
          nullifierSet,
          provider.wallet.publicKey,
          { seed: i + 1 }
        );
      }

      // Verify each election has 1 vote
      for (const { privateElection } of elections) {
        const electionData = await program.account.privateElection.fetch(privateElection);
        expect(electionData.totalEncryptedVotes.toNumber()).to.equal(1);
      }
    });

    it("Should allow same nullifier in different elections", async () => {
      // Create 2 elections
      const mockElection1 = anchor.web3.Keypair.generate();
      const mockElection2 = anchor.web3.Keypair.generate();

      const election1 = await initializeTestElection(
        program,
        mockElection1,
        provider.wallet.publicKey,
        { seed: 1000 }
      );

      const election2 = await initializeTestElection(
        program,
        mockElection2,
        provider.wallet.publicKey,
        { seed: 2000 }
      );

      // Use same nullifier in both elections (allowed)
      const sharedNullifier = generateNullifier(999);
      const { c1, c2 } = generateCiphertext(0, 300);
      const commitment = generateCommitment(3);

      // Cast in election 1
      const [encryptedVote1] = findEncryptedVotePda(
        election1.privateElection,
        sharedNullifier,
        program.programId
      );

      await program.methods
        .castEncryptedVote(c1, c2, sharedNullifier, commitment, null, null, null)
        .accounts({
          privateElection: election1.privateElection,
          encryptedVote: encryptedVote1,
          nullifierSet: election1.nullifierSet,
          voter: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      // Cast in election 2 (should work - different election)
      const [encryptedVote2] = findEncryptedVotePda(
        election2.privateElection,
        sharedNullifier,
        program.programId
      );

      await program.methods
        .castEncryptedVote(c1, c2, sharedNullifier, commitment, null, null, null)
        .accounts({
          privateElection: election2.privateElection,
          encryptedVote: encryptedVote2,
          nullifierSet: election2.nullifierSet,
          voter: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      // Both should have succeeded
      const vote1 = await program.account.encryptedVote.fetch(encryptedVote1);
      const vote2 = await program.account.encryptedVote.fetch(encryptedVote2);

      expect(vote1.nullifier).to.deep.equal(sharedNullifier);
      expect(vote2.nullifier).to.deep.equal(sharedNullifier);
    });
  });

  describe("Stress Tests", () => {
    it("Should handle 10 sequential votes", async () => {
      const mockElection = anchor.web3.Keypair.generate();

      const { privateElection, nullifierSet } = await initializeTestElection(
        program,
        mockElection,
        provider.wallet.publicKey
      );

      // Cast 10 votes
      const voteCount = 10;
      for (let i = 0; i < voteCount; i++) {
        await castTestVote(
          program,
          privateElection,
          nullifierSet,
          provider.wallet.publicKey,
          { vote: i % 3, seed: 100 + i }
        );
      }

      const electionData = await program.account.privateElection.fetch(privateElection);
      expect(electionData.totalEncryptedVotes.toNumber()).to.equal(voteCount);

      const nullifierSetData = await program.account.nullifierSet.fetch(nullifierSet);
      expect(nullifierSetData.nullifiers).to.have.lengthOf(voteCount);
    });

    it("Should handle votes with sequential nullifiers", async () => {
      const mockElection = anchor.web3.Keypair.generate();

      const { privateElection, nullifierSet } = await initializeTestElection(
        program,
        mockElection,
        provider.wallet.publicKey
      );

      // Cast 5 votes with sequential nullifiers
      for (let i = 0; i < 5; i++) {
        const nullifier = generateNullifier(1000 + i);
        const { c1, c2 } = generateCiphertext(i % 2, 400 + i);
        const commitment = generateCommitment(10 + i);

        const [encryptedVote] = findEncryptedVotePda(
          privateElection,
          nullifier,
          program.programId
        );

        await program.methods
          .castEncryptedVote(c1, c2, nullifier, commitment, null, null, null)
          .accounts({
            privateElection,
            encryptedVote,
            nullifierSet,
            voter: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
      }

      const electionData = await program.account.privateElection.fetch(privateElection);
      expect(electionData.totalEncryptedVotes.toNumber()).to.equal(5);
    });
  });

  describe("Data Integrity", () => {
    it("Should preserve ciphertext integrity", async () => {
      const mockElection = anchor.web3.Keypair.generate();

      const { privateElection, nullifierSet } = await initializeTestElection(
        program,
        mockElection,
        provider.wallet.publicKey
      );

      const nullifier = generateNullifier(2000);
      const originalCiphertext = generateCiphertext(1, 500);
      const commitment = generateCommitment(20);

      const [encryptedVote] = findEncryptedVotePda(
        privateElection,
        nullifier,
        program.programId
      );

      await program.methods
        .castEncryptedVote(
          originalCiphertext.c1,
          originalCiphertext.c2,
          nullifier,
          commitment,
          null,
          null,
          null
        )
        .accounts({
          privateElection,
          encryptedVote,
          nullifierSet,
          voter: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const voteData = await program.account.encryptedVote.fetch(encryptedVote);

      // Verify ciphertext matches exactly
      expect(voteData.ciphertextC1).to.deep.equal(originalCiphertext.c1);
      expect(voteData.ciphertextC2).to.deep.equal(originalCiphertext.c2);
    });

    it("Should preserve commitment integrity", async () => {
      const mockElection = anchor.web3.Keypair.generate();

      const { privateElection, nullifierSet } = await initializeTestElection(
        program,
        mockElection,
        provider.wallet.publicKey
      );

      const nullifier = generateNullifier(3000);
      const { c1, c2 } = generateCiphertext(2, 600);
      const originalCommitment = generateCommitment(30);

      const [encryptedVote] = findEncryptedVotePda(
        privateElection,
        nullifier,
        program.programId
      );

      await program.methods
        .castEncryptedVote(c1, c2, nullifier, originalCommitment, null, null, null)
        .accounts({
          privateElection,
          encryptedVote,
          nullifierSet,
          voter: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const voteData = await program.account.encryptedVote.fetch(encryptedVote);

      // Verify commitment matches exactly
      expect(voteData.commitment).to.deep.equal(originalCommitment);
    });
  });

  /* ============================================================
   * FUTURE EDGE CASE TESTS (Commented out)
   * ============================================================ */

  /*
  describe("Time-based Edge Cases", () => {
    it("Should reject vote exactly 1 second after election ends", async () => {
      // Would test precise timing boundaries
    });

    it("Should accept vote exactly 1 second before election ends", async () => {
      // Would test precise timing boundaries
    });
  });

  describe("Account Size Limits", () => {
    it("Should handle maximum nullifier set size", async () => {
      // Would test limits of account size
      // May need to implement pagination or compression
    });

    it("Should handle reallocation when nullifier set grows", async () => {
      // Would test account reallocation
    });
  });

  describe("Concurrent Operations", () => {
    it("Should handle concurrent vote submissions", async () => {
      // Would test race conditions
      // Multiple voters submitting simultaneously
    });

    it("Should handle concurrent initialization attempts", async () => {
      // Would test initialization race conditions
    });
  });
  */
});
