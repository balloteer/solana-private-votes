# Privacy Layer SDK

TypeScript SDK for Solana private voting using ElGamal encryption and Multi-Party Computation (MPC).

## Features

- 🔐 ElGamal encryption for vote privacy
- 🎯 Nullifier-based double-vote prevention
- 🔑 Zero-knowledge proof support (ready for integration)
- 📦 Simple, intuitive API
- ⚡ Full TypeScript support

## Installation

```bash
npm install @balloteer/privacy-layer-sdk
```

## Quick Start

```typescript
import {
  PrivacyLayerClient,
  generateVoterSecret,
  computeNullifier,
  prepareVoteData,
} from "@balloteer/privacy-layer-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";

// Initialize the client
const connection = new Connection("https://api.devnet.solana.com");
const provider = new AnchorProvider(connection, wallet, {});
const program = new Program(idl, programId, provider);
const client = new PrivacyLayerClient(program, connection, provider);

// Generate voter secret (keep this private!)
const voterSecret = generateVoterSecret();

// Cast an encrypted vote
const privateElection = new PublicKey("...");
const vote = 0; // Vote for option 0

const signature = await client.prepareAndCastVote(
  privateElection,
  vote,
  voterSecret
);

console.log("Vote cast! Signature:", signature);
```

## API Documentation

### Vote Encryption

```typescript
// Generate randomness for encryption
const randomness = generateEncryptionRandomness();

// Encrypt a vote (MVP: mock implementation)
const ciphertext = encryptVoteMock(vote, publicKey, randomness);

// Prepare complete vote data
const voteData = prepareVoteData(vote, publicKey, voterSecret, electionId);
```

### Nullifier Management

```typescript
// Compute nullifier (prevents double voting)
const nullifier = computeNullifier(voterSecret, electionId, nonce);

// Verify a nullifier
const isValid = verifyNullifier(nullifier, voterSecret, electionId, nonce);

// Check if already used
const isUsed = await client.isNullifierUsed(election, nullifier);
```

### Election Management

```typescript
// Initialize a private election
const config = {
  electionId: new Uint8Array(32),
  mpcPublicKey: new Uint8Array(32),
  voterMerkleRoot: new Uint8Array(32),
  endsAt: Date.now() + 86400000, // 24 hours
  numOptions: 3,
};

const privateElection = await client.initializePrivateElection(
  electionPubkey,
  config
);

// Get election data
const electionData = await client.getPrivateElection(privateElection);

// Get all encrypted votes
const votes = await client.getEncryptedVotes(privateElection);
```

## Security Considerations

⚠️ **Important**: This is an MVP implementation with the following limitations:

1. **Mock Encryption**: The `encryptVoteMock` function is a placeholder. For production, use a proper Curve25519/Ristretto ElGamal implementation.

2. **No ZK Proofs**: Zero-knowledge proof generation is not yet implemented. The on-chain program accepts votes without proof verification in MVP mode.

3. **Voter Secrets**: Keep voter secrets secure! They are equivalent to a private key for voting.

## Production TODO

- [ ] Replace mock encryption with real Curve25519/Ristretto ElGamal
- [ ] Implement Circom circuit for voter eligibility proofs
- [ ] Add snarkjs integration for ZK proof generation
- [ ] Add comprehensive error handling
- [ ] Add transaction retry logic
- [ ] Add event listening and confirmation
- [ ] Implement homomorphic tallying utilities

## License

MIT
