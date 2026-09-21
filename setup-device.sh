#!/usr/bin/env bash
# ============================================================
#  Bootstrap a new device for the Shopify workspace
#  Works on: PC (git-bash/WSL), Ubuntu, and Termux
#  ============================================================
#  Run after cloning the repo:  bash setup-device.sh
set -euo pipefail

echo "== Shopify workspace bootstrap =="

# 1. git
if ! command -v git >/dev/null 2>&1; then
  echo "✗ git is not installed."
  echo "  Termux:  pkg install git"
  echo "  Ubuntu:  sudo apt update && sudo apt install -y git"
  exit 1
fi
echo "✓ git: $(git --version | awk '{print $3}')"

# 2. Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node.js is not installed."
  echo "  Termux:  pkg install nodejs"
  echo "  Ubuntu:  sudo apt install -y nodejs (needs v20+)"
  exit 1
fi
echo "✓ node: $(node --version)"

# 3. .env (secrets are gitignored — git will NOT deliver them)
if [ ! -f .env ]; then
  echo "✗ .env is missing. It holds your secrets, so git never carries it."
  echo "  Two ways to create it:"
  echo "    1) Copy it from your other device over SSH:"
  echo "         scp -P 8022 .env <user>@<tablet-ip>:<project-dir>/"
  echo "    2) Copy the template and fill in the values:"
  echo "         cp .env.example .env   # then edit .env"
  exit 1
fi
echo "✓ .env present"

# 4. Verify the Shopify connection end-to-end
echo "✓ Verifying Shopify connection (this mints a token if needed)…"
node test.js

echo ""
echo "Done! Everyday commands:"
echo "  node shopify-token.js status   # check token health"
echo "  node test.js                   # re-run the connectivity test"
echo "  git pull                       # pull the latest code from GitHub"