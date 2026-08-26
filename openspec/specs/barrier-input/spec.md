# barrier-input Specification

## Purpose

TBD - created by archiving change touch-no-touch-barrier-input-unusable-barrier-errors-omit-the-valid-range-all-trade-types. Update Purpose after archive.

## Requirements

### Requirement: Barrier support is derived from the API per-expiry default barrier

The barrier field SHALL determine whether a barrier is entered as a relative offset or an absolute price from the sign of the default barrier that `contracts_for` returns for the selected contract type and `expiry_type`, NOT from a hardcoded market check (`market === 'forex'`). A default barrier that begins with `+` or `-` SHALL be treated as a relative offset; a default barrier that is a bare number SHALL be treated as an absolute price.

The derivation SHALL be per contract type and per `expiry_type`. It SHALL NOT assume "ticks are always relative": a contract type whose API default barrier is absolute at tick duration (e.g. `turbos`) SHALL present an absolute barrier at tick duration.

#### Scenario: Touch/No Touch on a tick duration uses a relative barrier

- **WHEN** the user selects Touch/No Touch on `1HZ50V` with a tick duration and opens the Barrier field
- **AND** `contracts_for` returns a `tick` default barrier of `+39.37` (relative)
- **THEN** the barrier field presents a relative offset control with "Above spot" and "Below spot" as its options
- **AND** it does NOT offer a "Fixed barrier" (absolute-price) option for that duration

#### Scenario: Turbos on a tick duration uses an absolute barrier

- **WHEN** the user selects a contract type whose `contracts_for` `tick` default barrier is a bare number (absolute), such as `turbos`
- **THEN** the barrier field presents an absolute-price control
- **AND** it does NOT force a relative offset just because the duration is ticks

#### Scenario: Forex still uses absolute barriers via the same rule

- **WHEN** the user selects a barrier contract on a forex symbol whose API default barrier is a bare absolute number
- **THEN** the barrier field presents an absolute-price control, arrived at from the default-barrier sign rather than from a hardcoded `market === 'forex'` branch

### Requirement: Barrier field pre-populates the API default for the current trade type and duration

When the barrier field is opened with no user-entered value, it SHALL pre-populate with the default barrier that `contracts_for` returns for the current contract type and `expiry_type` (already parsed into the store as `barrier_1` by `getBarriers`). The hardcoded constants (`+0.1` relative, `1.0000` absolute) SHALL be used only as a last-resort fallback when the API provides no default barrier.

#### Scenario: Default matches the API scale, not a hardcoded guess

- **WHEN** the barrier field opens for Touch/No Touch on `1HZ50V` ticks and `barrier_1` is empty
- **AND** the API `tick` default barrier is `+39.37`
- **THEN** the field is pre-filled with a value on the `+39.37` scale (the API default), not `+0.1`

#### Scenario: Fallback only when no API default exists

- **WHEN** the barrier field opens and `contracts_for` provides no default barrier for the current contract type and `expiry_type`
- **THEN** the field falls back to the hardcoded default appropriate to the derived support type (relative or absolute)

### Requirement: A relative barrier offers only its two sign options

The relative barrier input SHALL offer "Above spot" and "Below spot" as its options and SHALL NOT offer "Fixed barrier": a relative barrier is a signed offset from spot, so an absolute price is not one of its choices. Changing the sign SHALL preserve the entered numeric magnitude and SHALL change only the leading `+`/`-` written to `barrier_1`. The `+`/`-` glyph rendered as the input's own addon is unaffected by this requirement.

#### Scenario: Changing the sign keeps the magnitude

- **WHEN** the user has entered a relative barrier magnitude and switches between "Above spot" and "Below spot"
- **THEN** the numeric magnitude is unchanged
- **AND** only the leading sign of the saved `barrier_1` value flips between `+` and `-`

#### Scenario: Fixed barrier is not offered for a relative barrier

- **WHEN** a relative barrier input is displayed (mobile or desktop)
- **THEN** "Above spot" and "Below spot" are offered
- **AND** no "Fixed barrier" option is shown for that duration

### Requirement: The expiry type barrier data is resolved under is derived correctly

`contract_expiry_type` SHALL distinguish `tick`, `intraday` and `daily`, derived from the duration unit, expiry type and expiry date. It SHALL NOT report `intraday` for a days duration or a future end time, because it keys the per-expiry data `contracts_for` returns — both the default barrier and the duration limits.

#### Scenario: A days duration resolves against the daily entry

- **WHEN** the user selects a days duration on a barrier contract
- **THEN** `contract_expiry_type` is `daily`
- **AND** barrier support is derived from the `daily` default barrier — absolute for `touchnotouch` on `1HZ50V` — so the field presents a fixed-price control

#### Scenario: The barrier value follows an expiry-type change

- **WHEN** the selected duration moves across an expiry boundary (e.g. minutes to days, which also flips relative to absolute)
- **THEN** the barrier value is re-seeded from the new expiry type's API default
- **AND** the previous expiry type's value is not left in a field that no longer accepts it

#### Scenario: A contract with no barrier for the new expiry type keeps its value

- **WHEN** the expiry type changes and `contracts_for` offers no default barrier for the new expiry type
- **THEN** the existing barrier value is left in place rather than blanked

### Requirement: Barrier support derivation is consistent across mobile and desktop

The absolute-vs-relative derivation and the default pre-population SHALL be sourced from one shared source of truth so the AppV2 mobile (`barrier-input.tsx`) and desktop (`barrier-desktop.tsx` / `barrier-content-desktop.tsx`) barrier controls behave identically. The duplicated `getBarrierSupport` / `barrierSupport` logic in those components SHALL be replaced by that shared derivation.

#### Scenario: Mobile and desktop agree on the same symbol/duration

- **WHEN** the same contract type and `expiry_type` are selected
- **THEN** the mobile and desktop barrier controls derive the same support type and the same pre-populated default

### Requirement: Unresolved barrier support falls back to relative

While the symbol list has not loaded, or the selected symbol is not in it, barrier support SHALL be reported as `relative`. The barrier field renders from a static per-trade-type map that does not wait for `active_symbols`, and most barrier symbols are synthetics, so reporting `absolute` would present a fixed-price field that then switches once the data arrives.

#### Scenario: Barrier field opens before active_symbols has loaded

- **WHEN** the barrier field renders and the symbol cannot yet be resolved
- **THEN** support is reported as relative
- **AND** the same single derivation is used by mobile and desktop — there is no per-caller fallback
