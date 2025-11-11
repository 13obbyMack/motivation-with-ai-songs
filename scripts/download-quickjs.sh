#!/bin/bash
# Download QuickJS binary for Vercel deployment
# This script downloads the official QuickJS binary from bellard.org

set -e

echo "🚀 Downloading official QuickJS binary..."

# Create directory if it doesn't exist
mkdir -p api/_bin

# Download official QuickJS binary release
echo "📦 Fetching official QuickJS binary (2025-09-13)..."
wget -q https://bellard.org/quickjs/binary_releases/quickjs-linux-x86_64-2025-09-13.zip -O /tmp/quickjs.zip

# Extract the ZIP file
echo "📂 Extracting package..."
cd /tmp
unzip -q quickjs.zip

# Copy the qjs binary
echo "📋 Copying qjs binary..."
cp quickjs-linux-x86_64-2025-09-13/qjs "$(dirname "$0")/../api/_bin/qjs"

# Make it executable
chmod +x "$(dirname "$0")/../api/_bin/qjs"

# Verify
echo "✅ QuickJS binary installed successfully!"
echo ""
echo "📊 Binary info:"
ls -lh "$(dirname "$0")/../api/_bin/qjs"
echo ""
echo "🧪 Testing binary:"
"$(dirname "$0")/../api/_bin/qjs" --help 2>&1 | head -n 3 || echo "Binary extracted (help output may vary)"

# Cleanup
rm -f /tmp/quickjs.zip
rm -rf /tmp/quickjs-linux-x86_64-2025-09-13

echo ""
echo "✨ Done! QuickJS is ready for YouTube downloads."
echo "   Location: api/_bin/qjs"
echo "   Next: Commit this file and deploy to Vercel"
