# Plan 001 — Polymarket Betting Widget with AI Assist

**Status:** Draft — awaiting user approval
**Spec:** ./spec.md (approved 2026-08-31, no open `[NEEDS CLARIFICATION]` markers)

Polymarket API facts referenced below were verified against docs.polymarket.com on 2026-08-31 and recorded in `.claude/skills/polymarket-api/SKILL.md` — load that skill before writing any Polymarket-facing code.

## Stack

| Choice | Traces to |
|---|---|
| **Next.js (App Router) + TypeScript**, deployed on **Vercel** | Pre-decided in CLAUDE.md; server routes keep secrets server-side (Art. IV); single page (spec D1) is one route |
| **Tailwind CSS** | Fast, dependency-light styling for a one-page UI; no runtime dependency (Art. VI: smallest set) |
| **`@anthropic-ai/sdk`** (server only) | AI-assisted predictions (US-4); Art. IV |
| **`@polymarket/client`** (official Polymarket TS SDK) | Order placement + prices (US-2); current SDK per Polymarket docs (the older `@polymarket/clob-client` is legacy) |
| **wagmi + viem** | Wallet connect and signing (US-2, spec D3); viem signer plugs directly into `@polymarket/client`'s `createSecureClient` |
| **No database, no server-side user state** | Spec out-of-scope; demo balance is per-session client state (US-3) |

## Architecture

One page (`/`) with three panels — market list + search, bet panel (real/demo), AI assist — plus three server routes:

```
browser (widget page)
  ├─ GET /api/markets ──→ Gamma /markets/keyset (closed=false, order=volume24hr)   [cached ~30s]
  ├─ POST /api/assist ──→ Gamma (candidate markets) → Claude API → suggestions      [streamed]
  ├─ GET /api/geo ─────→ Vercel geo header + close-only country list → {betting: on|off}
  └─ wallet + CLOB (client-side only): wagmi connect → L1/L2 auth → signed order → clob.polymarket.com
```

- Market data is proxied server-side even though Gamma allows CORS: one data path, response normalization (Gamma returns `outcomes`/`outcomePrices`/`clobTokenIds` as JSON-encoded strings), short-lived caching against unknown rate limits, and the same fetch feeds AI grounding.
- Nothing touching funds or keys ever runs server-side (Art. III): order signing happens in the browser via the user's wallet.

## Data flow (per story)

- **US-1 Search/browse:** page loads markets from `/api/markets` (top by 24h volume, keyset pagination); keyword search via Gamma `/public-search`, category filter via tags. Poll/refresh without reload. No wallet involved.
- **US-2 Real bet:** connect wallet (wagmi injected/WalletConnect, Polygon) → `@polymarket/client` `createSecureClient` with the viem signer → L1 EIP-712 auth, derive L2 creds (signatureType EOA=0) → user picks outcome + amount → **confirmation modal showing market, outcome, amount, price, estimated payout (Art. II)** → market-style FOK/FAK buy order signed by the wallet → success shows position, failure shows plain-language reason. Collateral is **pUSD** (Polymarket's USDC-claim wrapper on Polygon); balance/allowance handling is Risk 1 below.
- **US-3 Demo mode:** toggle switches the bet panel to a simulated per-session balance (starts at $1,000, resets on reload); "orders" fill at the live best ask from CLOB `/price` (no auth); identical confirmation modal; every control and result labeled DEMO. Available regardless of geo (moves no money).
- **US-4 AI assist:** user describes interest → `POST /api/assist` → route fetches current candidate markets from Gamma and passes them to Claude (`claude-opus-5` via `@anthropic-ai/sdk`, streaming, structured output constrained to the provided market/outcome ids — the model cannot name a market it wasn't given, satisfying "never invented ones") → suggestions render with reasoning + live price and a **"not financial advice" disclaimer (Art. V)** → selecting one only pre-fills the bet form (Art. II).
- **US-5 Geo degrade:** `/api/geo` maps the request's country (Vercel geo header) against the close-only/blocked tiers (US included — see Risk 2); when restricted, real-bet controls are disabled with an explanation while browse, AI, and demo stay live. Per-market `restricted` flag from Gamma is respected too. Pre-trade, the client also consults Polymarket's own `GET polymarket.com/api/geoblock` as the authoritative signal.

## External APIs and services

| Service | Used for | Auth | Notes |
|---|---|---|---|
| Gamma API (`gamma-api.polymarket.com`) | US-1 discovery, US-4 grounding | none | **Keyset endpoints only** — offset `/markets` is past its documented sunset |
| CLOB API (`clob.polymarket.com`) | US-2 orders; US-3/US-2 prices | L1 wallet sig → L2 derived creds (orders); none (prices) | Order signing client-side only |
| `polymarket.com/api/geoblock` | US-5 authoritative geo check | none | Builders are expected to call it pre-trade |
| Claude API (Messages) | US-4 suggestions | `ANTHROPIC_API_KEY`, server-side (Art. IV) | Model `claude-opus-5` (env-overridable); streaming; structured outputs |

Endpoint/field details live in `.claude/skills/polymarket-api/SKILL.md`.

## Environment and deployment

- Vercel, Next.js defaults; preview deploys per PR. Netlify remains a documented fallback (README).
- Env vars (`.env.example` updated in this change): `ANTHROPIC_API_KEY` (required, server-only), `ANTHROPIC_MODEL` (optional override, default `claude-opus-5`). No Polymarket credentials exist server-side (Art. III).

## Risks and open items

1. **pUSD allowance/approval flow is UNVERIFIED** (docs don't spell out approval targets; older tutorials are stale — they cite USDC.e and retired contract addresses). Mitigation: the first US-2 task is a spike validating one minimal real order end-to-end; real-bet UI ships only after the spike passes.
2. **US is close-only on the main platform** — a US user (or reviewer) cannot place real orders there; the separate US-regulated platform (`docs.polymarket.us`) has different APIs and is out of scope for 001. Consequence: in the US the widget correctly runs in read-only + demo mode (exactly spec US-5 + US-3); real-bet verification needs a non-restricted region. Surfaced as its own line in the geo explanation.
3. **Rate limits undocumented** — server-side caching (~30s) on market data; polite degradation on 429.
4. **`@polymarket/client` is v0.x** — pin the exact version; wrap it behind one small module so a breaking change stays local.

## Constitution check

- **Art. I (spec before code):** this plan implements approved spec 001 only; no code until tasks.md is approved — the sdd-gate hook enforces it. **Pass.**
- **Art. II (AI suggests, humans decide):** `/api/assist` returns suggestions that pre-fill a form; the only path to an order runs through the confirmation modal listing all five mandated fields; no code path chains AI output into a transaction. **Pass.**
- **Art. III (custody stays with the user):** orders signed in-browser by the user's wallet; server holds no keys, funds, or Polymarket credentials. **Pass.**
- **Art. IV (secrets server-side):** the only secret is `ANTHROPIC_API_KEY`, used exclusively in `/api/assist`; `.env.example` documents it. **Pass.**
- **Art. V (compliance is a requirement):** geo handling is a first-class route + UI state (US-5); the disclaimer is an acceptance criterion of US-4 and rendered with every suggestion. **Pass.**
- **Art. VI (small, verifiable steps):** dependency set is six packages, each justified above; tasks.md will give every task a Verify line. **Pass.**

**Spec correction made in this change (Art. I — docs describe reality):** spec US-2 said the wallet holds "USDC on Polygon"; Polymarket migrated collateral to pUSD (a USDC-claim wrapper). The acceptance criterion now names pUSD. Scope is unchanged.

## Approval

- [ ] Plan approved by user (required before `/tasks`)
