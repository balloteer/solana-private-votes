#!/bin/bash
set -e

echo "🔨 Building Privacy Layer..."
echo ""

# Build crypto library
echo "📦 Building crypto library..."
cargo build -p privacy-crypto --release
echo "✅ Crypto library built"
echo ""

# Build Solana program
echo "⚙️  Building Solana program..."
anchor build
echo "✅ Program built"
echo ""

# Build SDK
echo "📘 Building SDK..."
cd sdk && yarn build && cd ..
echo "✅ SDK built"
echo ""

echo "🎉 Build complete!"
echo ""
echo "Program artifacts:"
ls -lh target/deploy/*.so 2>/dev/null || echo "  (Program not found - this is normal before first deployment)"
