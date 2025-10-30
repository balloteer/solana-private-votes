/**
 * Privacy Layer SDK
 *
 * TypeScript SDK for Solana private voting using ElGamal encryption and MPC
 */

export * from "./types";
export * from "./utils";
export * from "./crypto";
export * from "./nullifier";
export * from "./client";

// Re-export commonly used functions
export {
  computeNullifier,
  generateVoterSecret,
  verifyNullifier,
} from "./nullifier";

export {
  encryptVoteMock,
  commitVote,
  commitEncryptedVote,
  prepareVoteData,
  generateEncryptionRandomness,
} from "./crypto";

export {
  PrivacyLayerClient,
  createPrivacyLayerClient,
} from "./client";

export {
  hexToBytes,
  bytesToHex,
  randomBytes,
  to32Bytes,
  numberToLeBytes,
} from "./utils";
