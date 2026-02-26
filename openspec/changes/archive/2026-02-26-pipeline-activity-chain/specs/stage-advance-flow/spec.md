## REMOVED Requirements

### Requirement: Stage advance triggers activity creation form
**Reason**: Stage is now derived from the activity chain. There is no longer a separate "advance stage" action. Stage advances automatically when a new activity is created.
**Migration**: The stage dropdown is removed from the UI. Users complete the current activity and then select the next activity type directly.

## ADDED Requirements

### Requirement: Current activity node is the sole action target
The in-progress page expanded row SHALL show the current (tail) activity node as the active action target. Only the tail node can be acted upon; all prior nodes are read-only history.

#### Scenario: Viewing a candidate with pending resume_review
- **WHEN** user expands a candidate row whose only activity is resume_review with status=pending
- **THEN** the UI shows the resume_review node with [通过] and [淘汰] buttons as the primary action

#### Scenario: Viewing a candidate with completed resume_review and no next step
- **WHEN** user expands a candidate row whose resume_review is completed with conclusion=通过 and no subsequent activity
- **THEN** the UI shows a "选择下一步" prompt with options: [电话初筛] [面试] [直接Offer]

#### Scenario: Viewing a candidate with a scheduled interview
- **WHEN** user expands a candidate row whose tail activity is an interview with status=scheduled
- **THEN** the UI shows the interview node with [填写结果] button; no "添加活动" button is shown

### Requirement: Next step selection replaces stage dropdown
After completing the current activity node with conclusion=通过, the system SHALL present a "选择下一步" inline prompt instead of a stage dropdown.

#### Scenario: Completing phone_screen with pass
- **WHEN** user marks phone_screen conclusion=通过
- **THEN** activity is saved and UI immediately shows "选择下一步: [面试] [直接Offer]"

#### Scenario: Completing interview with pass
- **WHEN** user marks interview conclusion=通过
- **THEN** activity is saved and UI immediately shows "选择下一步: [下一轮面试] [Offer]"

#### Scenario: Completing any activity with rejection
- **WHEN** user marks any activity conclusion=淘汰
- **THEN** link outcome is set to rejected and candidate is removed from in-progress list

#### Scenario: Skipping a step
- **WHEN** user selects [面试] directly after resume_review without phone_screen
- **THEN** an interview activity is created; phone_screen is simply skipped with no record

### Requirement: Note can be added at any time
A [+ 备注] button SHALL always be visible on the expanded row regardless of chain state.

#### Scenario: Adding a note while interview is pending
- **WHEN** user clicks [+ 备注] while the tail activity is a scheduled interview
- **THEN** a note form appears and can be saved without affecting the interview or chain state
