// ============================================================
//  Trend scan: screen CJ catalog for candidate products
//  (one keyword at a time, 1.2s apart — respects CJ 1 QPS)
//  Run: node scripts/trend-scan.cjs
// ============================================================
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

function loadEnv(filePath = path.join(__dirname, '..', '.env')) {
  let raw;
  try { raw = fs.readFileSync(filePath, 'utf8'); } catch { return; }
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let value = t.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnv();

function getCjToken() {
  const file = path.join(process.env.HOME || process.env.USERPROFILE || os.homedir(), '.cj-mcp-token');
  const key = process.env.TOKEN_ENCRYPT_KEY;
  if (!key) throw new Error('TOKEN_ENCRYPT_KEY not set in .env');
  const raw = fs.readFileSync(file, 'utf8').trim();
  const [ivHex, encHex] = raw.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', crypto.createHash('sha256').update(key).digest(), Buffer.from(ivHex, 'hex'));
  const dec = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
  return JSON.parse(dec.toString('utf8'));
}

const CJ_API = 'https://developers.cjdropshipping.com/api2.0/v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const KEYWORDS = process.argv.slice(2);

(async () => {
  const session = getCjToken();
  console.log(`scanning ${KEYWORDS.length} keywords (CJ session OK)`);
  for (const kw of KEYWORDS) {
    try {
      const url = `${CJ_API}/product/listV2?keyWord=${encodeURIComponent(kw)}&page=1&size=5&startWarehouseInventory=1`;
      const res = await fetch(url, { headers: { 'CJ-Access-Token': session.accessToken } });
      const json = await res.json();
      const list = json.data?.content?.[0]?.productList || [];
      console.log(`\n### "${kw}" (${json.data?.totalRecords ?? '?'} total)`);
      for (const p of list) {
        console.log(`  ${p.sku} | ${(p.sellPrice || '').padEnd(14)} | inv ${String(p.warehouseInventoryNum).padStart(8)} | ${String(p.nameEn || '').slice(0, 58)}`);
        console.log(`      img: ${p.bigImage || ''}`);
        console.log(`      url: ${p.productUrl || ''}`);
      }
    } catch (e) {
      console.log(`\n### "${kw}" — ERROR ${String(e).slice(0, 120)}`);
    }
    await sleep(1200);
  }
  console.log('\nSCAN DONE');
})().catch((e) => { console.error('FAILED:', e.message); });