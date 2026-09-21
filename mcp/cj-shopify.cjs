// ============================================================
//  CJdropshipping MCP server launcher.
//  - Tiny .env loader (zero-dependency, same pattern as other launchers)
//  - Spawns the official CJ MCP server (dist/mcp-server/index.cjs)
//  - Secrets/tokens come ONLY from .env — never from opencode.json
//
//  Docs:  https://github.com/CJ-dropshipping/api-mcp
//  Guide: https://developers.cjdropshipping.com/en/api/api2/mcp.html
// ============================================================
'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// ------------------------------------------------------------
// 1. Load .env (only fills vars that aren't already set)
// ------------------------------------------------------------
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

// ------------------------------------------------------------
// 2. Spawn the official CJ MCP server with safe defaults
// ------------------------------------------------------------
const serverEntry = path.join(__dirname, 'cj-api-mcp', 'dist', 'mcp-server', 'index.cjs');
if (!fs.existsSync(serverEntry)) {
  console.error(`CJ MCP entry not found: ${serverEntry}`);
  console.error('Run: cd mcp/cj-api-mcp && npm install && npm run build');
  process.exit(1);
}

const child = spawn(process.execPath, [serverEntry], {
  env: {
    ...process.env,
    // Production API base (the repo's .env.example ships a dev/test URL — override it)
    CJ_API_BASE: process.env.CJ_API_BASE || 'https://www.cjdropshipping.com',
    CJ_PLATFORM: process.env.CJ_PLATFORM || '1',      // 1=MyCJ
    CJ_LANGUAGE: process.env.CJ_LANGUAGE || 'en',
    CJ_CURRENCY: process.env.CJ_CURRENCY || 'USD',
    CJ_LOG_LEVEL: process.env.CJ_LOG_LEVEL || 'info',
    // Session-encryption key for the locally stored .cj-token (generate & keep in .env)
    TOKEN_ENCRYPT_KEY: process.env.TOKEN_ENCRYPT_KEY || '',
  },
  stdio: 'inherit',
});

child.on('error', (err) => {
  console.error('CJ MCP spawn error:', err.message);
  process.exit(1);
});
child.on('exit', (code, signal) => process.exit(code ?? 0));