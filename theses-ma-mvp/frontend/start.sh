#!/bin/bash

# Theses.ma Frontend Start Script

echo "🚀 Starting theses.ma Frontend Development Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "🔧 Creating environment file..."
    cp .env.example .env
    echo "✅ Please configure your .env file with the correct API URL"
fi

# Start the development server
echo "🌐 Starting development server on http://localhost:3000"
echo "📡 Make sure your backend API is running on http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev