// Launcher for the shopify-mcp Admin MCP server (read + write access to your store).
// Reads credentials from the project .env so no secrets are stored anywhere else,
// then starts the server with them. Works on Windows and Linux/Termux.
'use strict';
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// 1. Load .env (this file lives in mcp/, the .env is one folder up)
const envPath = path.join(__dirname, '..', '.env');
try {
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    let value = t.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (process.env[t.slice(0, eq).trim()] === undefined) {
      process.env[t.slice(0, eq).trim()] = value;
    }
  }
} catch {
  // no .env file — rely on real environment variables
}

// 2. Translate your .env names into what shopify-mcp expects
process.env.SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_API_SECRET;
process.env.MYSHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;

// 3. Start the MCP server (platform-aware npx)
const pkg = 'shopify-mcp';
const args = ['--apiVersion', '2026-07'];
const cmd = process.platform === 'win32'
  ? ['cmd', ['/c', 'npx', '-y', pkg, ...args]]
  : ['npx', ['-y', pkg, ...args]];
const child = spawn(cmd[0], cmd[1], { stdio: 'inherit', env: process.env });
child.on('exit', (code) => process.exit(code ?? 0));