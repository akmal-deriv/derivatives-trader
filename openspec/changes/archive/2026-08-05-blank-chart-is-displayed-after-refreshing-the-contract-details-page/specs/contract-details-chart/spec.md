## ADDED Requirements

### Requirement: Chart defers reference-data fetch until the WebSocket connection is open

The Contract Details / contract-replay chart SHALL NOT request its reference data (`active_symbols` and `trading_times`) until the WebSocket connection is open. The connection state SHALL be derived from the `common.is_socket_opened` observable and passed into the SmartCharts adapter hook (`useSmartChartsAdapter`) as `is_connection_opened`. While the connection is not open, the chart SHALL remain in its loading state rather than issuing a request that would fail.

#### Scenario: Page refreshed before the socket is open

- **WHEN** the Contract Details page is refreshed and the chart mounts while `is_socket_opened` is `false`
- **THEN** the SmartCharts adapter does not call `WS.activeSymbols` or fetch reference data
- **AND** the chart shows its loading indicator instead of a blank chart

#### Scenario: Socket opens after the chart has mounted

- **WHEN** the chart has mounted with `is_socket_opened` `false` and the WebSocket connection subsequently becomes open (`is_socket_opened` transitions to `true`)
- **THEN** the SmartCharts adapter performs its initial reference-data fetch exactly once
- **AND** the chart renders successfully once the reference data resolves

### Requirement: Chart renders successfully after a Contract Details page refresh

After refreshing the Contract Details page, the chart SHALL load its reference data and render the price chart once the connection is established. The permanent loading/blank state caused by fetching before connection readiness SHALL NOT occur.

#### Scenario: Successful load after refresh

- **WHEN** the user refreshes the Contract Details page and the WebSocket connection becomes open
- **THEN** `active_symbols` and `trading_times` are fetched successfully
- **AND** the chart transitions out of the loading state and displays the contract's price chart

### Requirement: Fetch gating does not regress charts mounted after connection is open

Charts that mount when the WebSocket connection is already open (e.g. the trade chart) SHALL fetch their reference data on mount as before, with no added delay from the connection gate.

#### Scenario: Trade chart mounts with an already-open socket

- **WHEN** a chart mounts while `is_socket_opened` is already `true`
- **THEN** the SmartCharts adapter performs its initial reference-data fetch on mount without waiting
