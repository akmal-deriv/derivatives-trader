## ADDED Requirements

### Requirement: A rejected barrier states the accepted range

When a barrier (or range) input is rejected, the error message shown to the user SHALL state the accepted range whenever that range is available from the proposal response. The range SHALL be sourced from the proposal error's `code_args` (e.g. the `BarrierNotInRange` mapping in `error-message-mapper.ts`) and, when present, from the contract's `barrier_choices` bounds. Bounds taken from `barrier_choices` SHALL be quoted using the API's own strings, preserving the sign convention and decimal places the user is expected to type (e.g. `+207.90`, not `207.9`). This applies to every trade type that takes a barrier or range, not only Touch/No Touch.

#### Scenario: Out-of-range barrier shows the range

- **WHEN** the user submits a barrier the backend rejects with a range-bearing error (subcode `BarrierNotInRange` with `code_args` `[min, max]`)
- **THEN** the barrier field shows a message that includes the accepted minimum and maximum
- **AND** the same message wiring is used for Touch/No Touch as for other barrier trade types

#### Scenario: Range surfaced for Touch/No Touch specifically

- **WHEN** a Touch/No Touch barrier is rejected on `1HZ50V` and the proposal error carries a range
- **THEN** the error message states that range rather than an unqualified "invalid barrier" message

### Requirement: A rejected barrier states the expected format when no numeric range is available

When no numeric range is available from the proposal response, the barrier error message SHALL still tell the user the expected format (for example, that a relative offset must be entered with a leading `+`/`-`, or that an absolute price is expected), rather than rejecting the input with no correctable guidance.

#### Scenario: No range available falls back to a format hint

- **WHEN** a barrier is rejected and the proposal response carries no range for it
- **THEN** the message names the expected format/sign for the current barrier support type
- **AND** the message is not a bare "invalid" string with no guidance

### Requirement: Client-side barrier messages do not contradict the API range

The client-side barrier validation messages (required, cannot be zero, complete number, valid number) SHALL be preserved, and SHALL not override or contradict a range/format message coming from the proposal response. When both a client-side message and an API range message apply, the message that gives the user the most actionable correction (the API range) SHALL be shown.

#### Scenario: API range takes precedence over a generic client message

- **WHEN** the input passes client-side checks (non-empty, non-zero, numeric) but the backend rejects it as out of range
- **THEN** the range-bearing API message is shown rather than a generic client-side message

#### Scenario: Required/zero checks still fire before a proposal is sent

- **WHEN** the field is empty or zero
- **THEN** the existing client-side "required" / "cannot be zero" messages still fire (no proposal request is needed to show them)
