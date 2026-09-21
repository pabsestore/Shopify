#!/usr/bin/env node
// ============================================================
//  Shopify token CLI — read-only health checks
//  ============================================================
//  Usage:
//    node shopify-token.js status            check current token
//    node shopify-token.js status --force    mint a fresh token now
//
'use strict';

const { getToken, tokenStatus, SHOP } = require('./shopify');

const args = process.argv.slice(2);
const force = args.includes('--force');
const command = args.find((a) => !a.startsWith('-')) || 'status';

if (command !== 'status') {
  console.error('Unknown command. Usage: node shopify-token.js status [--force]');
  process.exit(1);
}

async function main() {
  // Make sure a valid token exists (mints one if needed, unless --force)
  await getToken({ force });

  const { token, source, status, expiresInSec, tokenFile } = tokenStatus();

  console.log(`Shop:      ${SHOP}`);
  console.log(`Token file: ${tokenFile}`);
  console.log(`Source:    ${source}`);

  if (!token) {
    console.log('Status:    ❌ no token');
    process.exit(1);
  }

  // Mask the token for display: shpat_ab12…z9f7
  const masked = token.accessToken
    ? token.accessToken.slice(0, 10) + '…' + token.accessToken.slice(-4)
    : '(unknown)';

  console.log(`Token:     ${masked}`);
  console.log(`Scopes:    ${token.scope || '(none reported)'}`);

  const when = new Date(token.expiresAt);
  const hours = Math.floor(expiresInSec / 3600);
  const minutes = Math.floor((expiresInSec % 3600) / 60);

  console.log(`Status:    ${status === 'valid' ? '✅ valid' : '⚠️  expires soon'}`);
  console.log(`Expires:   ${when.toLocaleString()} (in ${hours}h ${minutes}m)`);
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});