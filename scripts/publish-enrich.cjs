// ============================================================
//  Enrich the 12 published batch products:
//    1. Fetch real product images from CJ's catalog (listV2, by SKU)
//    2. Attach them to the Shopify products (featured image)
//    3. Create the "Trending" collection and add all 12 products
//
//  Uses:  shopify.js (Admin API helper), CJ session token (~/.cj-mcp-token)
//  Run:   node scripts/publish-enrich.cjs
// ============================================================
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const { rest } = require('../shopify');

// ------------------------------------------------------------
// 0. Load .env (TOKEN_ENCRYPT_KEY for CJ session decryption)
// ------------------------------------------------------------
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

const CJ_API = 'https://developers.cjdropshipping.com/api2.0/v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------
// 1. Decrypt CJ session -> access token
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// 2. Batch definition (num, shopify gid, cj sku, search keyword, alt)
// ------------------------------------------------------------
const BATCH = [
  { num: 1,  gid: 11242085450001, sku: 'CJJJJTJT38669', kw: 'bluetooth mechanical keyboard',        alt: 'RGB Bluetooth Mechanical Keyboard' },
  { num: 2,  gid: 11242085482769, sku: 'CJJT1251952',   kw: 'wireless gaming mouse rgb',             alt: 'RGB Wireless Gaming Mouse' },
  { num: 3,  gid: 11242085515537, sku: 'CJJT1064975',   kw: 'machenike',                             alt: 'Machenike M8 Wireless RGB Gaming Mouse' },
  { num: 4,  gid: 11242085548305, sku: 'CJEJ1281901',   kw: 'rgb gaming headset',                    alt: 'RGB Gaming Headset for PC PS4 Switch' },
  { num: 5,  gid: 11242085581073, sku: 'CJYD2857251',   kw: 'wireless lavalier microphone',          alt: 'Wireless Lavalier Clip-On Microphone' },
  { num: 6,  gid: 11242085613841, sku: 'CJYD3050336',   kw: 'outdoor wireless lavalier microphone',  alt: 'Outdoor Wireless Lavalier Microphone' },
  { num: 7,  gid: 11242085646609, sku: 'CJYD2856835',   kw: 'facial tracking gimbal',                alt: 'AI Face-Tracking Smartphone Gimbal' },
  { num: 8,  gid: 11242085679377, sku: 'CJJT1563363',   kw: '2k touch portable monitor',             alt: '2K Touch Portable Monitor' },
  { num: 9,  gid: 11242085712145, sku: 'CJZBLXLX15811', kw: 'waterproof smart ring',                 alt: 'Waterproof Smart Ring' },
  { num: 10, gid: 11242085744913, sku: 'CJLE1029103',   kw: 'monitor light bar streamer',            alt: 'Monitor Streamer Light Bar' },
  { num: 11, gid: 11242085777681, sku: 'CJJT1403910',   kw: 'led strip bluetooth 5v rgb',            alt: 'RGB LED Strip Lights Bluetooth' },
  { num: 12, gid: 11242085810449, sku: 'CJXFLPYP00087', kw: 'usb c multi hub docking station',       alt: 'USB-C Multi-Hub Docking Station' },
];

// ------------------------------------------------------------
// 3. Find bigImage for the exact SKU via listV2 paging
// ------------------------------------------------------------
async function findImage(session, item) {
  for (let page = 1; page <= 4; page++) {
    const url = `${CJ_API}/product/listV2?keyWord=${encodeURIComponent(item.kw)}&page=${page}&size=20&startWarehouseInventory=1`;
    const res = await fetch(url, { headers: { 'CJ-Access-Token': session.accessToken } });
    const json = await res.json();
    const list = (json.data?.content?.[0]?.productList) || [];
    const hit = list.find((p) => p.sku === item.sku);
    if (hit && hit.bigImage) return hit.bigImage;
    if (list.length < 20) break; // no more pages
  }
  return null;
}

// ------------------------------------------------------------
// 4. Ensure "Trending" collection exists (custom or smart)
// ------------------------------------------------------------
async function ensureTrendingCollection() {
  for (const type of ['custom_collections', 'smart_collections']) {
    const r = await rest(`${type}.json?handle=trending&limit=1`);
    const list = r[type];
    if (list && list.length) return { id: list[0].id, title: list[0].title, existed: true };
  }
  const created = await rest('custom_collections.json', {
    method: 'POST',
    body: {
      custom_collection: {
        title: 'Trending',
        handle: 'trending',
        published: true,
        body_html: '<p>Our hottest picks in gaming, streaming and tech — verified trending finds, hand-picked for Pabs eStore.</p>',
      },
    },
  });
  return { id: created.custom_collection.id, title: 'Trending', existed: false };
}

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------
async function main() {
  const session = getCjToken();
  console.log(`CJ session OK (expires ${session.accessTokenExpiry})`);

  const enriched = [];
  for (const item of BATCH) {
    const img = await findImage(session, item);
    if (!img) {
      console.log(`#${item.num} ${item.sku}: NOT FOUND in listV2`);
      await sleep(1200);
      continue;
    }
    await rest(`products/${item.gid}.json`, {
      method: 'PUT',
      body: { product: { images: [{ src: img, alt: item.alt }] } },
    });
    enriched.push(item.gid);
    console.log(`#${item.num} ${item.sku}: image attached (${img.slice(0, 70)}…)`);
    await sleep(1200);
  }
  console.log(`\nImages attached: ${enriched.length}/${BATCH.length}`);

  const col = await ensureTrendingCollection();
  console.log(`Collection "${col.title}" (id ${col.id}, ${col.existed ? 'existing' : 'created'})`);
  let added = 0;
  for (const pid of enriched) {
    await rest('collects.json', {
      method: 'POST',
      body: { collect: { collection_id: col.id, product_id: pid } },
    });
    added++;
  }
  console.log(`Added ${added} products to "${col.title}" collection`);
  console.log('\nDONE');
}

main().catch((e) => console.error('FAILED:', e.message));