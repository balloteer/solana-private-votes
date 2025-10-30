import { PublicKey } from "@solana/web3.js";

/**
 * ElGamal public key (32 bytes)
 */
export type ElGamalPublicKey = Uint8Array;

/**
 * ElGamal ciphertext (64 bytes total: c1 + c2)
 */
export interface ElGamalCiphertext {
  c1: Uint8Array; // 32 bytes
  c2: Uint8Array; // 32 bytes
}

/**
 * Voter secret (32 bytes)
 * Used to compute nullifiers and prove eligibility
 */
export type VoterSecret = Uint8Array;

/**
 * Nullifier (32 bytes)
 * Prevents double voting
 */
export type Nullifier = Uint8Array;

/**
 * Vote commitment (32 bytes)
 */
export type VoteCommitment = Uint8Array;

/**
 * Private election configuration
 */
export interface PrivateElectionConfig {
  electionId: Uint8Array; // 32 bytes
  mpcPublicKey: ElGamalPublicKey;
  voterMerkleRoot: Uint8Array; // 32 bytes
  endsAt: number; // Unix timestamp
  numOptions: number;
}

/**
 * Encrypted vote data
 */
export interface EncryptedVoteData {
  ciphertext: ElGamalCiphertext;
  nullifier: Nullifier;
  commitment: VoteCommitment;
  // ZK proof components (optional for MVP)
  zkProof?: {
    a: Uint8Array; // 32 bytes
    b: Uint8Array; // 64 bytes
    c: Uint8Array; // 32 bytes
  };
}
