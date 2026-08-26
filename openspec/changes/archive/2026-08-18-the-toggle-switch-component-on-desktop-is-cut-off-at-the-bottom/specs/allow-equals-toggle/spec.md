## Purpose

Defines the desktop Allow equals trade-parameter row (label plus toggle switch under Stake on Rise/Fall) so the full switch control is visible without bottom clipping on Manual trading, matching the unclipped appearance already seen on Automated trading.

## ADDED Requirements

### Requirement: Desktop Allow equals toggle is fully visible

On desktop Manual trading, when the non-minimized Allow equals row is shown under Stake for Rise/Fall (or Rise/Fall Equal), the toggle switch SHALL be fully visible. No part of the switch track or knob SHALL be clipped at the bottom of the row or by the surrounding trade-parameters panel.

#### Scenario: Toggle is not cut off on Manual trading

- **WHEN** a desktop user is on the Manual trading tab with Rise/Fall selected and the Allow equals row is visible under Stake
- **THEN** the full height of the Allow equals toggle switch is visible
- **AND** the bottom of the switch track and knob are not cut off by the row or the trade-parameters panel

#### Scenario: Toggle remains fully visible on Automated trading

- **WHEN** a desktop user switches to the Automated trading tab with Rise/Fall selected and the Allow equals row is visible
- **THEN** the Allow equals toggle switch remains fully visible (no regression of the already-correct Automated trading appearance)

### Requirement: Allow equals row height fits the toggle switch

The non-minimized Allow equals row SHALL be tall enough to contain the full height of the toggle switch control it hosts. The row MUST NOT impose a fixed height smaller than the switch control.

#### Scenario: Row is at least as tall as the switch

- **WHEN** the non-minimized Allow equals row is rendered with its toggle switch
- **THEN** the row's content box height is greater than or equal to the toggle switch control's height
- **AND** the switch is not overflow-clipped by the row

### Requirement: Allow equals behaviour is unchanged

Fixing the desktop clip SHALL NOT change Allow equals behaviour: label text, tooltip (desktop) / definition sheet (mobile), toggle on/off, disabled state when the market is closed or automation params are locked, and the mobile minimized field remain as they are today.

#### Scenario: Toggling still updates is_equal

- **WHEN** a user clicks the Allow equals toggle while it is enabled
- **THEN** the trade parameter `is_equal` is updated (off → on or on → off) exactly as before this change

#### Scenario: Disabled when market is closed

- **WHEN** the market is closed
- **THEN** the Allow equals toggle remains disabled and is not interactive

#### Scenario: Minimized mobile field unchanged

- **WHEN** Allow equals is rendered in minimized mode
- **THEN** it still shows the read-only field with "Yes" / "-" values and does not use the desktop toggle row layout
