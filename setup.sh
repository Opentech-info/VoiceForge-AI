#!/bin/bash

# VoiceForge AI - Installation Script
# This script helps you set up VoiceForge AI quickly

echo "🎙️  VoiceForge AI - Setup Script"
echo "=================================="
echo ""

# Check Node.js
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js $NODE_VERSION found"
echo ""

# Check npm
echo "Checking npm installation..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found."
    exit 1
fi

NPM_VERSION=$(npm -v)
echo "✅ npm $NPM_VERSION found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
echo "This may take a minute..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "=================================="
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Start development server:"
echo "   npm run dev"
echo ""
echo "2. Open in your browser:"
echo "   http://localhost:8000"
echo ""
echo "3. Try generating your first audio! 🎉"
echo ""
echo "For more information:"
echo "- Quick Start: QUICKSTART.md"
echo "- Full Docs: README.md"
echo "- Developer Guide: DEVELOPMENT.md"
echo "- Architecture: ARCHITECTURE.md"
echo ""
