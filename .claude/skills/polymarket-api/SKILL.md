---
name: polymarket-api
description: Verified Polymarket API reference (Gamma discovery, CLOB orders, geoblock) for implementing feature 001. Load before writing any code that talks to Polymarket. Facts verified 2026-08-31 against docs.polymarket.com; UNVERIFIED items are marked.
---

# Polymarket API facts (verified 2026-08-31)

Full machine-readable doc index: https://docs.polymarket.com/llms.txt — OpenAPI specs at `/api-spec/gamma-openapi.yaml` and `/api-spec/clob-openapi.yaml`. Re-verify anything marked UNVERIFIED before relying on it.

## Gamma API — market discovery (read-only, no auth)

- Base: `https://gamma-api.polymarket.com`. CORS is open (`access-control-allow-origin: *`), so browsers may call it directly; this project proxies through a server route anyway (one data path, caching, AI grounding).
- **Do not use the legacy offset `/markets` and `/events`** — they respond with `deprecation: true`, `sunset: 2026-05-01` (already past). Use the keyset endpoints:
  - `/markets/keyset`, `/events/keyset` — cursor pagination via `limit` + `after_cursor`, response carries `next_cursor`.
  - Filters: `closed=false`, `tag_id`/`tag_ids`, **`end_date_min=<ISO>`** (live-tested 2026-08-31; `end_date_after` and `endDateMin` are silently ignored). `closed=false` alone is NOT enough to exclude finished markets — it still returns markets dated months in the past flagged `closed:false, active:true`.
  - **Sorting: several numeric columns sort LEXICOGRAPHICALLY.** `order=volume&ascending=false` returns 99.99, then 999.84, then 9.99 (live-tested 2026-08-31); `liquidity` and `startDate` behave the same. `volume24hr` is genuinely numeric, and the **`volumeNum` / `liquidityNum` aliases** sort numerically. A broken ordering looks entirely plausible in the response, so check the values, not just that the request succeeds.
  - Text search: `/public-search?q=...` (searches events/tags/profiles). Tag list: `/tags`.
  - **`/public-search` paginates by `page=N`** and returns `pagination: {hasMore, totalResults}` (live-tested 2026-08-31). It **ignores `order`** — identical results across three orderings — so search results cannot be sorted. Its events carry nested markets that are frequently ALL resolved: for "bitcoin", pages 2 and 3 held zero open markets and page 4 held eleven. A client that renders one page verbatim will show an empty result while reporting more exist.
  - **`GET /markets/{id}`** returns a single market by id, including an authoritative `closed` / `active` flag (verified 2026-08-31). Use this to refresh one market — the keyset list is query-scoped and sends `closed=false`, so a market's absence from it means "filtered out or closed" and cannot distinguish the two.
  - Docs: https://docs.polymarket.com/market-data/discover-markets.md
- Market fields: `question`, `volume`, `volume24hr`, `liquidity`, `endDate`, `bestBid`/`bestAsk`, `active`, `closed`, `restricted`, tags — plus `outcomes`, `outcomePrices`, `clobTokenIds`, which are **JSON-encoded strings** (call `JSON.parse` on each). Docs: https://docs.polymarket.com/market-data/market-details.md

## CLOB API — orders and prices

- Base: `https://clob.polymarket.com`.
- Official TypeScript SDK: **`@polymarket/client`** (npm; v0.8.1 as of 2026-08-30) — `createPublicClient()` / `createSecureClient({signer})`, accepts Viem/Ethers5/Privy signers. The older `@polymarket/clob-client` (v5.8.1) still works but docs feature the new one. Docs: https://docs.polymarket.com/getting-started/typescript.md
- Auth: L1 EIP-712 signature (`clobAuthTypedData`, chainId 137/Polygon) exchanged at `POST /auth/api-key` or `GET /auth/derive-api-key` for L2 credentials (apiKey/secret/passphrase) used on order endpoints. Signature types: `EOA=0`, `POLY_PROXY=1`, `GNOSIS_SAFE=2`, `DEPOSIT_WALLET=3`. A MetaMask EOA user: sign L1 once → derive L2 creds → sign each order (EIP-712). "Session Keys" exist for delegated, time-limited trading. Docs: https://docs.polymarket.com/trading/wallets-auth.md
- Order types: limit `GTC`/`GTD`; market `FAK`/`FOK`. Docs: https://docs.polymarket.com/trading/place-orders.md
- **Collateral is pUSD** ("Polymarket USD", ERC-20 wrapper on a USDC claim, on Polygon) — it replaced USDC.e. Docs: https://docs.polymarket.com/concepts/pusd.md. Contracts (https://docs.polymarket.com/resources/contracts.md): CTF Exchange `0xE111180000d2663C0091e4f400237545B87B996B`, Neg-Risk Exchange `0xe2222d279d744050d28e00520010520000310F59`, CTF `0x4D97DCd97eC945f40cF65F87097ACe5EA0476045`, pUSD proxy `0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB`.
- **Contract addresses confirmed on-chain 2026-08-31** (Polygon mainnet, via a public RPC — read-only, no wallet needed): the pUSD proxy returns `name() = "Polymarket USD"`, `symbol() = "pUSD"`, `decimals() = 6`, with a live supply around 485M, and all three of the CTF Exchange, Neg-Risk Exchange and CTF addresses hold real bytecode (21038 / 21038 / 15008 bytes). **Amounts are 6-decimal**, not 18 — an 18-decimal assumption would be off by a factor of a trillion.
- STILL UNVERIFIED: **which spender to approve, and the approval flow per wallet type.** The docs expose `GET /balance-allowance/update` but do not name the target, and 2024/25 tutorials citing USDC.e and the retired exchange address are stale. Determining this needs a funded wallet in a non-restricted region — it is feature 001's T21 spike, and it cannot be answered read-only, because the question is what a working approval actually points at.
- Read-only, no auth, CORS open (live-tested): `/midpoint?token_id=`, `/price?token_id=&side=buy`, `/book?token_id=`.
- **The order book does not survive resolution.** `/price` on a closed market's token returns `{"error":"No orderbook exists for the requested token id"}` (live-tested 2026-08-31). Anything that needs a settled market's outcome must read Gamma's `outcomePrices`, not the book — and note those are inconsistent too: many resolved markets report `["0","0"]`, from which no winner follows. Treating that as a price is how a position gets reported as lost when nothing was published.

## Geo-restrictions (as of Aug 2026)

- Main platform: the **US is close-only** — no new orders, frontend and API; blocked orders are rejected server-side. Check endpoint: `GET https://polymarket.com/api/geoblock` → e.g. `{"blocked":true,"country":"US","region":"FL"}`. Builders are expected to call it pre-trade and surface the state. Tiers: OFAC full-block; ~35 close-only jurisdictions (incl. US, UK, DE, FR); frontend-only close list (incl. JP, IE, NL, MT). Docs: https://docs.polymarket.com/api-reference/geoblock
- US-regulated trading launched separately: QCEX/QCX LLC (CFTC-designated Nov 2025), live 2026 at its own platform with **different APIs** — https://docs.polymarket.us. Out of scope for feature 001. Roughly 8 US states reportedly ban it regardless (AZ, IL, MA, MD, MI, MT, NV, OH — secondary sources).
- Per-market `restricted` flag exists in Gamma responses.

## Operational notes

- Rate limits: no official documentation. Third-party folklore says ~4,000 req/10s Gamma, ~9,000/10s CLOB — UNVERIFIED; cache server-side and degrade politely on 429.
- Nothing read-only needs an API key (Gamma, CLOB price endpoints).
