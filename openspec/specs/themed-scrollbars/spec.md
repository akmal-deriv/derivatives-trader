# themed-scrollbars Specification

## Purpose

TBD - created by archiving change scrollbar-component-is-displayed-incorrectly-in-firefox-on-web. Update Purpose after archive.

## Requirements

### Requirement: Firefox scrollbar matches themed WebKit appearance

Scrollable surfaces that use the shared themed scrollbar SHALL render a thin, theme-colored scrollbar thumb in Firefox that matches the WebKit (Chrome/Safari) themed appearance in both light and dark themes. The Firefox track MUST be visually transparent (not filled with the primary surface color), so the scrollbar does not draw an opaque gutter that other browsers do not show.

#### Scenario: Light theme scrollbar in Firefox

- **WHEN** the web app is viewed in Firefox with the light theme active and a themed scrollbar surface has overflow content
- **THEN** the scrollbar thumb uses the theme interactive-active color token
- **AND** the scrollbar track does not paint an opaque primary-surface gutter behind the thumb

#### Scenario: Dark theme scrollbar in Firefox

- **WHEN** the web app is viewed in Firefox with the dark theme active and a themed scrollbar surface has overflow content
- **THEN** the scrollbar thumb uses the theme interactive-active color token for dark mode
- **AND** the scrollbar track does not paint an opaque primary-surface gutter behind the thumb

#### Scenario: Parity with other supported browsers

- **WHEN** the same themed scrollbar surface is compared in Firefox and in a WebKit/Blink browser under the same theme
- **THEN** both show a thin themed thumb consistent with the approved design
- **AND** Firefox does not fall back to the unthemed operating-system scrollbar on that surface

### Requirement: Autohide mode works in Firefox

When autohide is enabled on a themed scrollbar surface, the scrollbar thumb SHALL be hidden while the surface is not hovered, and SHALL become visible on hover, in Firefox as well as in WebKit browsers.

#### Scenario: Autohide hides thumb until hover in Firefox

- **WHEN** a themed scrollbar surface is rendered with autohide enabled in Firefox and the pointer is not over the surface
- **THEN** the scrollbar thumb is not visibly drawn

#### Scenario: Autohide shows thumb on hover in Firefox

- **WHEN** a themed scrollbar surface is rendered with autohide enabled in Firefox and the pointer hovers the surface
- **THEN** the thin themed scrollbar thumb becomes visible

### Requirement: Hidden scrollbar mode works in Firefox

When a themed scrollbar surface is configured to hide its scrollbar, the scrollbar MUST NOT be visible in Firefox, matching the existing WebKit hidden behavior, while the content remains scrollable.

#### Scenario: Hidden scrollbar in Firefox

- **WHEN** a themed scrollbar surface is rendered with the hidden-scrollbar mode enabled in Firefox and the content overflows
- **THEN** no scrollbar thumb or track is shown
- **AND** the content can still be scrolled (for example via wheel, trackpad, or keyboard)

### Requirement: AppV2 themed scroll areas include Firefox styling

AppV2 scroll areas that apply the shared themed-scrollbar look (market selection lists, discovery, desktop market panel, market info) SHALL include Firefox `scrollbar-color` / `scrollbar-width` styling equivalent to their WebKit rules, so those panels do not show the unthemed OS scrollbar in Firefox.

#### Scenario: Market selection list scrollbar in Firefox

- **WHEN** a user opens a market-selection scroll panel with overflow content in Firefox
- **THEN** the panel shows a thin themed scrollbar consistent with the WebKit-styled thumb on that panel
- **AND** the track remains visually transparent
