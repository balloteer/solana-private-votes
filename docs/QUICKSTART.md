# 🚀 Quick Start Guide

Get the privacy layer running in **5 minutes**.

## Prerequisites

- Node.js 18+
- Yarn or npm
- Git

*Optional for full deployment:*
- Rust 1.75+
- Solana CLI 1.18+
- Anchor 0.32+

## Installation

```bash
# Clone the repository
git clone https://github.com/balloteer/solana-private-votes
cd solana-private-votes/privacy-layer

# Install dependencies
yarn install
```

## Option 1: Quick Demo (Devnet)

Run the demo using our deployed program:

```bash
# Run the interactive demo
yarn demo
```

This connects to our devnet deployment and shows:
- Election initialization
- Multiple voters casting encrypted votes
- Double-vote prevention
- Mock tally results

## Option 2: Full Setup (Local/Devnet)

Deploy your own instance:

```bash
# 1. Setup environment
yarn setup

# 2. Build everything
yarn build

# 3. Configure Solana for devnet
solana config set --url devnet
solana-keygen new  # Create wallet if needed

# 4. Request SOL airdrop
solana airdrop 2

# 5. Deploy program
yarn deploy

# 6. Generate test keys (mock MPC)
yarn generate-keys

# 7. Setup test election
yarn setup-election

# 8. Run demo
yarn demo

# 9. Run benchmarks
yarn benchmark
```

## Available Scripts

### Core Operations

- `yarn setup` - Install all dependencies
- `yarn build` - Build program and SDK
- `yarn deploy` - Deploy to devnet
- `yarn test` - Run all tests

### Development

- `yarn generate-keys` - Generate test MPC keys
- `yarn setup-election` - Initialize test election
- `yarn demo` - Run interactive demo
- `yarn benchmark` - Performance benchmarks

### Testing

- `yarn test:unit` - Rust crypto library tests
- `yarn test:integration` - TypeScript integration tests

### Maintenance

- `yarn clean` - Clean all build artifacts
- `yarn lint` - Run linters

## Project Structure

```
privacy-layer/
├── programs/privacy-layer/    # Solana program (Rust/Anchor)
├── crates/crypto/            # Cryptography library
├── sdk/                      # TypeScript SDK
├── scripts/                  # Deployment & demo scripts
├── tests/                    # Test suites
└── deployments/              # Deployment artifacts
```

## Using the SDK

### Installation

```bash
# In your project
yarn add @balloteer/privacy-layer-sdk
```

### Basic Usage

```typescript
import {
  PrivacyLayerClient,
  generateVoterSecret,
} from "@balloteer/privacy-layer-sdk";
import { Connection } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";

// Setup
const connection = new Connection("https://api.devnet.solana.com");
const provider = new AnchorProvider(connection, wallet, {});
const program = new Program(idl, programId, provider);

// Create client
const client = new PrivacyLayerClient(program, connection, provider);

// Generate voter secret
const voterSecret = generateVoterSecret();

// Cast vote
const signature = await client.prepareAndCastVote(
  privateElectionPubkey,
  voteChoice,
  voterSecret
);
```

## Next Steps

1. **Read the Docs**
   - [Architecture](../PRIVACY_LAYER_SPEC.md)
   - [API Reference](../sdk/README.md)
   - [Demo Guide](../../DEMO.md)

2. **Explore Examples**
   - See `examples/` directory
   - Check test files in `tests/`

3. **Try Benchmarks**
   ```bash
   yarn benchmark
   ```

4. **View on Solscan**
   - Program: [View on Devnet](https://solscan.io/account/APdSGnQuogNbYga3CZUZfSRpAz4agdufXbEPbGCCt9by?cluster=devnet)

## Troubleshooting

### "Insufficient SOL balance"

```bash
solana airdrop 2 --url devnet
```

### "Program not found"

Make sure you've deployed:
```bash
yarn deploy
```

### "Test keys not found"

Generate them first:
```bash
yarn generate-keys
```

### Build errors

Clean and rebuild:
```bash
yarn clean
yarn setup
yarn build
```

## Support

- **Issues**: [GitHub Issues](https://github.com/balloteer/solana-private-votes/issues)
- **Docs**: [Full Documentation](../PRIVACY_LAYER_SPEC.md)
- **Twitter**: [@BalloteerHQ](https://twitter.com/BalloteerHQ)

---

Ready to build privacy-preserving governance on Solana! 🚀
