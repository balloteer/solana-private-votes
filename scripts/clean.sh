#!/bin/bash

echo "🧹 Cleaning Privacy Layer..."
echo ""

# Clean Rust
echo "🦀 Cleaning Rust artifacts..."
cargo clean
rm -rf target/

# Clean Node
echo "📦 Cleaning Node modules..."
rm -rf node_modules/
rm -rf sdk/node_modules/
rm -rf sdk/dist/

# Clean test artifacts
echo "🗑️  Cleaning test artifacts..."
rm -rf .anchor/
rm -rf test-ledger/

# Clean deployments (optional - comment out if you want to keep)
# rm -rf deployments/*.json

echo ""
echo "✅ Clean complete!"
