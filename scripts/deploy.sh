#!/bin/bash
set -e

echo "🚀 Deploying Privacy Layer to Devnet..."
echo ""

# Check for Solana CLI
command -v solana >/dev/null 2>&1 || { echo "❌ solana CLI is required"; exit 1; }

# Check network
echo "🌐 Network Configuration:"
solana config get | grep "RPC URL"
echo ""

# Check wallet
WALLET=$(solana address)
echo "👛 Deployer Wallet: $WALLET"

# Check balance
BALANCE=$(solana balance --lamports | awk '{print $1}')
if [ "$BALANCE" -lt 1000000000 ]; then
    echo "❌ Insufficient balance. Request airdrop:"
    echo "   solana airdrop 2 --url devnet"
    exit 1
fi
echo "💰 Balance: $(echo "scale=2; $BALANCE / 1000000000" | bc) SOL"
echo ""

# Build first
echo "🔨 Building program..."
anchor build
echo ""

# Deploy
echo "📤 Deploying to devnet..."
anchor deploy --provider.cluster devnet
echo ""

# Run deployment script
echo "📝 Saving deployment info..."
ts-node scripts/deploy.ts
echo ""

echo "🎉 Deployment complete!"
echo ""
echo "Run 'yarn setup-election' to create a test election"
