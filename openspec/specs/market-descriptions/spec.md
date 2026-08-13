# market-descriptions Specification

## Purpose

TBD - created by archiving change market-descriptions-are-missing-for-bull-and-bear-markets. Update Purpose after archive.

## Requirements

### Requirement: Bull and Bear Market indices have descriptions

The market description lookup (`getMarketDescription`) SHALL return a non-empty, translatable description for the Bull Market Index (`RDBULL`) and Bear Market Index (`RDBEAR`) underlying symbols, so the market info screen displays their description block instead of rendering empty.

The descriptions SHALL be:

- `RDBULL` → "Positive drift and constant volatility with a tick every 2 seconds"
- `RDBEAR` → "Negative drift and constant volatility with a tick every 2 seconds"

Each description MUST be wrapped in `localize()` so it is picked up for translation, consistent with every other entry in the description map.

#### Scenario: Bull Market Index resolves to its description

- **WHEN** `getMarketDescription('RDBULL')` is called
- **THEN** it returns "Positive drift and constant volatility with a tick every 2 seconds"

#### Scenario: Bear Market Index resolves to its description

- **WHEN** `getMarketDescription('RDBEAR')` is called
- **THEN** it returns "Negative drift and constant volatility with a tick every 2 seconds"

#### Scenario: Market info screen shows the description for Bull/Bear markets

- **WHEN** the market info screen is opened for `RDBULL` or `RDBEAR`
- **THEN** the description block is rendered with the resolved text rather than being hidden

### Requirement: Unknown symbols still resolve to an empty description

`getMarketDescription` SHALL continue to return an empty string for any symbol without an entry, so adding Bull/Bear coverage does not change the safe partial-coverage behaviour.

#### Scenario: Symbol without an entry returns empty string

- **WHEN** `getMarketDescription` is called with a symbol that has no map entry (e.g. `frxNZDCHF`)
- **THEN** it returns an empty string and the description block is not rendered
