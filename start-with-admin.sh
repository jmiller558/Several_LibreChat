#!/bin/bash

# LibreChat with Admin Portal Startup Script
# This script can start both services simultaneously

echo "🚀 Starting LibreChat with Admin Portal..."

# Check if we should start admin portal separately
if [ "$START_ADMIN_PORTAL" = "true" ]; then
    echo "📊 Starting Admin Portal on port ${ADMIN_PORT:-4000}..."
    cd admin && npm start &
    ADMIN_PID=$!
    cd ..
    
    echo "🎯 Starting LibreChat main application..."
    npm run backend &
    MAIN_PID=$!
    
    # Wait for both processes
    wait $ADMIN_PID $MAIN_PID
else
    echo "🎯 Starting LibreChat main application only..."
    npm run backend
fi
