## Open Questions

1. **Scope of the fix — just Bull/Bear, or all undescribed symbols?**
   The issue title/description says "some markets, including Bull and Bear" but the Expected result only specifies copy for Bull and Bear.
    - **(A) — RECOMMENDED:** Fix only `RDBULL` and `RDBEAR` (the two the issue provides approved copy for). Partial coverage is safe by design.
    - (B) Also audit every offered `underlying_symbol` against `MARKET_DESCRIPTIONS` and backfill all gaps — larger, needs approved copy per symbol which the issue does not provide.
      This plan implements **(A)**; a follow-up issue can track a full audit if desired.

## 1. Implementation

- [x] 1.1 In `packages/trader/src/AppV2/Utils/market-descriptions.ts`, add a new comment group `// ---- Derived: Bull/Bear Market Index ----` with two entries:
    - `RDBULL: () => localize('Positive drift and constant volatility with a tick every 2 seconds'),`
    - `RDBEAR: () => localize('Negative drift and constant volatility with a tick every 2 seconds'),`

## 2. Tests

- [x] 2.1 In `packages/trader/src/AppV2/Utils/__tests__/market-descriptions.spec.ts`, add assertions that `getMarketDescription('RDBULL')` returns `'Positive drift and constant volatility with a tick every 2 seconds'` and `getMarketDescription('RDBEAR')` returns `'Negative drift and constant volatility with a tick every 2 seconds'`.
- [x] 2.2 Run `npm run test:jest -- packages/trader/src/AppV2/Utils/__tests__/market-descriptions.spec.ts` and confirm the suite passes.

## 3. Verification

- [x] 3.1 Run `openspec validate market-descriptions-are-missing-for-bull-and-bear-markets` and confirm it passes with no structural errors.
- [x] 3.2 Confirm no change is needed in `packages/trader/src/AppV2/Components/MarketSelection/market-info-screen.tsx` — it already reads `getMarketDescription(underlying_symbol)` (line 142) and conditionally renders the description block (line 331).
