# AGENTS.md — Pabs eStore workspace guidance

Auto-loaded into every OpenCode session in this workspace. Read `PROJECT_STATE.md`
for the live status snapshot (products, IDs, next steps); this file is the *how we work*,
that file is *where we are*.

## Mission & style

- Manage **Pabs eStore** (Shopify, currency **CRC**), sourcing products from
  **CJdropshipping** (wholesale USD) at a **3× margin** by default.
- Keep docs and answers **beginner-friendly**: short paragraphs, tables, concrete
  commands, no jargon without a one-line explanation.
- Work lives in git (`origin` = `github.com/pabsestore/Shopify`); commit + push
  at each meaningful milestone.

## The 3 MCP servers (opencode.json)

| Server | Purpose | Notes |
|---|---|---|
| `shopify-store` | create/read products, variants, orders, customers | `create-product` makes products **ACTIVE (published)**, but does **not** set `published_at` — run `scripts/publish-online.cjs` (or `publish-item.cjs`) to make them visible on the storefront |
| `shopify-dev-mcp` | Shopify docs search + theme validation | |
| `cj-shopify` | CJ catalog search, product detail | **CJ QPS = 1 request/second — never parallel CJ calls; pace ≥1.2s** |

## Product sourcing pipeline (see `/.opencode/commands/trends.md`)

1. **Web research** → 8–12 candidates with demand signals.
2. **Verify on CJ** — one search per call (`search_products`/`listV2`); require real
   `sellPrice`, `warehouseInventoryNum` (stock), `bigImage`, `sku`.
3. **Pricing** — retail ≈ **3 × wholesale USD**; convert at current CRC rate
   (**≈ ₡447/USD in Sep 2026 — re-check before quoting**). Show 3× USD and suggested
   CRC. **Final CRC retail is always decided by the user** — present a batch table and
   get explicit go-ahead before creating anything.
4. **Publish** — `create-product` (ACTIVE) with:
   - `handle`: explicit, kebab-case
   - metafields under namespace **`cj_mcp`** (≥3 chars required): `sku`, `source_url`, `wholesale_usd`
   - price set via `manage-product-variants` on the **existing "Default Title" variant**
     (updating it works; creating another throws "already exists")
   - tags: category + `trending` + `gaming`/`streaming`/`tech`
5. **Make it live on the site** (the #1 missed step):
   - `node scripts/publish-item.cjs <productId> "<bigImageUrl>" "<alt>" 699828797713`
     → sets `published_at` (goes public), attaches the image, joins **Trending** collection
     (id **699828797713**).
   - or the batch script `scripts/publish-enrich.cjs`.
6. **Verify on the storefront** (fetch `https://pabs-estore.myshopify.com/products.json`
   and the homepage, check the product handle appears).

CJ direct REST (bypasses MCP for scripts): base
`https://developers.cjdropshipping.com/api2.0/v1`, header `CJ-Access-Token`,
`product/listV2?keyWord=&page=1&size=5&startWarehouseInventory=1`.

## Guardrails (also enforced in opencode.json)

- **Money/order/store CJ tools are `effect: ask`** — never place orders, confirm carts,
  pay, create disputes, or set up CJ↔Shopify connections without explicit permission.
- **Secrets only in `.env`** (gitignored). CJ session: `~/.cj-mcp-token` (per device,
  encrypted with `TOKEN_ENCRYPT_KEY`). Shopify admin tokens self-heal (24h, client
  credentials grant — handled by `shopify.js`).
- **Theme pushes** need the *canonical* domain (`nmn0zj-44.myshopify.com`), the live
  theme id (`185443156241`) and `--allow-live`. Admin API / MCP use the *primary*
  domain (`pabs-estore.myshopify.com`). CLI rejects `-i`, use `-t`.
- Theme JSON collection settings store **handle strings** (`"trending"`), never
  `{id, handle}` objects and never `"all"` (homepage placeholders if wrong).

## Workflow feelings to keep

- Show batch tables and pricing math before acting; verify after acting.
- Reuse `scripts/*.cjs` rather than re-inventing calls (they already handle pacing,
  auth, and the exact API shapes).
- When unsure about current numbers (CRC rate, inventory, live theme), check live
  data instead of trusting this doc.