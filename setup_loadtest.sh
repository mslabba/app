#!/bin/bash

# Load Testing Setup Script for Auction App
# This script helps you quickly set up and run load tests

echo "=========================================="
echo "Auction App - Load Testing Setup"
echo "=========================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

echo "✅ Python 3 found"

# Install dependencies
echo ""
echo "Installing load testing dependencies..."
pip3 install -r requirements-loadtest.txt

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Quick Load Test (Simple):"
echo "   - Edit simple_load_test.py and update:"
echo "     • BACKEND_URL"
echo "     • EVENT_ID"
echo "     • NUM_CONCURRENT_USERS"
echo "   - Run: python3 simple_load_test.py"
echo ""
echo "2. Advanced Load Test (Locust with Web UI):"
echo "   - Run: locust -f load_test.py --host=https://your-backend-url"
echo "   - Open browser: http://localhost:8089"
echo "   - Configure and start test from web interface"
echo ""
echo "3. Read the guide:"
echo "   - Open: LOAD_TESTING_GUIDE.md"
echo ""
echo "=========================================="
echo ""

# Ask if user wants to run simple test now
read -p "Do you want to configure and run the simple load test now? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Please provide the following information:"
    echo ""
    
    read -p "Backend URL (e.g., https://your-app.railway.app): " backend_url
    read -p "Event ID: " event_id
    read -p "Number of concurrent users (recommended: 20): " num_users
    read -p "Test duration in seconds (recommended: 120): " duration
    
    # Update the configuration in simple_load_test.py
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|BACKEND_URL = \".*\"|BACKEND_URL = \"$backend_url\"|" simple_load_test.py
        sed -i '' "s|EVENT_ID = \".*\"|EVENT_ID = \"$event_id\"|" simple_load_test.py
        sed -i '' "s|NUM_CONCURRENT_USERS = .*|NUM_CONCURRENT_USERS = $num_users|" simple_load_test.py
        sed -i '' "s|TEST_DURATION_SECONDS = .*|TEST_DURATION_SECONDS = $duration|" simple_load_test.py
    else
        # Linux
        sed -i "s|BACKEND_URL = \".*\"|BACKEND_URL = \"$backend_url\"|" simple_load_test.py
        sed -i "s|EVENT_ID = \".*\"|EVENT_ID = \"$event_id\"|" simple_load_test.py
        sed -i "s|NUM_CONCURRENT_USERS = .*|NUM_CONCURRENT_USERS = $num_users|" simple_load_test.py
        sed -i "s|TEST_DURATION_SECONDS = .*|TEST_DURATION_SECONDS = $duration|" simple_load_test.py
    fi
    
    echo ""
    echo "Configuration updated! Starting load test..."
    echo ""
    
    python3 simple_load_test.py
else
    echo ""
    echo "You can run the load test later with:"
    echo "  python3 simple_load_test.py"
    echo ""
fi
