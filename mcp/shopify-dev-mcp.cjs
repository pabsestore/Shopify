// Launcher for Shopify's official Dev MCP server.
// Prefers the globally installed @shopify/dev-mcp (fast start, patched so
// docs/validation work), falls back to npx. Works on Windows and Linux/Termux.
'use strict';
const { spawn, execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function globalBin() {
  try {
    const nodeModules = execSync('npm root -g', { encoding: 'utf8' }).trim();
    const prefix = path.dirname(nodeModules);
    const binDir = process.platform === 'win32' ? prefix : path.join(prefix, 'bin');
    const name = process.platform === 'win32' ? 'shopify-dev-mcp.cmd' : 'shopify-dev-mcp';
    const binPath = path.join(binDir, name);
    return fs.existsSync(binPath) ? binPath : null;
  } catch {
    return null;
  }
}

const bin = globalBin();
let cmd, args;
if (bin) {
  cmd = process.platform === 'win32' ? 'cmd' : bin;
  args = process.platform === 'win32' ? ['/c', bin] : [];
} else {
  cmd = process.platform === 'win32' ? 'cmd' : 'npx';
  args = process.platform === 'win32'
    ? ['/c', 'npx', '-y', '@shopify/dev-mcp@latest']
    : ['-y', '@shopify/dev-mcp@latest'];
}

const child = spawn(cmd, args, { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));