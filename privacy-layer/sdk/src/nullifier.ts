import { keccak256 } from "js-sha3";
import { Nullifier, VoterSecret } from "./types";
import { numberToLeBytes, to32Bytes } from "./utils";

/**
 * Compute a nullifier for vote uniqueness
 *
 * Nullifier = H(voter_secret || election_id || nonce)
 *
 * @param voterSecret - Voter's secret key (32 bytes)
 * @param electionId - Election identifier (32 bytes)
 * @param nonce - Nonce value (default: 0)
 * @returns Nullifier (32 bytes)
 */
export function computeNullifier(
  voterSecret: VoterSecret,
  electionId: Uint8Array,
  nonce: number = 0
): Nullifier {
  // Ensure inputs are correct size
  const secret = to32Bytes(voterSecret);
  const election = to32Bytes(electionId);
  const nonceBytes = numberToLeBytes(nonce, 8);

  // Concatenate all inputs
  const input = new Uint8Array(secret.length + election.length + nonceBytes.length);
  input.set(secret, 0);
  input.set(election, secret.length);
  input.set(nonceBytes, secret.length + election.length);

  // Hash with Keccak256
  const hash = keccak256.array(input);

  return new Uint8Array(hash);
}

/**
 * Verify a nullifier was computed correctly
 *
 * @param nullifier - Nullifier to verify
 * @param voterSecret - Voter's secret key
 * @param electionId - Election identifier
 * @param nonce - Nonce value
 * @returns True if nullifier matches
 */
export function verifyNullifier(
  nullifier: Nullifier,
  voterSecret: VoterSecret,
  electionId: Uint8Array,
  nonce: number = 0
): boolean {
  const computed = computeNullifier(voterSecret, electionId, nonce);

  if (nullifier.length !== computed.length) {
    return false;
  }

  for (let i = 0; i < nullifier.length; i++) {
    if (nullifier[i] !== computed[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Generate a random voter secret
 *
 * @returns Random 32-byte voter secret
 */
export function generateVoterSecret(): VoterSecret {
  const secret = new Uint8Array(32);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(secret);
  } else {
    const crypto = require("crypto");
    const buffer = crypto.randomBytes(32);
    secret.set(buffer);
  }
  return secret;
}
