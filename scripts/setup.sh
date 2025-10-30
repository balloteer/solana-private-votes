#!/bin/bash
set -e

echo "🔧 Setting up Privacy Layer development environment..."
echo ""

# Check for required tools
command -v node >/dev/null 2>&1 || { echo "❌ node is required but not installed"; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo "❌ cargo is required but not installed"; exit 1; }
command -v anchor >/dev/null 2>&1 || { echo "❌ anchor is required but not installed"; exit 1; }

echo "✅ All required tools found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
yarn install

# Build crypto library
echo "🔨 Building crypto library..."
cargo build -p privacy-crypto

# Build SDK
echo "📘 Building SDK..."
cd sdk && yarn install && cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. yarn build       - Build the program"
echo "  2. yarn deploy      - Deploy to devnet"
echo "  3. yarn demo        - Run the demo"
