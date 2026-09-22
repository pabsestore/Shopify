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

## Market & payments plan (locked Sep 21, 2026 — see `.opencode/plan/pabs-estore-go-live-cr-first.md`)

- **Strategy: CR-first for the next 90 days.** Keep base currency **CRC**. US market parked (no LLC / no Shopify Payments / no pre-stock; US de-minimis is dead since 2025-08 for all origins — China-direct to US is discontinued practice).
- **Payments to set up:** **Tilopay** (primary; cards 4.25%+$0.35, SINPE 2%+$0.35, no monthly fee, 48h onboarding, Shopify plugin) + **PayPal** (fallback/cross-border) + **manual SINPE instructions** (zero-fee local rail). FACTURA ELECTRÓNICA issuer wiring (Hacienda registered ✓; e-invoicing mandatory once sales > ~₡5M/yr).
- **Fulfillment:** zero inventory — CJ ships direct; CR orders DDU (customer pays IVA 13% + DAI at delivery) at launch, DDP when data justifies. 13 live products already on storefront.
- **Marketing:** no budget — organic only (TikTok/IG Reels, WhatsApp, Spanish SEO, optional Mercado Libre CR). CR conversion baseline 1.2–1.8%.
- **Batch 2 = HOLD until further notice.** Do not publish pending shortlist.

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

## CR landed-cost (real CJ quotes, Sep 21 2026 — `scripts/landed-cost-cr.cjs`, data `landed-cost-cr.json`)

Freight = CJ `freightCalculateTip` CN→CR, cheapest line (CJPacket EUB 12–50d / Liquid Line 18–35d). Wholesale = metafields `cj_mcp.wholesale_usd`. FX 447. **Land cost excludes duties/IVA** (DDU — customer pays at delivery) and gateway fees.

| SKU | Wholesale $ | Freight $ | Landed ₡ | Retail ₡ | Margin ₡ | % | Note |
|---|---|---|---|---|---|---|---|
| CJJT1403910 LED strip | 8.98 | 8.52 | 7,823 | 12,950 | 5,128 | 39.6% | |
| CJXFLPYP00087 USB-C hub | 18.63 | 4.61 | 10,388 | 22,950 | 12,562 | 54.7% | |
| CJLE1029103 monitor light bar | 13.43 | 9.16 | 10,098 | 18,950 | 8,852 | 46.7% | |
| CJZBLXLX15811 smart ring | 15.51 | 2.64 | 8,113 | 21,950 | 13,837 | 63.0% | |
| CJJT1563363 portable monitor | 114.36 | 20.15 | 60,126 | 154,900 | 94,774 | 61.2% | big ticket |
| CJYD2856835 gimbal | 23.72 | 13.76 | 16,754 | 31,950 | 15,196 | 47.6% | |
| CJYD3050336 outdoor lav mic | 7.15 | 5.67 | 5,731 | 9,950 | 4,219 | 42.4% | |
| CJYD2857251 wireless lav mic | 3.52 | 5.93 | 4,224 | 4,950 | 726 | **14.7%** | ⚠ thin |
| CJEJ1281901 RGB headset | 12.26 | 15.07 | 12,217 | 16,950 | 4,733 | 27.9% | |
| CJJT1064975 M8 mouse | 38.32 | 10.64 | 21,885 | 51,950 | 30,065 | 57.9% | |
| CJJT1251952 RGB mouse | 7.46 | 7.47 | 6,674 | 10,950 | 4,276 | 39.1% | |
| CJJJJTJT38669 RGB keyboard | 20.33 | 20.70 | 18,340 | 27,950 | 9,610 | 34.4% | |
| CJJT2553155 skull lamp | 5.80 | 14.86 | 9,235 | 7,950 | **−1,285** | **−16.2%** | ❌ losing money |

**Actions flagged:** skull lamp underpriced (raise retail ~₡12,400+ or drop); wireless lav mic margin thin (raise to ~₡6,400+). French: freight to CR is heavy for small/heavy items — big levers are cartons & per-kg lines; verify with a real test order.

## Pending / next steps (in order)

1. **Payments go-live (CR-first)**: apply to **Tilopay** (BAC OK — bank-agnostic, covers BAC cards + Tasa Cero) — ask negotiated rates (SINPE, local card, international card, monthly fee, settlement); enable **PayPal**; add **manual SINPE** instructions payment method.
2. **Factura electrónica**: Hacienda registered ✓ — options: **ATV free (Hacienda portal, low volume)** vs **FacturaCR / Invoicloud (API)** ≈ ₡5–15k/mo; needs **firma digital (BCCR, ₡5–10k, 2 yrs)** + CABYS codes; wire chosen issuer to Shopify orders.
3. **DONE ✅ CR landed-cost tables (see above)** — but **pricing action needed on skull lamp & wireless lav mic** (user decision), then apply via `manage-product-variants`.
4. **Spanish localization pass** (titles, descriptions, policies) + resolve the 10 old drafts (fix/publish vs delete).
5. *(deferred — after 1–4)* Content calendar (5 hero products × Reels/TikTok), WhatsApp order flow, optional Mercado Libre CR.
6. *(deferred — after 1–5)* CJ fulfillment setup (connect store + prepaid balance), CR test order to own address, weekly margin/order tracking.
7. **Part 4 theme fixes** (approved, not yet done): `columns_desktop` setting, missing collections/search templates, hardcoded `/collections/all` → `routes.*`.

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
| `scripts/landed-cost-cr.cjs` | CJ freight quotes CN→CR for all SKUs → landed cost vs retail (paced 1.2s, needs `.env` + CJ token; data `landed-cost-cr.json`) |

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