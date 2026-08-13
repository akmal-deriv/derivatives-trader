# positions-drawer Specification

## Purpose
TBD - created by archiving change total-p-l-amount-is-inaccurate. Update Purpose after archive.
## Requirements
### Requirement: Open tab summary visibility

The Open tab summary footer of the positions sidebar flyout SHALL be displayed only when at least one position is currently open. When there are no open positions, the footer MUST NOT render, regardless of how many closed/settled positions exist, and only the empty-portfolio message SHALL be shown in the list area.

#### Scenario: No open positions after all contracts settle

- **WHEN** the Open tab is shown and every contract has expired and settled so that `portfolio.active_positions` is empty
- **THEN** the summary footer bar is not rendered
- **AND** only the empty-portfolio message is shown

#### Scenario: No positions at all

- **WHEN** the Open tab is shown and there are no positions of any kind
- **THEN** the summary footer bar is not rendered

#### Scenario: At least one open position

- **WHEN** the Open tab is shown and `portfolio.active_positions` contains one or more positions
- **THEN** the summary footer bar is rendered with the open-position count and Total P/L

#### Scenario: Account is switching

- **WHEN** the Open tab is shown and the account is switching (`ui.is_switching_account` is true)
- **THEN** the summary footer bar is not rendered

### Requirement: Open tab Total P/L excludes closed positions

The Open tab Total P/L SHALL equal the sum of the profit/loss of the open positions listed in that tab, and MUST exclude the profit/loss of any position that has already closed or settled. The profit/loss of a closed contract SHALL be reflected only in the Closed tab total, never counted in the Open tab total.

#### Scenario: Mixed open and closed positions

- **WHEN** one contract has settled and another is still running, and the Open tab summary is shown
- **THEN** the Total P/L equals the profit/loss of the still-running position only
- **AND** the Total P/L excludes the profit/loss of the settled contract

#### Scenario: Total matches the visible cards

- **WHEN** the Open tab lists one or more open position cards with a summary footer
- **THEN** the Total P/L equals the arithmetic sum of the profit/loss of exactly those listed open position cards

#### Scenario: Open-position count reflects open positions only

- **WHEN** the Open tab summary is shown
- **THEN** the displayed count equals the number of open positions (`portfolio.active_positions.length`), using the singular label for one position and the plural label otherwise

