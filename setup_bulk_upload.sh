#!/bin/bash

# Quick Start Script for Bulk Player Upload
# This script guides you through the entire process

echo "🎯 Auction App - Bulk Player Upload Setup"
echo "=========================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

echo "✅ Python found: $(python3 --version)"

# Install dependencies
echo ""
echo "📦 Installing required packages..."
pip3 install -r requirements-bulk-upload.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"

# Create template
echo ""
echo "📋 Creating Excel template..."
python3 create_template.py

if [ $? -ne 0 ]; then
    echo "❌ Failed to create template"
    exit 1
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Open player_upload_template.xlsx"
echo "2. Get your auth token from the auction app"
echo "3. Get your category IDs:"
echo "   python3 get_categories.py --token YOUR_TOKEN --event-id YOUR_EVENT_ID"
echo ""
echo "4. Fill in the Excel template with your players"
echo "5. Run dry-run to validate:"
echo "   python3 bulk_upload_players.py --excel players.xlsx --token YOUR_TOKEN --dry-run"
echo ""
echo "6. Upload players:"
echo "   python3 bulk_upload_players.py --excel players.xlsx --token YOUR_TOKEN"
echo ""
echo "📖 For detailed instructions, read BULK_UPLOAD_GUIDE.md"
