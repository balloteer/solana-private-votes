import { keccak256 } from "js-sha3";
import { ElGamalCiphertext, ElGamalPublicKey, VoteCommitment } from "./types";
import { randomBytes, to32Bytes } from "./utils";

/**
 * NOTE: This is a simplified implementation for the MVP.
 * In production, use a proper Curve25519/Ristretto implementation
 * like @noble/curves or a WASM module for proper ElGamal encryption.
 *
 * For now, this generates the randomness needed and creates placeholder
 * ciphertext. The actual encryption should be done with a proper library.
 */

/**
 * Generate encryption randomness (32 bytes)
 * This should be used as the ephemeral key for ElGamal encryption
 */
export function generateEncryptionRandomness(): Uint8Array {
  return randomBytes(32);
}

/**
 * Create a placeholder encrypted vote
 *
 * NOTE: This is a MOCK for MVP purposes. In production, you must use
 * proper ElGamal encryption with Curve25519/Ristretto points.
 *
 * The proper implementation would:
 * 1. Encode the vote as a group element: m * G
 * 2. Generate random r
 * 3. Compute C1 = r * G
 * 4. Compute C2 = m * G + r * Y (where Y is public key)
 *
 * @param vote - Vote choice (0-indexed)
 * @param publicKey - ElGamal public key (32 bytes)
 * @param randomness - Encryption randomness (32 bytes)
 * @returns ElGamal ciphertext
 */
export function encryptVoteMock(
  vote: number,
  publicKey: ElGamalPublicKey,
  randomness: Uint8Array
): ElGamalCiphertext {
  // This is a mock implementation
  // In production, use a proper ElGamal encryption library

  // For MVP, we create deterministic but insecure "encryption"
  const input = new Uint8Array([vote, ...randomness, ...publicKey]);
  const hash1 = keccak256.array(input);
  const hash2 = keccak256.array([...hash1, vote]);

  return {
    c1: new Uint8Array(hash1),
    c2: new Uint8Array(hash2),
  };
}

/**
 * Create a commitment to a vote
 *
 * Commitment = H(vote || blinding_factor)
 *
 * @param vote - Vote choice
 * @param blindingFactor - Random blinding factor (32 bytes)
 * @returns Vote commitment (32 bytes)
 */
export function commitVote(vote: number, blindingFactor: Uint8Array): VoteCommitment {
  const voteBytes = new Uint8Array([vote]);
  const blinding = to32Bytes(blindingFactor);

  const input = new Uint8Array(voteBytes.length + blinding.length);
  input.set(voteBytes, 0);
  input.set(blinding, voteBytes.length);

  const hash = keccak256.array(input);
  return new Uint8Array(hash);
}

/**
 * Create a commitment to encrypted vote data
 *
 * @param ciphertext - Encrypted vote ciphertext
 * @param randomness - Commitment randomness (32 bytes)
 * @returns Commitment (32 bytes)
 */
export function commitEncryptedVote(
  ciphertext: ElGamalCiphertext,
  randomness: Uint8Array
): VoteCommitment {
  const rand = to32Bytes(randomness);

  const input = new Uint8Array(ciphertext.c1.length + ciphertext.c2.length + rand.length);
  input.set(ciphertext.c1, 0);
  input.set(ciphertext.c2, ciphertext.c1.length);
  input.set(rand, ciphertext.c1.length + ciphertext.c2.length);

  const hash = keccak256.array(input);
  return new Uint8Array(hash);
}

/**
 * Helper to prepare vote data for encryption
 * Returns all the cryptographic materials needed to cast a vote
 */
export function prepareVoteData(
  vote: number,
  publicKey: ElGamalPublicKey,
  voterSecret: Uint8Array,
  electionId: Uint8Array
): {
  ciphertext: ElGamalCiphertext;
  nullifier: Uint8Array;
  commitment: VoteCommitment;
  randomness: Uint8Array;
} {
  // Generate randomness
  const encryptionRandomness = generateEncryptionRandomness();
  const commitmentRandomness = randomBytes(32);

  // Encrypt vote (mock for MVP)
  const ciphertext = encryptVoteMock(vote, publicKey, encryptionRandomness);

  // Compute nullifier
  const { computeNullifier } = require("./nullifier");
  const nullifier = computeNullifier(voterSecret, electionId, 0);

  // Create commitment
  const commitment = commitEncryptedVote(ciphertext, commitmentRandomness);

  return {
    ciphertext,
    nullifier,
    commitment,
    randomness: encryptionRandomness,
  };
}
