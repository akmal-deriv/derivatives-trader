## ADDED Requirements

### Requirement: End time Date field shows no trailing chevron

The Date trigger field in the mobile Duration action sheet's End time tab SHALL NOT render a trailing down-chevron icon. It SHALL retain its leading calendar icon and SHALL continue to open the date picker when tapped.

#### Scenario: No chevron on the Date field

- **WHEN** the End time tab of the Duration action sheet is displayed on a mobile screen
- **THEN** the Date field renders no `LabelPairedChevronDownMdRegularIcon` (no trailing chevron)
- **AND** the Date field still renders its leading `LabelPairedCalendarSmRegularIcon`

#### Scenario: Tapping the Date field still opens the date picker

- **WHEN** the user taps the Date field
- **THEN** the full-screen date picker action sheet opens exactly as it did before this change

### Requirement: End time Time field shows no trailing chevron

The Time trigger field in the mobile Duration action sheet's End time tab SHALL NOT render a trailing down-chevron icon. It SHALL retain its leading clock icon and SHALL continue to open the time picker when tapped.

#### Scenario: No chevron on the Time field

- **WHEN** the End time tab of the Duration action sheet is displayed on a mobile screen
- **THEN** the Time field renders no `LabelPairedChevronDownMdRegularIcon` (no trailing chevron)
- **AND** the Time field still renders its leading `LabelPairedClockThreeSmRegularIcon`

#### Scenario: Tapping the Time field still opens the time picker

- **WHEN** the user taps the Time field (and the field is enabled for the current contract)
- **THEN** the full-screen time picker action sheet opens exactly as it did before this change
