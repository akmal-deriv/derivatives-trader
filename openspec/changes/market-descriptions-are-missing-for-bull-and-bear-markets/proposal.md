## Why

The AppV2 market info screen shows a short per-symbol description under the market name, but the Bull Market Index (`RDBULL`) and Bear Market Index (`RDBEAR`) have no entry in the description map, so their description area renders empty (issue #1029). This is an inconsistent experience and leaves new traders without an explanation of what these two markets represent, unlike the Volatility, Crash/Boom, Step, and other derived indices that already carry descriptions.

## What Changes

- Add descriptions for the two derived indices currently missing them in `MARKET_DESCRIPTIONS`:
    - `RDBULL` (Bull Market Index) → "Positive drift and constant volatility with a tick every 2 seconds"
    - `RDBEAR` (Bear Market Index) → "Negative drift and constant volatility with a tick every 2 seconds"
- Copy is wrapped in `localize()` for translation, matching every other entry in the map.
- Extend the co-located unit test to assert the two new symbols resolve to their descriptions.

No behaviour changes to the render path: `market-info-screen.tsx` already reads `getMarketDescription(underlying_symbol)` and conditionally renders the description block, so populating the map is sufficient — no UI code changes are required.

## Capabilities

### New Capabilities

- `market-descriptions`: The per-symbol description text shown on the market info screen, resolved from `underlying_symbol` via `getMarketDescription`. This change formalises the requirement that every derived index the app offers has a description, and specifically that Bull Market and Bear Market indices are covered.

### Modified Capabilities

<!-- None: no existing spec in openspec/specs/ describes this behaviour yet. -->

## Impact

- Code: `packages/trader/src/AppV2/Utils/market-descriptions.ts` (add two map entries).
- Tests: `packages/trader/src/AppV2/Utils/__tests__/market-descriptions.spec.ts` (add assertions for `RDBULL` and `RDBEAR`).
- Consumers: `packages/trader/src/AppV2/Components/MarketSelection/market-info-screen.tsx` reads the map but needs no change.
- Translations: two new `localize()` source strings enter the extraction pipeline (Crowdin).
- No API, dependency, store, or routing changes.
