# market-info-sync Specification

## Purpose
TBD - created by archiving change market-info-page-displays-information-from-the-previously-selected-trade-type. Update Purpose after archive.
## Requirements
### Requirement: Browse trade type resyncs to the live store contract type

The market-selector hook (`useMarketSelection`) SHALL keep its local browse trade type (`selected_trade_type`) synchronised with the trade store's current `contract_type`: whenever the store's `contract_type` changes, the browse trade type SHALL reset to the trade-type tab that owns the new `contract_type` (via `getTradeTypeForContractType`), falling back to the first available contract when the new `contract_type` maps to no tab.

This resync SHALL NOT clobber a browse tab the user is actively looking at within a single open session: only the store's `contract_type` changing, or the selector being closed, triggers the reset. A user's voluntary pick of a different browse tab via `handleSelectTradeType` changes only the local state and is preserved for the rest of that open session.

#### Scenario: Switching trade type on the strip updates the selector's browse trade type

- **WHEN** the trade store's `contract_type` changes from `rise_fall` to `accumulator` (e.g. the user switched the active tab on the strip)
- **THEN** `useMarketSelection`'s `current_trade_type` reflects the Accumulators tab on the next read, not Rise/Fall

#### Scenario: Reopening the selector after a strip switch browses the new trade type

- **WHEN** the selector is closed, the store's `contract_type` changes from `rise_fall` to `accumulator`, and the selector is then reopened
- **THEN** the browse list and the Market Info page are scoped to the Accumulators trade type, not the previously selected Rise/Fall

#### Scenario: A user's voluntary browse-tab pick is preserved within a session

- **WHEN** the user opens the selector (store `contract_type` is `rise_fall`), taps the Multipliers browse tab, and does not commit a selection
- **THEN** the selector continues to browse Multipliers for the remainder of that open session, until the store's `contract_type` changes or the selector is closed

### Requirement: Browse state re-seeds on every open/close cycle

`useMarketSelection` stays mounted across selector open/close cycles (the desktop popover shell stays mounted; the mobile shell calls the hook before its `!isOpen` early return), so it SHALL re-seed its browse state from the store's current `contract_type` on every open/close cycle — not only when `contract_type` changes. The re-seed SHALL reset the browse trade type, the selected market category, the favourites tab, search mode (`is_searching`), and the info-screen state, so a trade type the user browsed to but never committed cannot leak into the next open.

The re-seed SHALL be driven by the selector's open state alone, independent of which code path closed it — the onboarding guide sets the store's `is_market_selector_open` to `false` directly, without routing through the hook's `handleClose` — so no browse state can survive a close that bypasses the close handler.

The re-seed SHALL take effect as the selector closes, so the reopened selector renders the currently selected trade type from its first render — never a frame of the abandoned tab, and never a symbol fetch for it.

The hook SHALL receive the shell's open state as an `is_open` input; both device shells SHALL pass their own `isOpen` through.

#### Scenario: An abandoned browse-tab pick does not survive a reopen

- **WHEN** the selected trade type is Accumulators, the user opens the selector, switches the browse tab to Turbos, picks no market, closes the selector, and reopens it
- **THEN** the selector browses Accumulators — the currently selected trade type — not Turbos

#### Scenario: An abandoned category and favourites tab do not survive a reopen

- **WHEN** the user opens the selector, switches to the favourites tab or a market category, closes the selector, and reopens it
- **THEN** the favourites tab is deselected and the category falls back to the default for the current trade type (so a category that does not exist for that trade type can never filter the list to empty)

#### Scenario: Search mode does not survive a close that bypasses the close handler

- **WHEN** the user opens the selector on mobile, taps search, and the selector is then closed by a path that sets the store's `is_market_selector_open` to `false` directly (the onboarding guide) rather than through the header's close button
- **THEN** reopening the selector shows the trade-type tabs and market list, not the search page

#### Scenario: The Market Info page opened after a reopen reflects the selected trade type

- **WHEN** the user browses a different trade type without committing, closes the selector, reopens it, and opens the Market Info page for a market
- **THEN** the info screen is scoped to the currently selected trade type's market list, not the abandoned browse trade type

### Requirement: Stale info-screen state is cleared on trade-type change

When the trade store's `contract_type` changes, `useMarketSelection` SHALL clear any in-flight info-screen state (`info_symbol` and `info_trade_type`) so the Market Info page can never render data resolved from a previously selected trade type.

#### Scenario: Info symbol is cleared when the active trade type changes

- **WHEN** `info_symbol` is set (the info screen was open or about to open) and the store's `contract_type` changes
- **THEN** `info_symbol` and `info_trade_type` are reset to their empty/null initial values, and `info_item` resolves to `undefined` until a new info screen is opened from the current context

#### Scenario: Opening the Market Info page after a strip switch shows the current market

- **WHEN** the user closes the Market Info page, switches trade type and symbol on the strip to Accumulators, reopens the selector, and opens the Market Info page
- **THEN** the info screen renders for the currently selected Accumulators market, not the previously viewed market

