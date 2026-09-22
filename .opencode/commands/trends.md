---
description: Research trending products → verify on CJ catalog → build priced listings for the store
agent: advisor
---

# Product finder (v2 — live CJ catalog)

Goal: turn trend research into **published Shopify products** with real CJ wholesale prices,
3× margin math, and a dropshipping source link for every item.

## Pipeline (do these in order)

### 1. Trend research (web)
Search the web for current (2026) trending **gaming / streaming / tech-gadget** products —
sales stats, search growth, niches. Pick 8–12 candidate products, ranked by demand signal.
For each: category, product title, description outline, suggested retail, tags.

### 2. Verify on the live CJ catalog (real data)
Use the CJ MCP to confirm each candidate has a real, in-stock source product:
`cj-shopify.search_products({ keyword: "<product>" })`

Rules:
- **⚠️ CJ QPS limit is 1 request/second** — never fire searches in parallel. One search per
  turn; pace at least 1s apart.
- Note the result: `sellPrice` (USD wholesale range), `warehouseInventoryNum` (stock),
  `productUrl` (direct dropshipping source link), `bigImage` (image), `nameEn`, `sku`.
- Prefer items with high inventory (verified warehouses) and a clean English name.

### 3. Margin math (3× rule by default)
- Wholesale is **USD** (CJ_CURRENCY=USD). Store currency is **CRC** — retail price
  displayed on the store must be set in CRC by the user (per product), and CRC is
  **~₡447 per USD** (Sep 2026 — check the current rate before quoting).
- Default: retail ≈ 3 × wholesale USD. Show both: `3× retail (USD)` and the suggested
  CRC equivalent. Final CRC price is **always decided by the user** before publishing.

### 4. Publish to the store (auto-publish)
Create each product **published** (not draft) with `shopify-store.create-product`:
- title: clean, SEO-friendly (from `nameEn`, shortened)
- body/description: rewrite from scratch — benefit-led, 4–6 bullet points in plain English
- price: user-approved CRC price
- image: CJ `bigImage` URL
- source link (`productUrl`) stored in the product's `vendor` or metafield for traceability
- tags: category + "trending" + "gaming"/"streaming"/"tech"

### 5. Collection + make it live
Add the product to the **"Trending"** collection (id **699828797713**) and set
`published_at`. The store MCP has no collection tool, so use the scripts
(they handle auth + 1.2s CJ pacing):

```bash
# one item: publish (published_at) + attach image + join Trending:
node scripts/publish-item.cjs <productId> "<bigImageUrl>" "<alt text>" 699828797713

# batch: images + Trending collection for all ACTIVE items in the batch:
node scripts/publish-enrich.cjs
```

Then **verify on the storefront** (`products.json` + homepage show the handle).

## Sequence guard
- Show the user a **batch table first** (name, wholesale USD, 3× USD retail, suggested CRC,
  inventory, source link) and get explicit go-ahead per product before creating anything.
- Never create orders, disputes, or pay — those are `ask`-guarded anyway.