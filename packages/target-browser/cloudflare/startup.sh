#!/bin/bash
set -e

echo "=== Container Startup Debug ==="
echo "Date: $(date)"
echo "Node version: $(node --version)"
echo "Working directory: $(pwd)"
echo "Contents of /app/dist:"
ls -la /app/dist/ || echo "Failed to list /app/dist"
echo ""
echo "Environment variables:"
env | grep -E "^(NODE_|WEB_|DC_|DATA_|DIST_|DELTA_|USE_)" || echo "No matching env vars"
echo ""
echo "Checking deltachat-rpc-server:"
ls -la /usr/local/bin/deltachat-rpc-server || echo "Binary not found"
file /usr/local/bin/deltachat-rpc-server 2>/dev/null || echo "Cannot determine file type"
ldd /usr/local/bin/deltachat-rpc-server 2>/dev/null || echo "Cannot check library dependencies"
echo ""

# Ensure data directories exist
echo "Ensuring data directories exist..."
mkdir -p /data/accounts /data/logs /data/background

# Create accounts.toml if it doesn't exist (required by deltachat-rpc-server)
if [ ! -f /data/accounts/accounts.toml ]; then
    echo "Creating /data/accounts/accounts.toml..."
    echo '[accounts]' > /data/accounts/accounts.toml
    echo "accounts.toml created successfully"
else
    echo "accounts.toml already exists"
fi

echo "Checking data directories:"
ls -la /data/ || echo "Failed to list /data"
echo ""
echo "Contents of /data/accounts:"
ls -la /data/accounts/ || echo "Failed to list /data/accounts"
echo ""
echo "=== Starting server ==="
exec node /app/dist/server.js
