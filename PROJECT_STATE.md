# PROJECT_STATE.md — Pabs eStore · snapshot (Sep 21, 2026)

Companion to `AGENTS.md` (the *how*). This file is the *where we are right now*.
Update it whenever the store materially changes.

## Connections & credentials

| Thing | Value / location |
|---|---|
| Store (primary / Admin API + MCP) | `pabs-estore.myshopify.com` |
| Store (canonical / CLI theme work) | `nmn0zj-44.myshopify.com` |
| Live theme | `pabs-estore-theme` **id 185443156241** (push with `--allow-live`) |
| Repo | `github.com/pabsestore/Shopify` (branch `main`) |
| Secrets | `.env` (per device, gitignored) — `CJ_API_KEY`, `TOKEN_ENCRYPT_KEY`, Shopify `SHOPIFY_CLIENT_ID/SECRET` |
| CJ session | `~/.cj-mcp-token` (encrypted with `TOKEN_ENCRYPT_KEY`; expires 2027-03-20) |
| Shopify admin token | 24h, self-healing via `shopify.js` (client credentials grant) |
| FX rate | **≈ ₡447 / USD** (Sep 21, 2026 — re-check before pricing; `/trends` docs must stay in sync) |

## Store status

- **13 published products live on the storefront** — all in the **Trending**
  collection (id **699828797713**), homepage featured grid = `trending`,
  `products_to_show: 16` (cap was raised from 12 to fit everything; see
  `themes/pabs-estore-theme/templates/index.json`).
- **No sales yet.** Store starts from zero — every batch matters.
- Pre-existing **10 draft products** (Aurora keyboard ₡39.99, Velocity mouse,
  Nova headset, Studio mic, 4K60 capture card, ControlDeck stream controller,
  GlowBar light bar, Stride mousepad, Handheld dock kit, VR hygiene kit):
  **ownership decision still pending** — fix/publish or delete (deferred to user).

## Live products (all Trending, id → title · wholesale · CRC retail)

| Product id | Title | CJ SKU / wholesale USD | Retail CRC |
|---|---|---|---|
| 11242085450001 | RGB Mechanical Keyboard | — | 27,950 |
| 11242085482769 | Wireless Gaming Mouse | — | 10,950 |
| 11242085515537 | M8 Gaming Mouse | — | 51,950 |
| 11242085548305 | RGB Gaming Headset | — | 16,950 |
| 11242085581073 | Wireless Lavalier Mic | — | 4,950 |
| 11242085613841 | Outdoor Lavalier Mic | — | 9,950 |
| 11242085646609 | Phone Gimbal Stabilizer | — | 31,950 |
| 11242085679377 | Portable Monitor | — | 154,900 |
| 11242085712145 | Smart Ring | — | 21,950 |
| 11242085744913 | Monitor Light Bar | — | 18,950 |
| 11242085777681 | LED Strip (room) | — | 12,950 |
| 11242085810449 | USB-C Hub | — | 22,950 |
| 11242089677073 | Halloween Lava Stone Skull Lamp · CJJT2553155 · $5.80 | 7,950 |

Every product carries metafields `cj_mcp` → `sku`, `source_url`, `wholesale_usd`;
source links + wholesale kept for traceability (needed later for CJ order fulfillment).

## Pending / next steps (in order)

1. **Batch 2 go-ahead** — shortlist of 10 trending gaming/streaming gadgets was
   verified on CJ and presented (capture card $18.74, ring light $8.34, RGB USB mic
   $11.44, boom arm $3.12, RGB headset stand $6.60, RGB mousepad $8.91, BT controller
   $7.55, 3-in-1 charger $17.44, 1080p webcam $10.93, LCD macro keypad $49.42).
   **Awaiting user approval** of prices before publishing.
2. **10 old drafts decision** (fix/publish vs delete).
3. **Part 4 theme fixes** (approved, not yet done): `columns_desktop` setting,
   missing collections/search templates, hardcoded `/collections/all` → `routes.*`.
4. **CJ fulfillment setup** (before real orders): connect Shopify store in CJ account
   + prepaid CJ balance.
5. Optional: `/trends` again for batch 3; Halloween seasonal section.

## Scripts inventory

| Script | What it does |
|---|---|
| `shopify.js` | Admin API helper (`rest('path', {method, body})`, self-minting 24h tokens, retry) |
| `shopify-token.js` | `node shopify-token.js status [--force]` |
| `test.js` | connectivity check |
| `scripts/trend-scan.cjs` | CJ keyword scan for candidates (paced 1.2s, listV2, needs `.env` + CJ token) |
| `scripts/publish-enrich.cjs` | batch: CJ images + join Trending collection (listV2, paced 1.2s) |
| `scripts/publish-online.cjs` | set `published_at` on ACTIVE products (makes them public) |
| `scripts/publish-item.cjs` | single item: publish + attach image + optional collection join |

Pattern for adding one product (proven with the skull lamp):
`get_product_detail` (CJ) → `create-product` ACTIVE + `cj_mcp` metafields →
`manage-product-variants` (price on existing variant) →
`publish-item.cjs <id> "<bigImage>" "<alt>" 699828797713`.

## Key gotchas (learned the hard way — read before redoing)

- `create-product` ≠ visible on site — must set `published_at` (publish scripts).
- CJ auth = apiKey-exchanged access token (seeded to `~/.cj-mcp-token`); the
  frontend login token is rejected by the OpenAPI. Header `CJ-Access-Token`.
- `product/listV2` needs `keyWord`/`page`/`size` + `startWarehouseInventory=1`;
  `/product/query` returns "Product not found" for these SKUs — use listV2.
- CJ metafield namespace ≥3 chars (`cj_mcp`); price lives on the existing variant.
- Theme JSON “collection” setting must be the **handle string** (`"trending"`);
  `{id,handle}` fails CLI validation, `"all"` renders fake placeholder cards.
- CLI needs the canonical domain + `--allow-live`; `-i` is rejected, use `-t`.
- **CJ QPS = 1** — never parallel CJ calls; scripts pace at 1.2s.

## GitHub / device sync

- PC (this) + tablet (Termux/Ubuntu): sync via `git push` / `git pull`.
- Per-device: `.env` (copy via `scp -P 8022 .env u0_a123@<tablet-ip>:~/AI/`),
  CJ token `~/.cj-mcp-token`, and `shopify auth login` for theme CLI.
- Secrets never go through git (`.gitignore`: `.env`, `token.json`).

## History (git log, main)

```
a3525a8  Add Halloween skull lamp (13th Trending item), widen homepage grid
ec2d36e  Publish batch to Online Store + homepage featured grid → Trending
31b555d  Publish first 12-product batch (CJ-sourced, images + Trending)
90e4d07  Wire CJdropshipping MCP: launcher, server config, guardrails, auth
c299bcd  Wire up MCP servers, /trends command, pull live theme
…        (earlier) workspace bootstrap, device setup
```