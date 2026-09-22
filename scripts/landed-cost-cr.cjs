// ============================================================
//  Landed-cost table for Costa Rica: real CJ freight quotes
//  Reads the live storefront product list (skus + CRC retail),
//  pulls CJ weight/logistics-props per SKU, quotes CN→CR freight
//  via /logistic/freightCalculateTip (productProp-aware).
//  1.2s pacing between CJ calls. Run: node scripts/landed-cost-cr.cjs
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
const FXP = 447; // CRC per USD (Sep 2026) — script flag override below
const DEST = process.env.DEST || 'CR'; // destination country code
const STOREFRONT = 'https://pabs-estore.myshopify.com';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cjGet(session, url) {
  const res = await fetch(url, { headers: { 'CJ-Access-Token': session.accessToken } });
  const json = await res.json();
  return json;
}

async function cjPost(session, url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'CJ-Access-Token': session.accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return json;
}

(async () => {
  const session = getCjToken();
  const fx = parseFloat(process.env.FX || String(FXP)) || FXP;

  // 1) Read live published products + CRC retail from storefront
  const store = await (await fetch(`${STOREFRONT}/products.json?limit=250`)).json();
  const rows = [];
  for (const p of store.products) {
    for (const v of p.variants) {
      if (v.sku) rows.push({
        title: (p.title || '').slice(0, 70),
        handle: p.handle,
        sku: v.sku,
        retailCRC: parseFloat(v.price) || 0,
      });
    }
  }
  console.log(`products with SKU on storefront: ${rows.length}\n`);

  // 2) Per SKU: CJ detail (weight, props, sellPrice) then freight quote CN→CR
  const out = [];
  let idx = 0;
  for (const r of rows) {
    idx++;
    const tag = `[${idx}/${rows.length}] ${r.sku} ${r.title}\n    retail ₡${r.retailCRC.toFixed(1)}`;
    try {
      // a) product detail → logistics props + real weight
      const d = await cjGet(session, `${CJ_API}/product/query?productSku=${encodeURIComponent(r.sku)}`);
      await sleep(1250);
      if (!d.success) { out.push({ ...r, error: `detail: ${d.message}` }); console.log(`${tag} DETAIL-ERR ${d.message}`); continue; }
      const prod = d.data || {};
      const props = Array.isArray(prod.productProEnSet) && prod.productProEnSet.length
        ? prod.productProEnSet : Array.isArray(prod.productProSet) ? prod.productProSet : ['COMMON'];
      const variants = Array.isArray(prod.variants) ? prod.variants : [];
      const weightG = Number(process.env.OVERRIDE_WEIGHT) || (variants.length ? Number(variants[0].variantWeight) : NaN) ||
                      parseFloat(String(prod.productWeight || '0').split('-')[0]) || 0;
      const wholesale = Number(prod.sellPrice) || 0;

      // b) freight quote to DEST via freightCalculateTip (needs productProp)
      const body = {
        reqDTOS: [{
          srcAreaCode: 'CN',
          destAreaCode: DEST,
          weight: weightG,
          totalGoodsAmount: wholesale,
          productProp: props,
          platforms: ['shopify'],
          skuList: [r.sku],
          freightTrialSkuList: [{ sku: r.sku, skuQuantity: 1, skuWeight: weightG }],
        }],
      };
      const f = await cjPost(session, `${CJ_API}/logistic/freightCalculateTip`, body);
      await sleep(1250);
      if (!f.success) { out.push({ ...r, error: `freight: ${f.message}` }); console.log(`${tag} FREIGHT-ERR ${f.message}`); continue; }

      const opts = Array.isArray(f.data) ? f.data : [];
      const priced = opts
        .map(m => ({
          name: m.option?.enName || m.logisticName || m.optionName || '?',
          postage: Number(m.postage ?? 0),
          wrapPostage: Number(m.wrapPostage ?? 0),
          discount: Number(m.discountFee ?? 0),
          arrival: m.arrivalTime || m.option?.arrivalTime || '?',
          taxesFee: m.taxesFee != null ? Number(m.taxesFee) : null,
          clearanceFee: m.clearanceOperationFee != null ? Number(m.clearanceOperationFee) : null,
          totalPostageFee: m.totalPostageFee != null ? Number(m.totalPostageFee) : null,
        }))
        .filter(m => m.postage > 0 || m.wrapPostage > 0)
        .sort((a, b) => (a.wrapPostage || a.postage) - (b.wrapPostage || b.postage));

      const best = priced[0] || null;
      const freightUSD = best ? (best.wrapPostage || best.postage) : null;
      const taxesUSD = best ? (best.taxesFee || 0) : 0;
      const landedUSD = (wholesale || 0) + (freightUSD || 0) + (taxesUSD || 0);
      const landedCRC = landedUSD * fx;
      const marginDelta = r.retailCRC - landedCRC;

      out.push({
        ...r,
        wholesale: wholesale,
        weightG,
        props: props.join('/'),
        freightUSD,
        taxesUSD,
        arrival: best ? best.arrival : null,
        carrier: best ? best.name : null,
        landedUSD,
        landedCRC: Math.round(landedCRC),
        marginCRC: Math.round(marginDelta),
        marginPct: r.retailCRC ? Math.round((marginDelta / r.retailCRC) * 1000) / 10 : null,
        nOptions: priced.length,
        error: freightUSD == null ? 'no priced option' : null,
      });
      console.log(`${tag}\n    wholesale $${wholesale} · weight ${weightG}g · props ${props.join('/')}\n    best ${freightUSD != null ? '$' + freightUSD.toFixed(2) : 'NONE'} (${best ? best.name + ' ' + best.arrival : ''}) · $ taxes ${taxesUSD.toFixed(2)}\n    landed ₡${Math.round(landedCRC)} → retail ₡${r.retailCRC} → ${Math.round(marginDelta)} (${Math.round((marginDelta / r.retailCRC) * 1000) / 10}%)\n`);
    } catch (e) {
      out.push({ ...r, error: String(e.message || e).slice(0, 120) });
      console.log(`${tag} EXCEPTION ${String(e).slice(0, 140)}`);
    }
  }

  // 3) Summary table
  console.log('\n===== CR LANDED-COST SUMMARY (FX ' + fx + ', DEST ' + DEST + ') =====');
  console.log('sku | wholesale$ | weight g | freight$ | taxes$ | landed₡ | retail₡ | margin₡ | margin% | best carrier/eta');
  for (const o of out) {
    console.log(`${o.sku} | ${o.wholesale ?? '-'} | ${o.weightG ?? '-'} | ${o.freightUSD ?? '-'} | ${o.taxesUSD ?? '-'} | ${o.landedCRC ?? '-'} | ${o.retailCRC} | ${o.marginCRC ?? '-'} | ${o.marginPct ?? '-'}% | ${o.error || (o.carrier + ' ' + o.arrival)}`);
  }
  fs.writeFileSync(path.join(__dirname, '..', 'landed-cost-cr.json'), JSON.stringify(out, null, 2));
  console.log('\nSaved landed-cost-cr.json');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });