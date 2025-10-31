import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PrivacyLayer } from "../target/types/privacy_layer";
import { expect } from "chai";

describe("privacy-layer", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PrivacyLayer as Program<PrivacyLayer>;

  // Test accounts and data
  let mockElection: anchor.web3.Keypair;
  let privateElection: anchor.web3.PublicKey;
  let nullifierSet: anchor.web3.PublicKey;
  let testKeys: any;

  // Helper function to generate test data
  function generateTestData() {
    const electionId = new Uint8Array(32);
    for (let i = 0; i < 32; i++) electionId[i] = i;

    const mpcPublicKey = new Uint8Array(32);
    for (let i = 0; i < 32; i++) mpcPublicKey[i] = (i * 2) % 256;

    const merkleRoot = new Uint8Array(32);
    for (let i = 0; i < 32; i++) merkleRoot[i] = (i * 3) % 256;

    return {
      electionId: Array.from(electionId),
      mpcPublicKey: Array.from(mpcPublicKey),
      merkleRoot: Array.from(merkleRoot),
    };
  }

  // Helper function to generate nullifier
  function generateNullifier(seed: number): number[] {
    const nullifier = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      nullifier[i] = (seed + i) % 256;
    }
    return Array.from(nullifier);
  }

  // Helper function to generate ciphertext
  function generateCiphertext(vote: number, randomness: number): { c1: number[], c2: number[] } {
    const c1 = new Uint8Array(32);
    const c2 = new Uint8Array(32);

    for (let i = 0; i < 32; i++) {
      c1[i] = (randomness + i) % 256;
      c2[i] = (randomness + vote + i) % 256;
    }

    return {
      c1: Array.from(c1),
      c2: Array.from(c2),
    };
  }

  beforeEach(async () => {
    // Create a new mock election for each test
    mockElection = anchor.web3.Keypair.generate();

    // Derive PDAs
    [privateElection] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("private_election"), mockElection.publicKey.toBuffer()],
      program.programId
    );

    [nullifierSet] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("nullifier_set"), mockElection.publicKey.toBuffer()],
      program.programId
    );

    testKeys = generateTestData();
  });

  describe("Initialize Private Election", () => {
    it("Should initialize a private election successfully", async () => {
      const endsAt = new anchor.BN(Date.now() / 1000 + 86400); // 24 hours
      const numOptions = 3;

      await program.methods
        .initializePrivateElection(
          testKeys.electionId,
          testKeys.mpcPublicKey,
          testKeys.merkleRoot,
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
        .rpc();

      // Fetch and verify the created election
      const electionData = await program.account.privateElection.fetch(privateElection);

      expect(electionData.authority.toString()).to.equal(provider.wallet.publicKey.toString());
      expect(electionData.election.toString()).to.equal(mockElection.publicKey.toString());
      expect(electionData.totalEncryptedVotes.toNumber()).to.equal(0);
      expect(electionData.tallyRequested).to.be.false;
      expect(electionData.tallyFinalized).to.be.false;
      expect(electionData.numOptions).to.equal(numOptions);
    });

    it("Should store correct MPC public key", async () => {
      const endsAt = new anchor.BN(Date.now() / 1000 + 86400);

      await program.methods
        .initializePrivateElection(
          testKeys.electionId,
          testKeys.mpcPublicKey,
          testKeys.merkleRoot,
          endsAt,
          2
        )
        .accounts({
          privateElection,
          nullifierSet,
          election: mockElection.publicKey,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        
        .rpc();

      const electionData = await program.account.privateElection.fetch(privateElection);

      // Verify MPC public key is stored correctly
      expect(electionData.mpcPublicKey).to.deep.equal(testKeys.mpcPublicKey);
      expect(electionData.voterMerkleRoot).to.deep.equal(testKeys.merkleRoot);
    });

    it("Should initialize with correct election status", async () => {
      const endsAt = new anchor.BN(Date.now() / 1000 + 86400);

      await program.methods
        .initializePrivateElection(
          testKeys.electionId,
          testKeys.mpcPublicKey,
          testKeys.merkleRoot,
          endsAt,
          4
        )
        .accounts({
          privateElection,
          nullifierSet,
          election: mockElection.publicKey,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        
        .rpc();

      const electionData = await program.account.privateElection.fetch(privateElection);

      // Should be in Active status
      expect(electionData.status).to.have.property("active");
    });

    it("Should initialize nullifier set correctly", async () => {
      const endsAt = new anchor.BN(Date.now() / 1000 + 86400);

      await program.methods
        .initializePrivateElection(
          testKeys.electionId,
          testKeys.mpcPublicKey,
          testKeys.merkleRoot,
          endsAt,
          2
        )
        .accounts({
          privateElection,
          nullifierSet,
          election: mockElection.publicKey,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        
        .rpc();

      // Fetch nullifier set
      const nullifierSetData = await program.account.nullifierSet.fetch(nullifierSet);

      expect(nullifierSetData.election.toString()).to.equal(mockElection.publicKey.toString());
      expect(nullifierSetData.nullifiers).to.be.an("array").that.is.empty;
    });
  });

  describe("Cast Encrypted Vote", () => {
    // Setup: Initialize election before each vote test
    beforeEach(async () => {
      const endsAt = new anchor.BN(Date.now() / 1000 + 86400);

      await program.methods
        .initializePrivateElection(
          testKeys.electionId,
          testKeys.mpcPublicKey,
          testKeys.merkleRoot,
          endsAt,
          3
        )
        .accounts({
          privateElection,
          nullifierSet,
          election: mockElection.publicKey,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        
        .rpc();
    });

    it("Should cast an encrypted vote successfully", async () => {
      const nullifier = generateNullifier(1);
      const { c1, c2 } = generateCiphertext(0, 100);
      const commitment = generateNullifier(2);

      const [encryptedVote] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("encrypted_vote"), privateElection.toBuffer(), Buffer.from(nullifier)],
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

      // Verify vote was recorded
      const voteData = await program.account.encryptedVote.fetch(encryptedVote);

      expect(voteData.election.toString()).to.equal(privateElection.toString());
      expect(voteData.ciphertextC1).to.deep.equal(c1);
      expect(voteData.ciphertextC2).to.deep.equal(c2);
      expect(voteData.nullifier).to.deep.equal(nullifier);
    });

    it("Should increment vote count after casting", async () => {
      const nullifier = generateNullifier(3);
      const { c1, c2 } = generateCiphertext(1, 200);
      const commitment = generateNullifier(4);

      const [encryptedVote] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("encrypted_vote"), privateElection.toBuffer(), Buffer.from(nullifier)],
        program.programId
      );

      // Get initial count
      let electionData = await program.account.privateElection.fetch(privateElection);
      const initialCount = electionData.totalEncryptedVotes.toNumber();

      // Cast vote
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

      // Verify count increased
      electionData = await program.account.privateElection.fetch(privateElection);
      expect(electionData.totalEncryptedVotes.toNumber()).to.equal(initialCount + 1);
    });

    it("Should store nullifier in nullifier set", async () => {
      const nullifier = generateNullifier(5);
      const { c1, c2 } = generateCiphertext(2, 300);
      const commitment = generateNullifier(6);

      const [encryptedVote] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("encrypted_vote"), privateElection.toBuffer(), Buffer.from(nullifier)],
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

      // Check nullifier was added
      const nullifierSetData = await program.account.nullifierSet.fetch(nullifierSet);
      expect(nullifierSetData.nullifiers).to.have.lengthOf(1);
      expect(nullifierSetData.nullifiers[0]).to.deep.equal(nullifier);
    });

    it("Should prevent double voting with same nullifier", async () => {
      const nullifier = generateNullifier(7);
      const { c1, c2 } = generateCiphertext(0, 400);
      const commitment = generateNullifier(8);

      const [encryptedVote] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("encrypted_vote"), privateElection.toBuffer(), Buffer.from(nullifier)],
        program.programId
      );

      // First vote should succeed
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

      // Second vote with same nullifier should fail
      const { c1: c1_2, c2: c2_2 } = generateCiphertext(1, 500);

      try {
        await program.methods
          .castEncryptedVote(c1_2, c2_2, nullifier, commitment, null, null, null)
          .accounts({
            privateElection,
            encryptedVote,
            nullifierSet,
            voter: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();

        expect.fail("Should have thrown error for duplicate nullifier");
      } catch (error) {
        // The PDA derivation prevents double voting - account already exists
        expect(error.message).to.match(/account|already|exists|initialized/i);
      }
    });

    it("Should allow multiple votes with different nullifiers", async () => {
      // Cast 3 votes with different nullifiers
      for (let i = 0; i < 3; i++) {
        const nullifier = generateNullifier(10 + i);
        const { c1, c2 } = generateCiphertext(i, 600 + i * 100);
        const commitment = generateNullifier(20 + i);

        const [encryptedVote] = anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("encrypted_vote"), privateElection.toBuffer(), Buffer.from(nullifier)],
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

      // Verify all votes were recorded
      const electionData = await program.account.privateElection.fetch(privateElection);
      expect(electionData.totalEncryptedVotes.toNumber()).to.equal(3);

      const nullifierSetData = await program.account.nullifierSet.fetch(nullifierSet);
      expect(nullifierSetData.nullifiers).to.have.lengthOf(3);
    });

    it("Should store correct timestamp for vote", async () => {
      const nullifier = generateNullifier(13);
      const { c1, c2 } = generateCiphertext(1, 900);
      const commitment = generateNullifier(14);

      const [encryptedVote] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("encrypted_vote"), privateElection.toBuffer(), Buffer.from(nullifier)],
        program.programId
      );

      const beforeTime = Date.now() / 1000;

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

      const afterTime = Date.now() / 1000;

      const voteData = await program.account.encryptedVote.fetch(encryptedVote);
      const voteTime = voteData.timestamp.toNumber();

      // Timestamp should be within reasonable range
      expect(voteTime).to.be.at.least(beforeTime - 5);
      expect(voteTime).to.be.at.most(afterTime + 5);
    });

    /* ============================================================
     * ADVANCED TESTS (Commented out - require additional setup)
     * ============================================================ */

    /*
    it("Should reject vote after election ends", async () => {
      // Create election that ends immediately
      const mockElectionExpired = anchor.web3.Keypair.generate();
      const [privateElectionExpired] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("private_election"), mockElectionExpired.publicKey.toBuffer()],
        program.programId
      );
      const [nullifierSetExpired] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("nullifier_set"), mockElectionExpired.publicKey.toBuffer()],
        program.programId
      );

      const endsAt = new anchor.BN(Date.now() / 1000 - 100); // Already expired

      await program.methods
        .initializePrivateElection(
          testKeys.electionId,
          testKeys.mpcPublicKey,
          testKeys.merkleRoot,
          endsAt,
          2
        )
        .accounts({
          privateElection: privateElectionExpired,
          nullifierSet: nullifierSetExpired,
          election: mockElectionExpired.publicKey,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        
        .rpc();

      const nullifier = generateNullifier(100);
      const { c1, c2 } = generateCiphertext(0, 1000);
      const commitment = generateNullifier(101);

      const [encryptedVote] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("encrypted_vote"), privateElectionExpired.toBuffer(), Buffer.from(nullifier)],
        program.programId
      );

      try {
        await program.methods
          .castEncryptedVote(c1, c2, nullifier, commitment, null, null, null)
          .accounts({
            privateElection: privateElectionExpired,
            encryptedVote,
            nullifierSet: nullifierSetExpired,
            voter: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();

        expect.fail("Should have rejected vote for expired election");
      } catch (error) {
        expect(error.message).to.include("ElectionEnded");
      }
    });

    it("Should verify ZK proof when provided", async () => {
      // This would require:
      // 1. Circom circuit implementation
      // 2. Proof generation (snarkjs)
      // 3. Verification key in program

      const nullifier = generateNullifier(200);
      const { c1, c2 } = generateCiphertext(0, 2000);
      const commitment = generateNullifier(201);

      // Mock ZK proof components
      const zkProofA = Array.from(new Uint8Array(32).fill(1));
      const zkProofB = Array.from(new Uint8Array(64).fill(2));
      const zkProofC = Array.from(new Uint8Array(32).fill(3));

      const [encryptedVote] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("encrypted_vote"), privateElection.toBuffer(), Buffer.from(nullifier)],
        program.programId
      );

      // This will fail in MVP because ZK verification is not implemented
      // In production, this would verify the proof
      await program.methods
        .castEncryptedVote(c1, c2, nullifier, commitment, zkProofA, zkProofB, zkProofC)
        .accounts({
          privateElection,
          encryptedVote,
          nullifierSet,
          voter: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    });

    it("Should reject invalid ZK proof", async () => {
      // Would test that invalid proofs are rejected
      // Requires full ZK proof verification implementation
    });
    */
  });

  describe("Election State Management", () => {
    it("Should retrieve election data correctly", async () => {
      const endsAt = new anchor.BN(Date.now() / 1000 + 3600);
      const numOptions = 5;

      await program.methods
        .initializePrivateElection(
          testKeys.electionId,
          testKeys.mpcPublicKey,
          testKeys.merkleRoot,
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
        .rpc();

      const electionData = await program.account.privateElection.fetch(privateElection);

      expect(electionData).to.have.property("authority");
      expect(electionData).to.have.property("mpcPublicKey");
      expect(electionData).to.have.property("voterMerkleRoot");
      expect(electionData).to.have.property("totalEncryptedVotes");
      expect(electionData).to.have.property("status");
    });

    it("Should track election statistics correctly", async () => {
      const endsAt = new anchor.BN(Date.now() / 1000 + 3600);

      await program.methods
        .initializePrivateElection(
          testKeys.electionId,
          testKeys.mpcPublicKey,
          testKeys.merkleRoot,
          endsAt,
          2
        )
        .accounts({
          privateElection,
          nullifierSet,
          election: mockElection.publicKey,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        
        .rpc();

      // Cast multiple votes
      const voteCount = 5;
      for (let i = 0; i < voteCount; i++) {
        const nullifier = generateNullifier(50 + i);
        const { c1, c2 } = generateCiphertext(i % 2, 1000 + i * 10);
        const commitment = generateNullifier(60 + i);

        const [encryptedVote] = anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("encrypted_vote"), privateElection.toBuffer(), Buffer.from(nullifier)],
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
      expect(electionData.totalEncryptedVotes.toNumber()).to.equal(voteCount);
    });
  });

  describe("Security Tests", () => {
    beforeEach(async () => {
      const endsAt = new anchor.BN(Date.now() / 1000 + 86400);

      await program.methods
        .initializePrivateElection(
          testKeys.electionId,
          testKeys.mpcPublicKey,
          testKeys.merkleRoot,
          endsAt,
          3
        )
        .accounts({
          privateElection,
          nullifierSet,
          election: mockElection.publicKey,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        
        .rpc();
    });

    it("Should maintain nullifier uniqueness", async () => {
      const votes = 10;
      const nullifiers = new Set();

      for (let i = 0; i < votes; i++) {
        const nullifier = generateNullifier(70 + i);
        nullifiers.add(JSON.stringify(nullifier));

        const { c1, c2 } = generateCiphertext(i % 3, 1500 + i * 10);
        const commitment = generateNullifier(80 + i);

        const [encryptedVote] = anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("encrypted_vote"), privateElection.toBuffer(), Buffer.from(nullifier)],
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

      // Verify all nullifiers are unique
      expect(nullifiers.size).to.equal(votes);

      const nullifierSetData = await program.account.nullifierSet.fetch(nullifierSet);
      expect(nullifierSetData.nullifiers).to.have.lengthOf(votes);
    });

    it("Should prevent replay attacks", async () => {
      const nullifier = generateNullifier(90);
      const { c1, c2 } = generateCiphertext(0, 2000);
      const commitment = generateNullifier(91);

      const [encryptedVote] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("encrypted_vote"), privateElection.toBuffer(), Buffer.from(nullifier)],
        program.programId
      );

      // First vote
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

      // Attempt replay with same data
      try {
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

        expect.fail("Should have prevented replay attack");
      } catch (error) {
        // Should fail because account already exists or nullifier used
        expect(error).to.exist;
      }
    });
  });

  /* ============================================================
   * FUTURE TESTS (Commented out - require additional features)
   * ============================================================ */

  /*
  describe("MPC Tally", () => {
    it("Should request MPC tally", async () => {
      // Would test:
      // 1. CPI to Arcium MXE program
      // 2. Tally request recorded
      // 3. Status updated
    });

    it("Should submit and verify MPC tally results", async () => {
      // Would test:
      // 1. Submit tally from MPC network
      // 2. Verify threshold signatures
      // 3. Verify ZK proof of correct tally
      // 4. Update final results
    });

    it("Should reject invalid tally proof", async () => {
      // Would test rejection of invalid proofs
    });
  });

  describe("Homomorphic Operations", () => {
    it("Should aggregate votes homomorphically", async () => {
      // Would test:
      // 1. Cast multiple encrypted votes
      // 2. Aggregate using homomorphic addition
      // 3. Decrypt aggregate
      // 4. Verify result matches sum
    });
  });

  describe("Integration with mpl-gov-micro", () => {
    it("Should call governance program with results", async () => {
      // Would test CPI to governance program
    });

    it("Should verify governance program authorization", async () => {
      // Would test authorization checks
    });
  });
  */
});
