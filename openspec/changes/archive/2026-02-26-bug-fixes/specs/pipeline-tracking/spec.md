## MODIFIED Requirements

### Requirement: Withdraw removes candidate from active list
After a candidate withdraws, they SHALL be immediately removed from the in-progress list without requiring a page refresh.

#### Scenario: Withdraw confirmed
- **WHEN** user confirms withdrawal in the withdraw overlay
- **THEN** the candidate's link entry is removed from the local links array and the list re-renders without that candidate

#### Scenario: Hire confirmed
- **WHEN** user confirms hire in the hire overlay
- **THEN** the candidate's link entry is removed from the local links array and the list re-renders without that candidate

### Requirement: Stage dropdown has no duplicate 已入职 option
The stage dropdown in the expanded row SHALL show each stage exactly once, with a single "已入职" option at the end that triggers the hire confirmation overlay.

#### Scenario: Job stages contain 已入职
- **WHEN** a job's stages array includes "已入职"
- **THEN** the dropdown renders it only once (the hardcoded __hire__ option), not twice

#### Scenario: Job stages do not contain 已入职
- **WHEN** a job's stages array does not include "已入职"
- **THEN** the dropdown renders all job stages plus one "已入职" option at the end
