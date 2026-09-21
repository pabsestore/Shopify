// ============================================================
//  Shopify Admin API helper — self-healing client credentials
//  ============================================================
//  - Loads credentials from .env (no dependencies required)
//  - Mints a 24h Admin API token from Client ID + Secret
//  - Caches the token in token.json so separate runs reuse it
//  - Refreshes automatically before expiry
//  - Auto-retries on 401 (expired mid-call) and 429 (rate limit)
//
//  Usage:  const { graphql, rest, getToken, tokenStatus } = require('./shopify');
//
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ------------------------------------------------------------
// 0. Load .env (tiny zero-dependency loader — works on any Node)
// ------------------------------------------------------------
function loadEnv(filePath = path.join(__dirname, '.env')) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return; // no .env file — rely on real environment variables
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;      // skip blanks & comments
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1); // strip quotes
    if (process.env[key] === undefined) process.env[key] = value; // don't override real env
  }
}
loadEnv();

// ------------------------------------------------------------
// 1. Configuration (from .env)
// ------------------------------------------------------------
const SHOP         = process.env.SHOPIFY_STORE_DOMAIN; // e.g. pabs-estore.myshopify.com
const CLIENT_ID    = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_API_SECRET;
const API_VERSION  = process.env.SHOPIFY_API_VERSION || '2026-01';
const TOKEN_FILE   = path.join(__dirname, 'token.json');

if (!SHOP || !CLIENT_ID || !CLIENT_SECRET) {
  throw new Error(
    'Missing Shopify credentials. Create a .env file (example in .env.example) or set\n' +
    'SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID and SHOPIFY_API_SECRET as environment variables.'
  );
}

const REFRESH_BUFFER_MS = 60_000; // treat a token as stale 60s before it actually expires

// ------------------------------------------------------------
// 2. Token cache (memory + token.json so runs share a token)
// ------------------------------------------------------------
let memToken = null; // { accessToken, scope, expiresAt }

function readTokenFile() {
  try {
    const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    return data && data.accessToken && data.expiresAt ? data : null;
  } catch {
    return null;
  }
}

function writeTokenFile(token) {
  try {
    // Unique temp name so two processes running at once never collide
    const tmp = `${TOKEN_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(token, null, 2));
    fs.renameSync(tmp, TOKEN_FILE); // rename is atomic on the same volume
  } catch {
    try {
      // Last-resort plain write if the atomic path failed (e.g. AV locks)
      fs.writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2));
    } catch (err) {
      console.warn(`⚠  Could not cache token (${err.message})`);
    }
  }
}

// ------------------------------------------------------------
// 3. getToken — the heart of the setup
// ------------------------------------------------------------
// 1. return the in-memory token if still fresh
// 2. otherwise return a fresh token from token.json
// 3. otherwise mint a brand-new token from Client ID + Secret
//    and save it to the cache
// Pass { force: true } to always mint (used after a 401).
// ------------------------------------------------------------
async function getToken({ force = false } = {}) {
  const now = Date.now();

  if (!force && memToken && memToken.expiresAt > now + REFRESH_BUFFER_MS) {
    return memToken.accessToken;
  }

  if (!force) {
    const fileToken = readTokenFile();
    if (fileToken && fileToken.expiresAt > now + REFRESH_BUFFER_MS) {
      memToken = fileToken;
      return fileToken.accessToken;
    }
  }

  // Mint a fresh token via the client credentials grant.
  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token request failed (${res.status}): ${await res.text()}`);
  }

  const { access_token, scope, expires_in } = await res.json();
  const token = {
    accessToken: access_token,
    scope,
    expiresAt: Date.now() + expires_in * 1000,
  };

  memToken = token;
  writeTokenFile(token);

  return token.accessToken;
}

// ------------------------------------------------------------
// 4. Token status (read-only health check, used by shopify-token.js)
// ------------------------------------------------------------
function tokenStatus() {
  const now = Date.now();
  let source = 'none';
  let token = null;

  if (memToken && memToken.expiresAt > now) {
    token = memToken;
    source = 'memory';
  } else {
    const fileToken = readTokenFile();
    if (fileToken && fileToken.expiresAt > now) {
      memToken = fileToken;
      token = fileToken;
      source = 'token.json';
    }
  }

  const expiresInSec = token ? Math.floor((token.expiresAt - now) / 1000) : null;
  let status = 'missing';
  if (token && expiresInSec !== null) {
    status = expiresInSec > REFRESH_BUFFER_MS / 1000 ? 'valid' : 'expires-soon';
  }
  return { token, source, status, expiresInSec, tokenFile: TOKEN_FILE };
}

// ------------------------------------------------------------
// 5. Request wrapper with automatic 401/429 retry
// ------------------------------------------------------------
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry(buildRequest, { label }) {
  const MAX_ATTEMPTS = 3;
  let lastStatus;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const token = await getToken({ force: attempt > 1 });
    const res = await buildRequest(token);
    lastStatus = res.status;

    if (res.status === 401 && attempt === 1) {
      console.warn('⚠  401 — token expired mid-call. Minting a fresh one and retrying…');
      continue; // attempt 2 will force-mint with a new token
    }
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after')) || 2;
      console.warn(`⚠  429 rate limit — waiting ${retryAfter}s (attempt ${attempt}/${MAX_ATTEMPTS})…`);
      await sleep(retryAfter * 1000);
      continue;
    }
    return res;
  }

  throw new Error(`${label} failed after ${MAX_ATTEMPTS} attempts (last status: ${lastStatus})`);
}

// ------------------------------------------------------------
// 6. Public API
// ------------------------------------------------------------

// GraphQL Admin API — the recommended way to talk to Shopify.
async function graphql(query, variables = {}) {
  const res = await withRetry((token) =>
    fetch(`https://${SHOP}/admin/api/${API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ query, variables }),
    }),
    { label: 'GraphQL' }
  );

  if (!res.ok) throw new Error(`GraphQL request failed (${res.status}): ${await res.text()}`);

  const body = await res.json();
  if (body.errors?.length) throw new Error(`GraphQL errors: ${JSON.stringify(body.errors)}`);
  return body.data;
}

// REST Admin API — e.g. rest('orders.json?limit=5')
// With options: rest('products/123.json', { method: 'PUT', body: { product: {...} } })
async function rest(apiPath, options = {}) {
  const method = options.method || 'GET';
  const hasBody = options.body !== undefined;
  const res = await withRetry((token) =>
    fetch(`https://${SHOP}/admin/api/${API_VERSION}/${apiPath}`, {
      method,
      headers: {
        'X-Shopify-Access-Token': token,
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
    }),
    { label: `REST ${method} ${apiPath}` }
  );

  if (!res.ok) throw new Error(`REST ${method} ${apiPath} failed (${res.status}): ${await res.text()}`);
  return res.json();
}

module.exports = { getToken, tokenStatus, graphql, rest, API_VERSION, SHOP };