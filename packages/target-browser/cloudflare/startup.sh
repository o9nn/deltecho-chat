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

# Create or fix accounts.toml (required by deltachat-rpc-server)
# The format must match the InnerConfig struct from deltachat-core
ACCOUNTS_TOML="/data/accounts/accounts.toml"

# Check if the file exists and has the wrong format (contains [accounts] section)
if [ -f "$ACCOUNTS_TOML" ]; then
    if grep -q '^\[accounts\]' "$ACCOUNTS_TOML"; then
        echo "Found accounts.toml with wrong format (has [accounts] section), recreating..."
        rm -f "$ACCOUNTS_TOML"
    fi
fi

# Create accounts.toml if it doesn't exist
if [ ! -f "$ACCOUNTS_TOML" ]; then
    echo "Creating $ACCOUNTS_TOML with correct format..."
    cat > "$ACCOUNTS_TOML" << 'TOMLEOF'
selected_account = 0
next_id = 1
accounts = []
accounts_order = []
TOMLEOF
    echo "accounts.toml created successfully"
fi

echo "Current accounts.toml content:"
cat "$ACCOUNTS_TOML"

echo ""
echo "Checking data directories:"
ls -la /data/ || echo "Failed to list /data"
echo ""
echo "Contents of /data/accounts:"
ls -la /data/accounts/ || echo "Failed to list /data/accounts"
echo ""
echo "=== Starting server ==="
exec node /app/dist/server.js
