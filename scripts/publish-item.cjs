// ============================================================
//  Publish a single product to the Online Store + attach image
//  + (optionally) join a collection.
//
//  Usage:
//    node scripts/publish-item.cjs <productId> "<imageUrl>" "<alt text>" [collectionId]
//
//  Examples:
//    node scripts/publish-item.cjs 11242089677073 "https://oss-cf...jpg" "Skull Lamp" 699828797713
// ============================================================
'use strict';
const { rest } = require('../shopify');

(async () => {
  const [, , id, img, alt, collectionId] = process.argv;
  if (!id) { console.error('usage: node scripts/publish-item.cjs <productId> "<imageUrl>" "<alt>" [collectionId]'); process.exit(1); }

  const now = new Date(Date.now() - 60000).toISOString();

  // 1. publish to Online Store
  await rest(`products/${id}.json`, { method: 'PUT', body: { product: { published_at: now } } });
  console.log(`✅ published (published_at set)`);

  // 2. attach image
  if (img) {
    const u = await rest(`products/${id}.json`, {
      method: 'PUT',
      body: { product: { images: [{ src: img, alt: alt || '' }] } },
    });
    const got = u.product?.images?.length;
    console.log(`✅ image attached (${got ?? 0}) ${img.slice(0, 70)}…`);
  }

  // 3. join collection
  if (collectionId) {
    await rest('collects.json', { method: 'POST', body: { collect: { collection_id: collectionId, product_id: id } } });
    console.log(`✅ added to collection ${collectionId}`);
  }

  console.log('DONE');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });