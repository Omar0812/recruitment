## MODIFIED Requirements

### Requirement: Expanded row shows stage-grouped activity timeline
The expanded row in the in-progress page SHALL render activities grouped by stage instead of a flat list of interview cards.

#### Scenario: Viewing expanded row with activities across stages
- **WHEN** user expands a candidate row
- **THEN** activities are shown in stage groups with stage labels, stage_change markers between groups, and an add button only on the current stage group

#### Scenario: Progress dots reflect all activity records
- **WHEN** candidate has interview and phone_screen activities
- **THEN** progress dots show one dot per non-stage_change activity (● completed/scheduled, ✗ cancelled, ○ trailing empty)
