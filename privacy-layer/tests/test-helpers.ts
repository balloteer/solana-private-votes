/**
 * Test Helper Utilities
 *
 * Common functions used across test suites
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";

/**
 * Generate deterministic test data for elections
 */
export function generateElectionData(seed: number = 0) {
  const electionId = new Uint8Array(32);
  for (let i = 0; i < 32; i++) electionId[i] = (seed + i) % 256;

  const mpcPublicKey = new Uint8Array(32);
  for (let i = 0; i < 32; i++) mpcPublicKey[i] = ((seed + i) * 2) % 256;

  const merkleRoot = new Uint8Array(32);
  for (let i = 0; i < 32; i++) merkleRoot[i] = ((seed + i) * 3) % 256;

  return {
    electionId: Array.from(electionId),
    mpcPublicKey: Array.from(mpcPublicKey),
    merkleRoot: Array.from(merkleRoot),
  };
}

/**
 * Generate a nullifier from a seed
 */
export function generateNullifier(seed: number): number[] {
  const nullifier = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    nullifier[i] = (seed + i * 7) % 256;
  }
  return Array.from(nullifier);
}

/**
 * Generate mock ElGamal ciphertext
 */
export function generateCiphertext(
  vote: number,
  randomness: number
): { c1: number[]; c2: number[] } {
  const c1 = new Uint8Array(32);
  const c2 = new Uint8Array(32);

  for (let i = 0; i < 32; i++) {
    c1[i] = (randomness + i * 5) % 256;
    c2[i] = (randomness + vote + i * 11) % 256;
  }

  return {
    c1: Array.from(c1),
    c2: Array.from(c2),
  };
}

/**
 * Generate a commitment
 */
export function generateCommitment(seed: number): number[] {
  const commitment = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    commitment[i] = (seed + i * 13) % 256;
  }
  return Array.from(commitment);
}

/**
 * Find private election PDA
 */
export function findPrivateElectionPda(
  election: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("private_election"), election.toBuffer()],
    programId
  );
}

/**
 * Find nullifier set PDA
 */
export function findNullifierSetPda(
  election: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("nullifier_set"), election.toBuffer()],
    programId
  );
}

/**
 * Find encrypted vote PDA
 */
export function findEncryptedVotePda(
  privateElection: PublicKey,
  nullifier: number[],
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("encrypted_vote"),
      privateElection.toBuffer(),
      Buffer.from(nullifier),
    ],
    programId
  );
}

/**
 * Initialize a test election
 */
export async function initializeTestElection(
  program: Program,
  mockElection: anchor.web3.Keypair,
  authority: PublicKey,
  options: {
    numOptions?: number;
    endsInSeconds?: number;
    seed?: number;
  } = {}
) {
  const {
    numOptions = 3,
    endsInSeconds = 86400,
    seed = 0,
  } = options;

  const testData = generateElectionData(seed);
  const endsAt = new anchor.BN(Date.now() / 1000 + endsInSeconds);

  const [privateElection] = findPrivateElectionPda(
    mockElection.publicKey,
    program.programId
  );
  const [nullifierSet] = findNullifierSetPda(
    mockElection.publicKey,
    program.programId
  );

  await program.methods
    .initializePrivateElection(
      testData.electionId,
      testData.mpcPublicKey,
      testData.merkleRoot,
      endsAt,
      numOptions
    )
    .accounts({
      privateElection,
      nullifierSet,
      election: mockElection.publicKey,
      authority,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  return { privateElection, nullifierSet, testData };
}

/**
 * Cast a test vote
 */
export async function castTestVote(
  program: Program,
  privateElection: PublicKey,
  nullifierSet: PublicKey,
  voter: PublicKey,
  options: {
    vote?: number;
    seed?: number;
  } = {}
) {
  const { vote = 0, seed = 1 } = options;

  const nullifier = generateNullifier(seed);
  const { c1, c2 } = generateCiphertext(vote, seed * 100);
  const commitment = generateCommitment(seed);

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
      voter,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  return { nullifier, encryptedVote };
}

/**
 * Delay for a specified number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get current Unix timestamp in seconds
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Create a future timestamp
 */
export function getFutureTimestamp(secondsFromNow: number): anchor.BN {
  return new anchor.BN(getCurrentTimestamp() + secondsFromNow);
}

/**
 * Create a past timestamp
 */
export function getPastTimestamp(secondsAgo: number): anchor.BN {
  return new anchor.BN(getCurrentTimestamp() - secondsAgo);
}
