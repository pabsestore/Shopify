// ============================================================
//  Publish the active batch products to the Online Store
//  sets published_at so they appear on the live storefront
//  Run: node scripts/publish-online.cjs
// ============================================================
'use strict';
const { rest } = require('../shopify');

(async () => {
  const now = new Date(Date.now() - 60000).toISOString(); // 1 min in the past for safety
  const res = await rest('products.json?status=active&limit=250&fields=id,title,status,published_at');
  const active = res.products;
  console.log(`active products: ${active.length}`);

  let ok = 0;
  for (const p of active) {
    if (p.published_at) { console.log(`  ${p.title.slice(0, 45)} — already published`); ok++; continue; }
    const u = await rest(`products/${p.id}.json`, {
      method: 'PUT',
      body: { product: { published_at: now } },
    });
    if (u.product && u.product.published_at) { ok++; console.log(`  ✅ ${p.title.slice(0, 45)} — published`); }
    else console.log(`  ❌ ${p.title.slice(0, 45)} — publish failed`);
  }
  console.log(`\nPublished: ${ok}/${active.length}`);
})().catch((e) => console.error('FAILED:', e.message));